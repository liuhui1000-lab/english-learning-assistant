# 分批上传 + 手动触发分析方案

## 📋 用户场景

```
首次初始化：20-30份模拟卷
  ↓
受文件大小限制（单文件 ≤ 20MB）
  ↓
分 3-4 批上传
  ↓
上传完成后，手动触发一次 Gemini 分析
  ↓
系统自动合并所有文件，一次调用 API
  ↓
成本：1 次调用 = ¥0.05

日常更新：每周 1-2 份
  ↓
直接上传 + 手动触发分析
  ↓
成本：1 次调用 = ¥0.05

月成本：4 次 × ¥0.05 = ¥0.20
```

---

## 🎯 完整流程设计

### 流程图

```
第1批：上传 5 份文件
  ↓
第2批：上传 5 份文件
  ↓
第3批：上传 5 份文件
  ↓
第4批：上传 5-10 份文件
  ↓
所有文件上传完成（状态：uploaded）
  ↓
管理员点击"开始 AI 分析"按钮
  ↓
系统检查：是否有未分析的文件
  ↓
批量调用 Gemini（合并所有文件）
  ↓
返回分析结果
  ↓
管理员查看去重结果
  ↓
确认导入数据库
  ↓
创建版本记录
  ↓
激活版本
```

---

## 💻 数据库设计

### 1. 文档管理表

```sql
CREATE TABLE documents (
  id VARCHAR(50) PRIMARY KEY,  -- 文件ID
  file_url TEXT NOT NULL,      -- 文件URL
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_hash VARCHAR(64),       -- 用于缓存去重
  file_format VARCHAR(20),     -- 'pdf' | 'image' | 'json' | 'csv'
  extract_type VARCHAR(50),    -- 'grammar' | 'word' | 'word-formation'
  status VARCHAR(20) DEFAULT 'uploaded',  -- 'uploaded' | 'analyzing' | 'analyzed' | 'imported'
  analysis_result JSONB,       -- 分析结果
  upload_progress INTEGER DEFAULT 0,  -- 上传进度 0-100
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_extract_type ON documents(extract_type);
CREATE INDEX idx_documents_created_at ON documents(created_at);
```

### 2. 导入批次表

```sql
CREATE TABLE import_batches (
  id SERIAL PRIMARY KEY,
  batch_name VARCHAR(255),      -- 批次名称（如"2025年春季题库初始化"）
  extract_type VARCHAR(50),
  total_files INTEGER DEFAULT 0,
  analyzed_files INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'uploading',  -- 'uploading' | 'ready' | 'analyzing' | 'completed'
  api_calls INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  unique_questions INTEGER DEFAULT 0,
  duplicate_questions INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_created_at ON import_batches(created_at);
```

---

## 🔧 API 实现

### 1. 上传文件（不调用 Gemini）

```typescript
// src/app/api/admin/documents/upload/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const batchId = formData.get('batchId') as string;
    const extractType = formData.get('extractType') as string;

    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 1. 检查文件大小
    if (file.size > 20 * 1024 * 1024) {  // 20MB
      return NextResponse.json(
        { error: '文件大小不能超过 20MB' },
        { status: 400 }
      );
    }

    // 2. 上传到对象存储
    const { fileUrl, fileName } = await uploadToS3(file);

    // 3. 计算文件哈希
    const fileHash = await calculateFileHash(file);

    // 4. 检查是否已存在
    const existing = await db
      .select()
      .from(documents)
      .where(eq(documents.fileHash, fileHash));

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: '文件已存在',
        documentId: existing[0].id,
        duplicate: true
      });
    }

    // 5. 创建文档记录（状态：uploaded）
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(documents).values({
      id: documentId,
      fileUrl,
      fileName,
      fileSize: file.size,
      fileHash,
      fileFormat: fileName.split('.').pop()?.toLowerCase(),
      extractType,
      status: 'uploaded',
      createdBy: getCurrentUser().userId
    });

    // 6. 更新批次统计
    if (batchId) {
      await db
        .update(importBatches)
        .set({
          totalFiles: sql`${importBatches.totalFiles} + 1`
        })
        .where(eq(importBatches.id, parseInt(batchId)));
    }

    return NextResponse.json({
      success: true,
      documentId,
      fileName,
      fileSize: file.size,
      status: 'uploaded',
      message: '文件上传成功'
    });

  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    );
  }
}
```

