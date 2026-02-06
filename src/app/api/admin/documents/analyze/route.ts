/**
 * 文档分析 API（管理员上传模拟卷）
 * POST /api/admin/documents/analyze
 * - 合并多个文件
 * - 调用 Gemini API
 * - 处理配额限制
 * - 返回友好的错误提示
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';
import { callAIWithRetry } from '@/utils/aiClient';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const { batchId, documentIds } = await request.json();

    // 2. 参数验证
    if (!batchId && !documentIds) {
      return NextResponse.json(
        { error: '请提供批次ID或文件ID列表' },
        { status: 400 }
      );
    }

    // 3. 获取需要分析的文件
    let documents: any[] = [];

    if (documentIds) {
      const result = await query(
        `SELECT * FROM documents 
         WHERE id = ANY($1) AND status = 'uploaded'
         ORDER BY created_at`,
        [documentIds]
      );
      documents = result.rows;
    } else if (batchId) {
      const result = await query(
        `SELECT * FROM documents 
         WHERE batch_id = $1 AND status = 'uploaded'
         ORDER BY created_at`,
        [batchId]
      );
      documents = result.rows;
    }

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要分析的文件',
        analyzedCount: 0,
      });
    }

    // 4. 更新批次状态
    if (batchId) {
      await query(
        `UPDATE import_batches 
         SET status = 'analyzing', analyzed_files = $1
         WHERE id = $2`,
        [documents.length, batchId]
      );
    }

    // 5. 更新文件状态为"分析中"
    await query(
      `UPDATE documents 
       SET status = 'analyzing' 
       WHERE id = ANY($1)`,
      [documents.map(d => d.id)]
    );

    // 6. 准备合并内容
    const combinedContent = await Promise.all(
      documents.map(async (doc, index) => {
        const fileContent = await fetchFileContent(doc.file_url);
        return `
=== 文件 ${index + 1}: ${doc.file_name} ===
文档ID: ${doc.id}
文件类型: ${doc.file_format}
提取类型: ${doc.extract_type}

${fileContent}
`;
      })
    ).then(contents => contents.join('\n\n'));

    // 7. 构建提示词
    const prompt = `
请从以下多个文件中提取${documents[0].extract_type === 'grammar' ? '语法选择题' : '题目'}。

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
      "fileName": "${documents[0].file_name}",
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

    // 8. 调用AI服务（带重试）
    console.log(`[文档分析] 开始分析 ${documents.length} 个文件`);
    const aiResponse = await callAIWithRetry(prompt, 3);

    // 9. 处理配额错误
    if (!aiResponse.success && aiResponse.error?.isQuotaError) {
      // 回滚状态
      await query(
        `UPDATE documents 
         SET status = 'uploaded' 
         WHERE id = ANY($1)`,
        [documents.map(d => d.id)]
      );

      if (batchId) {
        await query(
          `UPDATE import_batches 
           SET status = 'uploading' 
           WHERE id = $1`,
          [batchId]
        );
      }

      // 返回配额错误（包含重试时间）
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: aiResponse.error.message,
            isQuotaError: true,
            retryAfter: aiResponse.error.retryAfter,
            userMessage: aiResponse.error.userMessage,
          },
        },
        { status: 429 }
      );
    }

    // 10. 处理其他错误
    if (!aiResponse.success) {
      // 回滚状态
      await query(
        `UPDATE documents 
         SET status = 'uploaded' 
         WHERE id = ANY($1)`,
        [documents.map(d => d.id)]
      );

      if (batchId) {
        await query(
          `UPDATE import_batches 
           SET status = 'uploading' 
           WHERE id = $1`,
          [batchId]
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: aiResponse.error?.code || 'API_ERROR',
            message: aiResponse.error?.message || '分析失败',
            userMessage: aiResponse.error?.userMessage || '分析失败，请稍后重试',
          },
        },
        { status: 500 }
      );
    }

    // 11. 解析结果
    const analysis = JSON.parse(aiResponse.content || '{}');
    console.log(`[文档分析] 分析完成，提取 ${analysis.results?.length || 0} 个文件`);

    // 12. 保存分析结果
    for (const result of analysis.results || []) {
      const doc = documents[result.fileIndex - 1];
      
      await query(
        `UPDATE documents 
         SET status = 'analyzed', analysis_result = $2
         WHERE id = $1`,
        [doc.id, JSON.stringify(result.questions)]
      );
    }

    // 13. 更新批次统计
    const totalQuestions = (analysis.results || []).reduce(
      (sum: number, r: any) => sum + (r.questions?.length || 0),
      0
    );

    if (batchId) {
      await query(
        `UPDATE import_batches 
         SET status = 'ready', 
             analyzed_files = $1, 
             api_calls = api_calls + 1,
             total_questions = $2
         WHERE id = $3`,
        [documents.length, totalQuestions, batchId]
      );
    }

    return NextResponse.json({
      success: true,
      message: '分析完成',
      analyzedCount: documents.length,
      totalQuestions,
      apiCalls: 1,
      results: analysis.results,
    });

  } catch (error: any) {
    console.error('[文档分析] 错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message || '未知错误',
          userMessage: '分析失败，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 获取文件内容
 */
async function fetchFileContent(fileUrl: string): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`无法获取文件: ${response.status}`);
    }

    // 如果是 PDF，使用 PDF.js 解析
    if (fileUrl.includes('.pdf')) {
      // 这里需要实现 PDF 解析逻辑
      // 暂时返回占位文本
      return 'PDF 内容（需要实现解析逻辑）';
    }

    // 如果是图片，使用 OCR
    if (fileUrl.match(/\.(jpg|jpeg|png)$/i)) {
      // 这里需要实现 OCR 逻辑
      // 暂时返回占位文本
      return '图片内容（需要实现 OCR 逻辑）';
    }

    // 其他格式，直接读取
    return await response.text();
  } catch (error: any) {
    console.error('获取文件内容失败:', error);
    throw new Error(`无法读取文件内容: ${error.message}`);
  }
}
