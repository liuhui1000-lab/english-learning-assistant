/**
 * 单词智能上传API
 * 支持多种格式：
 * 1. 完整格式：单词 + 发音 + 词性 + 词义 + 例句 + 例句翻译
 * 2. 简化格式：单词 + 词义（推荐）
 * 3. 单词列表：只有单词
 * 
 * 支持的文件类型：
 * - 文本文件：.txt, .md, .json, .csv
 * - Word文档：.docx
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseWordDocument } from '@/utils/wordParser';
import { parseFile, getSupportedFormats, isFormatSupported } from '@/utils/fileParser';
import { getDb } from 'coze-coding-dev-sdk';
import { words, userWordProgress } from '@/storage/database/shared/schema';
import { eq, and, sql } from 'drizzle-orm';
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const version = formData.get('version') as string || 'v1.0';
    const description = formData.get('description') as string;
    const includeExamples = formData.get('includeExamples') === 'true'; // 是否获取例句

    // 验证必填字段
    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件格式
    if (!isFormatSupported(file.name)) {
      return NextResponse.json(
        { error: `仅支持 ${getSupportedFormats().join(', ')} 格式文件` },
        { status: 400 }
      );
    }

    // 解析文件内容
    console.log(`[单词上传] 开始解析文件: ${file.name}`);
    let text = '';

    try {
      const parseResult = await parseFile(file);
      text = parseResult.text;

      if (parseResult.warnings.length > 0) {
        console.warn('[单词上传] 解析警告:', parseResult.warnings);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '文件解析失败' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: '文件内容为空' },
        { status: 400 }
      );
    }

    // 首先尝试规则解析
    console.log('[单词上传] 尝试规则解析');
    let parsedWords = await parseWordDocument(text, {
      fetchPronunciation: true,   // 获取发音
      fetchPartOfSpeech: true,    // 获取词性
      fetchExample: includeExamples, // 是否获取例句
    });

    console.log('[单词上传] 规则解析结果:', {
      success: parsedWords.length > 0,
      wordCount: parsedWords.length,
      firstWord: parsedWords.length > 0 ? parsedWords[0] : null,
    });

    // 如果规则解析失败或结果为空，尝试 AI 解析
    if (parsedWords.length === 0) {
      console.log('[单词上传] 规则解析失败，尝试 AI 智能解析');
      console.log('[单词上传] 文本内容长度:', text.length);
      console.log('[单词上传] 文本内容预览（前500字符）:', text.substring(0, 500));

      try {
        // 使用内部函数而不是API调用，避免网络请求问题
        const { parseWordsWithAI } = await import('@/utils/aiHelper');
        const aiResult = await parseWordsWithAI(text, { includeExamples });

        console.log('[单词上传] AI 解析结果:', {
          success: aiResult.success,
          wordCount: aiResult.words?.length || 0,
          error: aiResult.error,
        });

        if (aiResult.success && aiResult.words && aiResult.words.length > 0) {
          parsedWords = aiResult.words;
          console.log('[单词上传] AI 解析成功，解析到', parsedWords.length, '个单词');
        } else {
          console.error('[单词上传] AI 解析失败:', aiResult.error);
        }
      } catch (error) {
        console.error('[单词上传] AI 解析异常:', error);
        // AI 解析失败，继续返回规则解析的错误
      }
    }

    if (parsedWords.length === 0) {
      return NextResponse.json(
        {
          error: '未能从文档中解析出单词',
          details: {
            fileContentLength: text.length,
            fileContentPreview: text.substring(0, 200),
          },
          suggestions: [
            '请检查文件内容是否包含英语单词',
            '请尝试使用更简单的格式（如：adventure - 冒险）',
            '请确保 AI 提供商已正确配置',
            '请检查网络连接是否正常',
            '请查看日志了解详细错误信息'
          ]
        },
        { status: 400 }
      );
    }

    console.log(`[单词上传] 成功解析 ${parsedWords.length} 个单词`);

    // 保存到数据库
    const db = await getDb();
    const insertedWords = [];

    for (const wordData of parsedWords) {
      // 检查单词是否已存在
      const [existingWord] = await db
        .select()
        .from(words)
        .where(eq(words.word, wordData.word))
        .limit(1);

      if (existingWord) {
        // 更新现有单词
        await db
          .update(words)
          .set({
            phonetic: wordData.pronunciation || existingWord.phonetic,
            meaning: wordData.definition || existingWord.meaning,
            example: wordData.example || existingWord.example,
            exampleTranslation: wordData.exampleTranslation || existingWord.exampleTranslation,
            difficulty: existingWord.difficulty,
          })
          .where(eq(words.id, existingWord.id));

        insertedWords.push({ ...existingWord, ...wordData });
      } else {
        // 插入新单词
        const insertData: any = {
          word: wordData.word,
          phonetic: wordData.pronunciation || '',
          meaning: wordData.definition || '',
          example: wordData.example || '',
          exampleTranslation: wordData.exampleTranslation || '',
          difficulty: 1,
        };

        const [newWord] = await db
          .insert(words)
          .values(insertData)
          .returning();

        insertedWords.push(newWord);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        version,
        fileName: file.name,
        totalWords: parsedWords.length,
        insertedWords: insertedWords.length,
        words: insertedWords,
      },
      message: `成功导入 ${insertedWords.length} 个单词`,
    });
  } catch (error) {
    console.error('上传单词失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '上传失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
