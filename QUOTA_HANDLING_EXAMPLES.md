# 配额错误处理使用示例

## 📋 文档结构

```
src/
├── utils/
│   ├── quotaManager.ts       # 配额管理器
│   └── geminiCaller.ts       # Gemini API 调用器
├── app/api/
│   ├── admin/
│   │   ├── quota/route.ts           # 配额查询 API
│   │   └── documents/analyze/route.ts # 文档分析 API
│   └── mistakes/upload/route.ts      # 错题上传 API
└── components/
    └── QuotaDisplay.tsx        # 配额显示组件
```

---

## 🎯 使用场景

### 场景1：管理员上传模拟卷

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuotaDisplay, QuotaErrorAlert } from '@/components/QuotaDisplay';
import { Upload } from 'lucide-react';

export default function DocumentUploadPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: '1',
          documentIds: ['doc_1', 'doc_2', 'doc_3']
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        alert(`分析完成！提取了 ${data.totalQuestions} 道题目`);
      } else {
        // 处理错误
        setError(data.error);
      }
    } catch (err: any) {
      setError({
        code: 'NETWORK_ERROR',
        message: '网络错误',
        userMessage: '网络连接失败，请检查网络后重试',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 配额显示 */}
      <QuotaDisplay show={true} />

      {/* 错误提示 */}
      {error && <QuotaErrorAlert error={error} />}

      {/* 成功提示 */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">分析完成！</p>
        </div>
      )}

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle>模拟卷上传</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAnalyze} 
            disabled={analyzing}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {analyzing ? '分析中...' : '开始分析'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 场景2：用户上传错题

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuotaErrorAlert, ErrorAlert } from '@/components/QuotaDisplay';
import { Upload } from 'lucide-react';

