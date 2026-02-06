/**
 * 模拟卷AI解析API
 * 辅助识别题目类型和提取题目内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAIWithRetry } from '@/utils/aiClient';
import { checkPermission } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '缺少文本内容' },
        { status: 400 }
      );
    }

    // 构建AI提示词
    const prompt = `
请从以下模拟卷文本中识别并提取所有题目。

要求：
1. 识别题目类型（grammar: 语法题, word-formation: 词转练习, reading: 阅读理解）
2. 提取题目内容、选项、正确答案
3. 提供知识点和解析（如果能识别）
4. 对于词转练习，提取基础词和目标词
5. 对于阅读理解，提取文章内容和子问题

返回格式（严格JSON）：
{
  "questions": [
    {
      "type": "grammar",
      "question": "题目内容",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "correctAnswer": "B",
      "explanation": "解析说明",
      "knowledgePoint": "知识点",
      "subKnowledgePoint": "子知识点",
      "difficulty": "easy",
      "questionNumber": 1
    },
    {
      "type": "word-formation",
      "question": "He _____ (go) to school every day.",
      "baseWord": "go",
      "targetWord": "goes",
      "transformationType": "第三人称单数",
      "correctAnswer": "goes",
      "explanation": "一般现在时，第三人称单数形式"
    },
    {
      "type": "reading",
      "article": "文章内容...",
      "articleQuestions": [
        {
          "question": "题目1",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A"
        }
      ]
    }
  ]
}

模拟卷文本：
${text.substring(0, 8000)} // 限制文本长度，避免token超限
`;

    // 调用AI服务
    console.log('[模拟卷解析] 开始AI解析...');
    const aiResponse = await callAIWithRetry(prompt, 3);

    // 处理配额错误
    if (!aiResponse.success && aiResponse.error?.isQuotaError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: aiResponse.error.message,
            isQuotaError: true,
            userMessage: aiResponse.error.userMessage,
          },
        },
        { status: 429 }
      );
    }

    // 处理其他错误
    if (!aiResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: aiResponse.error?.code || 'API_ERROR',
            message: aiResponse.error?.message || '识别失败',
            userMessage: aiResponse.error?.userMessage || '识别失败，请稍后重试',
          },
        },
        { status: 500 }
      );
    }

    // 解析AI返回的JSON
    let questions = [];
    try {
      // 尝试提取JSON部分
      const jsonMatch = aiResponse.content?.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse.content || '{}';
      const result = JSON.parse(jsonStr);
      questions = result.questions || [];
    } catch (error) {
      console.error('[模拟卷解析] 解析AI返回失败:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: 'AI返回格式错误',
            userMessage: '解析失败，请稍后重试',
          },
        },
        { status: 500 }
      );
    }

    // 统计
    const summary = {
      grammar: questions.filter((q: any) => q.type === 'grammar').length,
      wordFormation: questions.filter((q: any) => q.type === 'word-formation').length,
      reading: questions.filter((q: any) => q.type === 'reading').length,
    };

    console.log(`[模拟卷解析] 解析成功: 共 ${questions.length} 道题`);
    console.log(`[模拟卷解析] 语法题: ${summary.grammar}, 词转: ${summary.wordFormation}, 阅读: ${summary.reading}`);

    return NextResponse.json({
      success: true,
      result: {
        success: true,
        totalQuestions: questions.length,
        questions,
        summary,
      },
    });
  } catch (error) {
    console.error('[模拟卷解析] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '解析失败',
      },
      { status: 500 }
    );
  }
}
