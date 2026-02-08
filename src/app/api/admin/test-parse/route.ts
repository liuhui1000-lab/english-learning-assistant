/**
 * 测试文档解析 API
 * 用于调试和测试文件解析功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/utils/fileParser';
import { parseWordDocument } from '@/utils/wordParser';
import { parseWordsWithAI } from '@/utils/aiHelper';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const useAI = formData.get('useAI') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    console.log('[测试解析] 文件名:', file.name);
    console.log('[测试解析] 文件大小:', file.size);
    console.log('[测试解析] 文件类型:', file.type);

    // Step 1: 解析文件内容
    console.log('[测试解析] Step 1: 解析文件内容');
    const parseResult = await parseFile(file);

    console.log('[测试解析] 文件解析完成');
    console.log('[测试解析] 文本长度:', parseResult.text.length);
    console.log('[测试解析] 格式:', parseResult.format);
    console.log('[测试解析] 警告:', parseResult.warnings);
    console.log('[测试解析] 文本预览（前300字符）:', parseResult.text.substring(0, 300));

    const result: any = {
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      parse: {
        format: parseResult.format,
        textLength: parseResult.text.length,
        warnings: parseResult.warnings,
        textPreview: parseResult.text.substring(0, 500),
      },
    };

    // Step 2: 尝试规则解析
    console.log('[测试解析] Step 2: 尝试规则解析');
    const ruleParsedWords = await parseWordDocument(parseResult.text, {
      fetchPronunciation: true,
      fetchPartOfSpeech: true,
      fetchExample: true,
    });

    console.log('[测试解析] 规则解析结果:', ruleParsedWords.length, '个单词');

    result.ruleParsing = {
      success: ruleParsedWords.length > 0,
      wordCount: ruleParsedWords.length,
      words: ruleParsedWords,
    };

    // Step 3: 如果规则解析失败或要求使用 AI，尝试 AI 解析
    if (useAI || ruleParsedWords.length === 0) {
      console.log('[测试解析] Step 3: 尝试 AI 解析');

      const aiResult = await parseWordsWithAI(parseResult.text, {
        includeExamples: true,
      });

      console.log('[测试解析] AI 解析结果:', aiResult.success, aiResult.words.length, '个单词');

      result.aiParsing = {
        success: aiResult.success,
        wordCount: aiResult.words.length,
        error: aiResult.error,
        words: aiResult.words,
      };

      if (aiResult.error) {
        result.aiParsing.errorDetails = aiResult.error;
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[测试解析] 错误:', error);
    return NextResponse.json(
      {
        error: '测试解析失败',
        details: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : String(error),
      },
      { status: 500 }
    );
  }
}
