/**
 * 智能单词解析 API
 * 使用 AI 解析任意格式的单词文档
 * 支持多种格式：列表、表格、段落、混合格式
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseWordsWithAI, ParsedWord } from '@/utils/aiHelper';

export async function POST(request: NextRequest) {
  try {
    console.log('[智能解析] 开始处理请求');

    const body = await request.json();
    const { text, includeExamples = false } = body;

    // 验证必填字段
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的文本内容' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: '文本内容过长，请分批上传（最大 50000 字符）' },
        { status: 400 }
      );
    }

    console.log('[智能解析] 文本长度:', text.length);

    // 调用 AI 解析
    const result = await parseWordsWithAI(text, { includeExamples });

    if (!result.success) {
      console.error('[智能解析] AI 解析失败:', result.error);
      return NextResponse.json(
        {
          error: '智能解析失败',
          details: result.error,
          suggestions: [
            '请检查是否已配置 AI 提供商',
            '请检查 AI API 密钥是否有效',
            '请检查网络连接是否正常',
            '如果问题持续，请尝试使用更简单的文本格式'
          ]
        },
        { status: 500 }
      );
    }

    console.log('[智能解析] 成功解析', result.words.length, '个单词');

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        words: result.words,
        totalWords: result.words.length,
        summary: {
          withPronunciation: result.words.filter(w => w.pronunciation).length,
          withPartOfSpeech: result.words.filter(w => w.partOfSpeech).length,
          withExamples: result.words.filter(w => w.example).length,
        }
      }
    });
  } catch (error) {
    console.error('[智能解析] 处理失败:', error);
    return NextResponse.json(
      {
        error: '智能解析失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