### 2. 创建导入批次

```typescript
// src/app/api/admin/documents/batches/route.ts
export async function POST(request: NextRequest) {
  try {
    const { batchName, extractType } = await request.json();

    // 创建批次
    const [batch] = await db.insert(importBatches).values({
      batchName,
      extractType,
      status: 'uploading',
      createdBy: getCurrentUser().userId
    }).returning();

    return NextResponse.json({
      success: true,
      batch
    });
  } catch (error) {
    console.error('创建批次失败:', error);
    return NextResponse.json(
      { error: '创建批次失败' },
      { status: 500 }
    );
  }
}
```

### 3. 获取批次状态

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: '批次ID为必填项' },
        { status: 400 }
      );
    }

    // 获取批次信息
    const batch = await db
      .select()
      .from(importBatches)
      .where(eq(importBatches.id, parseInt(batchId)));

    if (batch.length === 0) {
      return NextResponse.json(
        { error: '批次不存在' },
        { status: 404 }
      );
    }

    // 获取该批次的文件列表
    const files = await db
      .select()
      .from(documents)
      .where(eq(documents.batchId, parseInt(batchId)))
      .orderBy(documents.createdAt);

    // 统计各状态文件数量
    const stats = {
      uploaded: files.filter(f => f.status === 'uploaded').length,
      analyzing: files.filter(f => f.status === 'analyzing').length,
      analyzed: files.filter(f => f.status === 'analyzed').length,
      imported: files.filter(f => f.status === 'imported').length
    };

    return NextResponse.json({
      success: true,
      batch: batch[0],
      files,
      stats
    });
  } catch (error) {
    console.error('获取批次状态失败:', error);
    return NextResponse.json(
      { error: '获取批次状态失败' },
      { status: 500 }
    );
  }
}
```

### 4. 手动触发 AI 分析（核心）

```typescript
// src/app/api/admin/documents/analyze/route.ts
export async function POST(request: NextRequest) {
  try {
    const { batchId, documentIds } = await request.json();

    // 参数验证
    if (!batchId && !documentIds) {
      return NextResponse.json(
        { error: '请提供批次ID或文件ID列表' },
        { status: 400 }
      );
    }

    // 1. 获取需要分析的文件
    let documents: any[] = [];

    if (documentIds) {
      // 分析指定的文件
      documents = await db
        .select()
        .from(documents)
        .where(
          and(
            inArray(documents.id, documentIds),
            eq(documents.status, 'uploaded')
          )
        );
    } else if (batchId) {
      // 分析批次中所有未分析的文件
      documents = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.batchId, parseInt(batchId)),
            eq(documents.status, 'uploaded')
          )
        );
    }

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要分析的文件',
        analyzedCount: 0
      });
    }

    // 2. 更新批次状态
    await db
      .update(importBatches)
      .set({ status: 'analyzing' })
      .where(eq(importBatches.id, parseInt(batchId)));

    // 3. 更新文件状态
    await db
      .update(documents)
      .set({ status: 'analyzing' })
      .where(
        inArray(
          documents.id,
          documents.map(d => d.id)
        )
      );

    // 4. 准备合并内容
    const combinedContent = await Promise.all(
      documents.map(async (doc, index) => {
        const fileContent = await fetchFileContent(doc.fileUrl);
        return `
=== 文件 ${index + 1}: ${doc.fileName} ===
文档ID: ${doc.id}
文件类型: ${doc.fileFormat}
提取类型: ${doc.extractType}

${fileContent}
`;
      })
    ).then(contents => contents.join('\n\n'));

    // 5. 调用 Gemini（一次调用）
    const prompt = `
请从以下多个文件中提取${documents[0].extractType === 'grammar' ? '语法选择题' : '题目'}。

重要要求：
1. 提取每个文件中的所有题目
2. 保留题目、选项、正确答案、解析
3. 识别知识点和难度
4. 按文件分组返回结果

返回格式（严格JSON）：
{
  "results": [
    {
      "fileIndex": 1,
      "documentId": "${documents[0].id}",
      "fileName": "${documents[0].fileName}",
      "questions": [
        {
          "question": "题目内容",
          "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
          "correctAnswer": "B",
          "explanation": "解析说明",
          "knowledgePoint": "知识点",
          "subKnowledgePoint": "子知识点",
          "difficulty": "easy"
        }
      ]
    }
  ]
}

文件内容：
${combinedContent}
`;

    console.log('调用 Gemini，文件数量:', documents.length);
    const response = await callGemini(prompt);
    console.log('Gemini 返回结果');

    // 6. 解析结果
    const analysis = JSON.parse(response);
    
    // 7. 保存分析结果
    for (const result of analysis.results) {
      const doc = documents[result.fileIndex - 1];
      
      await db
        .update(documents)
        .set({
          status: 'analyzed',
          analysisResult: result.questions
        })
        .where(eq(documents.id, doc.id));
    }

    // 8. 更新批次统计
    const totalQuestions = analysis.results.reduce(
      (sum, r) => sum + r.questions.length,
      0
    );

    await db
      .update(importBatches)
      .set({
        status: 'ready',
        analyzedFiles: documents.length,
        apiCalls: 1,
        totalQuestions
      })
      .where(eq(importBatches.id, parseInt(batchId)));

    return NextResponse.json({
      success: true,
      message: '分析完成',
      analyzedCount: documents.length,
      totalQuestions,
      apiCalls: 1,
      results: analysis.results
    });

  } catch (error) {
    console.error('分析失败:', error);
    
    // 更新批次状态为失败
    if (batchId) {
      await db
        .update(importBatches)
        .set({
          status: 'uploading',  // 回到上传状态，允许重试
          errorMessage: error.message
        })
        .where(eq(importBatches.id, parseInt(batchId)));
    }
    
    return NextResponse.json(
      { error: error.message || '分析失败' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 前端实现

### 管理员上传页面

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Play, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';

export default function DocumentUploadPage() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<any>(null);

  // 1. 创建新批次
  const createBatch = async () => {
    const batchName = prompt('请输入批次名称（如"2025年春季题库初始化"）:');
    if (!batchName) return;

    const response = await fetch('/api/admin/documents/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchName,
        extractType: 'grammar'
      })
    });

    const data = await response.json();
    if (data.success) {
      setBatchId(data.batch.id.toString());
      setBatchStatus(data.batch);
    }
  };

  // 2. 上传文件
  const handleUpload = async (fileList: FileList) => {
    if (!batchId) {
      alert('请先创建批次');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(fileList).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('batchId', batchId);
        formData.append('extractType', 'grammar');

        const response = await fetch('/api/admin/documents/upload', {
          method: 'POST',
          body: formData
        });

        return await response.json();
      });

      const results = await Promise.all(uploadPromises);
      
      // 刷新文件列表
      loadBatchStatus();
      
      alert(`上传完成！\n成功：${results.filter(r => r.success).length}\n重复：${results.filter(r => r.duplicate).length}`);
    } catch (error) {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 3. 手动触发 AI 分析
  const handleAnalyze = async () => {
    if (!confirm('确定开始 AI 分析吗？\n这将合并所有上传的文件，调用 1 次 Gemini API。')) {
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch('/api/admin/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          documentIds: files.filter(f => f.status === 'uploaded').map(f => f.id)
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`分析完成！\n分析文件：${data.analyzedCount}\n提取题目：${data.totalQuestions}\nAPI调用：${data.apiCalls}次`);
        loadBatchStatus();
      } else {
        alert(`分析失败：${data.error}`);
      }
    } catch (error) {
      alert('分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // 4. 加载批次状态
  const loadBatchStatus = async () => {
    if (!batchId) return;

    const response = await fetch(`/api/admin/documents/batches?batchId=${batchId}`);
    const data = await response.json();

    if (data.success) {
      setBatchStatus(data.batch);
      setFiles(data.files);
    }
  };

  useEffect(() => {
    if (batchId) {
      loadBatchStatus();
      // 每 5 秒刷新一次状态
      const interval = setInterval(loadBatchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [batchId]);

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'analyzing':
        return <AlertCircle className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'analyzed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'imported':
        return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      uploaded: '已上传',
      analyzing: '分析中',
      analyzed: '已分析',
      imported: '已导入'
    };
    return texts[status] || status;
  };

  const readyToAnalyze = files.filter(f => f.status === 'uploaded').length > 0;
  const canAnalyze = batchStatus?.status === 'uploading' || batchStatus?.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <CardTitle>模拟题卷子上传</CardTitle>
            <p className="text-gray-600">
              分批上传模拟题卷，完成后统一触发 AI 分析
            </p>
          </CardHeader>
          <CardContent>
            {!batchId ? (
              <Button onClick={createBatch} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                创建新批次
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{batchStatus?.batchName}</h3>
                    <p className="text-sm text-gray-500">
                      批次ID: {batchId} | 状态: {batchStatus?.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      已上传: <span className="font-semibold">{files.length}</span> 个文件
                    </p>
                    <p className="text-sm text-gray-500">
                      未分析: <span className="font-semibold text-yellow-600">
                        {files.filter(f => f.status === 'uploaded').length}
                      </span> 个
                    </p>
                  </div>
                </div>

                {/* 上传区域 */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                    disabled={uploading}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    支持格式：PDF、JPG、PNG，单文件最大 20MB
                  </p>
                </div>

                {/* 文件列表 */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">文件列表</h4>
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(file.status)}
                          <div>
                            <p className="font-medium">{file.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(file.fileSize)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={file.status === 'analyzed' ? 'default' : 'secondary'}>
                          {getStatusText(file.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* 触发分析按钮 */}
                {readyToAnalyze && canAnalyze && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Play className="w-4 h-4" />
                      {analyzing ? 'AI 分析中...' : `开始 AI 分析（${files.filter(f => f.status === 'uploaded').length} 个文件）`}
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      将合并所有未分析的文件，调用 1 次 Gemini API
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

---

## 📊 完整使用流程

### 首次初始化（20-30 份文件）

```
步骤1: 创建批次
  → 输入批次名称："2025年春季题库初始化"
  → 系统分配批次ID: 1

步骤2: 上传第1批（5 份文件）
  → 选择 5 个 PDF 文件
  → 点击"上传"
  → 状态：5 个文件已上传

步骤3: 上传第2批（5 份文件）
  → 选择 5 个 PDF 文件
  → 点击"上传"
  → 状态：10 个文件已上传

步骤4: 上传第3批（5 份文件）
  → 选择 5 个 PDF 文件
  → 点击"上传"
  → 状态：15 个文件已上传

步骤5: 上传第4批（5-10 份文件）
  → 选择剩余的 PDF 文件
  → 点击"上传"
  → 状态：20 个文件已上传

步骤6: 触发 AI 分析
  → 点击"开始 AI 分析"按钮
  → 系统合并 20 个文件
  → 调用 1 次 Gemini API
  → 提取题目（约 100-200 题）
  → 完成分析

步骤7: 查看结果
  → 系统显示分析结果
  → 题目数量、去重统计
  → 确认导入数据库

步骤8: 创建版本
  → 输入版本号：1.0.0
  → 输入描述："2025年春季题库"
  → 点击"创建版本"

步骤9: 激活版本
  → 点击"激活"按钮
  → 所有用户开始使用新题库
```

---

## 💰 成本分析

### 场景1：首次初始化（20 份文件）

```
旧方案（每次上传都分析）：
20 份 × 1 次调用 = 20 次调用 = ¥1.00

新方案（分批上传 + 一次分析）：
20 份 × 0 次调用 + 1 次合并调用 = 1 次调用 = ¥0.05

节省：95%！
```

### 场景2：每周更新（2 份文件）

```
每周：1 次调用 = ¥0.05
每月：4 周 × ¥0.05 = ¥0.20

年成本：12 个月 × ¥0.20 = ¥2.40
```

### 总成本

```
首次初始化：¥0.05
日常更新：¥0.20/月
年成本：¥2.40

完全免费！
```

---

## 🎯 总结

### 优势

1. ✅ **节省成本**：95% 以上的成本节省
2. ✅ **灵活上传**：支持分批上传，不受文件限制
3. ✅ **手动控制**：管理员决定何时分析
4. ✅ **状态追踪**：实时查看上传和分析进度
5. ✅ **断点续传**：上传中断后可以继续
6. ✅ **批量操作**：一次性分析所有文件

### 关键改进

1. 分离上传和分析
2. 批次管理（跟踪所有上传文件）
3. 手动触发按钮
4. 合并调用 API
5. 实时状态更新

这个方案完全符合你的需求！🎉