export default function MistakeUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/mistakes/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        alert('错题添加成功！');
      } else {
        // 处理错误
        setError(data.error);
      }
    } catch (err: any) {
      setError({
        code: 'NETWORK_ERROR',
        message: '网络错误',
        userMessage: '网络连接失败，请检查网络后重试',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 配额错误提示 */}
      {error && error.isQuotaError && (
        <QuotaErrorAlert error={error} />
      )}

      {/* 通用错误提示 */}
      {error && !error.isQuotaError && (
        <ErrorAlert error={error} title="上传失败" />
      )}

      {/* 成功提示 */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">错题添加成功！</p>
        </div>
      )}

      {/* 上传区域 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          disabled={uploading}
        />
        <p className="text-sm text-gray-500 mt-2">
          支持 PDF、JPG、PNG 格式
        </p>
        {uploading && (
          <p className="text-sm text-blue-600 mt-2">
            识别中...
          </p>
        )}
      </div>
    </div>
  );
}
```

---

### 场景3：配额监控页面

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuotaDisplay } from '@/components/QuotaDisplay';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function QuotaMonitorPage() {
  const [usageHistory, setUsageHistory] = useState<any[]>([]);

  const loadUsageHistory = async () => {
    try {
      const response = await fetch('/api/admin/quota/history');
      const data = await response.json();
      
      if (data.success) {
        setUsageHistory(data.data);
      }
    } catch (error) {
      console.error('加载使用历史失败:', error);
    }
  };

  useEffect(() => {
    loadUsageHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* 配额显示 */}
      <QuotaDisplay show={true} />

      {/* 使用历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            最近 7 天使用情况
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usageHistory.length > 0 ? (
            <div className="space-y-2">
              {usageHistory.slice(0, 7).map((usage) => (
                <div 
                  key={usage.date}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium">{usage.date}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-600">文档:</span>{' '}
                      <span className="font-semibold">{usage.documentCalls}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">错题:</span>{' '}
                      <span className="font-semibold">{usage.mistakeCalls}</span>
                    </div>
                    <Badge variant="outline">
                      {usage.totalCalls} 次
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">暂无数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 📊 错误信息示例

### 配额错误（429）

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "免费额度已用完（1480/1500 次）",
    "isQuotaError": true,
    "retryAfter": "2025-01-10T00:00:00.000Z",
    "userMessage": "免费额度已用完（今日 1480/1500 次）\n\n将在 01月10日 08:00 重置（约 6 小时后）\n\n建议明天再试，或联系管理员升级配额"
  }
}
```

### 网络错误（500）

```json
{
  "success": false,
  "error": {
    "code": "API_ERROR",
    "message": "AI 服务暂时不可用",
    "userMessage": "分析失败，请稍后重试"
  }
}
```

### 重复题目（409）

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_QUESTION",
    "message": "该题目已存在于错题库中",
    "userMessage": "这道题你之前已经添加过了"
  }
}
```

---

## 🎨 用户界面示例

### 配额充足时

```
┌─────────────────────────────────┐
│ ✓ Gemini API 配额使用           │
├─────────────────────────────────┤
│ 今日使用                        │
│ 11 / 1,500 次                  │
│ ████████░░░░░░░░░░░░░░░░░  0.7%│
├─────────────────────────────────┤
│ ℹ️ 配额充足                     │
│ 剩余：1,489 次，可以在         │
│ 01月10日 08:00 重置            │
├─────────────────────────────────┤
│ [刷新配额信息]                  │
└─────────────────────────────────┘
```

### 配额即将用完时

```
┌─────────────────────────────────┐
│ ⚠️ Gemini API 配额使用          │
├─────────────────────────────────┤
│ 今日使用                        │
│ 1,480 / 1,500 次               │
│ ████████████████████░░  98.7%  │
├─────────────────────────────────┤
│ ⚠️ 配额即将用完                 │
│ 将在 01月10日 08:00 重置       │
│ （约 6 小时后）                 │
├─────────────────────────────────┤
│ [刷新配额信息]                  │
└─────────────────────────────────┘
```

### 配额用完时

```
┌─────────────────────────────────┐
│ ❌ 免费额度已用完               │
├─────────────────────────────────┤
│ 免费额度已用完（今日           │
│ 1,500/1,500 次）               │
│                                 │
│ 将在 01月10日 08:00 重置       │
│ （约 6 小时后）                 │
│                                 │
│ 建议明天再试，或联系管理员      │
│ 升级配额                       │
├─────────────────────────────────┤
│ [6 小时后可重试]                │
└─────────────────────────────────┘
```

---

## ✅ 功能清单

### 配额管理器（QuotaManager）
- ✅ 跟踪每日 API 调用次数
- ✅ 计算重置时间（UTC 00:00）
- ✅ 检查配额是否可用
- ✅ 生成友好的用户提示
- ✅ 处理配额错误

### Gemini 调用器（geminiCaller）
- ✅ 调用前检查配额
- ✅ 自动重试机制（指数退避）
- ✅ 处理速率限制（429）
- ✅ 返回结构化错误信息
- ✅ 批量调用支持

### 前端组件（QuotaDisplay）
- ✅ 实时显示配额使用情况
- ✅ 进度条可视化
- ✅ 配额警告提示
- ✅ 重置时间显示
- ✅ 错误提示组件

### API 接口
- ✅ 配额查询 API
- ✅ 文档分析 API（带配额检查）
- ✅ 错题上传 API（带配额检查）

---

## 🎯 用户体验

### 管理员上传模拟卷

```
1. 查看配额显示组件
   ↓
2. 上传文件
   ↓
3. 点击"开始分析"
   ↓
4. 如果配额不足：
   - 显示配额错误提示
   - 显示重置时间
   - 建议明天再试
   ↓
5. 如果配额充足：
   - 显示分析进度
   - 显示提取的题目数量
   - 完成后显示成功提示
```

### 用户上传错题

```
1. 选择错题文件
   ↓
2. 点击上传
   ↓
3. 如果配额不足：
   - 显示配额错误提示
   - 显示重置时间
   - 建议明天再试
   ↓
4. 如果配额充足：
   - 显示识别进度
   - 识别成功后显示题目信息
   - 完成后显示成功提示
```

---

## 💡 最佳实践

1. **始终显示配额信息**：在管理员后台始终显示配额使用情况
2. **提前警告**：配额使用超过 75% 时显示警告
3. **友好的错误提示**：明确说明是配额问题，并提供重置时间
4. **禁止无效操作**：配额用完后禁用相关按钮
5. **自动刷新**：定期刷新配额信息（如每 30 秒）
