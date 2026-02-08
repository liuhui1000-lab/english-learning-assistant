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
  // 添加整体超时控制（9秒，留1秒给 Netlify 处理）
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求处理超时，请尝试上传较小的文件')), 9000);
  });

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

    // 验证文件大小（限制 1MB）
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: '文件过大，请上传不超过 1MB 的文件' },
        { status: 400 }
      );
    }

    // 创建实际处理 Promise
    const processPromise = (async () => {

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

        // 添加超时控制
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI 解析超时')), 8000); // 8秒超时
        });

        const aiPromise = parseWordsWithAI(text, {
          includeExamples,
          timeout: 7000, // 7秒超时（留给网络和响应的时间）
        });

        const aiResult: any = await Promise.race([aiPromise, timeoutPromise]);

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

        // 如果是超时错误，尝试使用更简单的规则
        if (error instanceof Error && error.message.includes('超时')) {
          console.log('[单词上传] AI 超时，尝试提取简单单词列表');

          // 提取所有纯英文单词
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const simpleWords = lines
            .map(line => {
              // 尝试提取第一个英文单词
              const match = line.match(/^([a-zA-Z]+)/);
              return match ? match[1].toLowerCase() : null;
            })
            .filter((w): w is string => w !== null && w.length > 1);

          if (simpleWords.length > 0) {
            console.log('[单词上传] 提取到', simpleWords.length, '个简单单词');

            // 使用字典API快速补充信息
            const { fetchDictionaryWithCache } = await import('@/utils/dictionary');
            for (const word of simpleWords) {
              try {
                const dictData = await fetchDictionaryWithCache(word);
                if (dictData) {
                  parsedWords.push({
                    word: word,
                    pronunciation: dictData.pronunciation || '',
                    partOfSpeech: dictData.partOfSpeech || '',
                    definition: dictData.definition || '',
                    example: '',
                    exampleTranslation: '',
                  });
                } else {
                  // 即使没有字典信息，也保存单词
                  parsedWords.push({
                    word: word,
                    pronunciation: '',
                    partOfSpeech: '',
                    definition: '',
                    example: '',
                    exampleTranslation: '',
                  });
                }
              } catch (e) {
                // 忽略单个单词的错误
              }
            }
          }
        }
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

    // 保存到数据库（使用批量操作）
    const db = await getDb();
    const insertedWords = [];

    // 批量检查已存在的单词
    const allWords = parsedWords.map(w => w.word);
    const existingWordsResult = await db
      .select()
      .from(words)
      .where(sql`${words.word} = ANY(${allWords})`);

    const existingWordsMap = new Map(
      existingWordsResult.map(w => [w.word, w])
    );

    // 批量插入新单词
    const newWords = parsedWords.filter(w => !existingWordsMap.has(w.word));
    if (newWords.length > 0) {
      const insertData = newWords.map(wordData => ({
        word: wordData.word,
        phonetic: wordData.pronunciation || '',
        meaning: wordData.definition || '',
        example: wordData.example || '',
        exampleTranslation: wordData.exampleTranslation || '',
        difficulty: 1,
      }));

      const inserted = await db
        .insert(words)
        .values(insertData)
        .returning();

      insertedWords.push(...inserted);
    }

    // 批量更新已存在的单词
    const wordsToUpdate = parsedWords.filter(w => existingWordsMap.has(w.word));
    for (const wordData of wordsToUpdate) {
      const existingWord = existingWordsMap.get(wordData.word)!;
      const updated = await db
        .update(words)
        .set({
          phonetic: wordData.pronunciation || existingWord.phonetic,
          meaning: wordData.definition || existingWord.meaning,
          example: wordData.example || existingWord.example,
          exampleTranslation: wordData.exampleTranslation || existingWord.exampleTranslation,
        })
        .where(eq(words.id, existingWord.id))
        .returning();

      insertedWords.push(updated[0]);
    }

    return NextResponse.json({
      success: true,
      data: {
        version,
        fileName: file.name,
        totalWords: parsedWords.length,
        insertedWords: insertedWords.length,
        newWords: newWords.length,
        updatedWords: wordsToUpdate.length,
      },
      message: `成功导入 ${insertedWords.length} 个单词（${newWords.length} 个新单词，${wordsToUpdate.length} 个已更新）`,
    });
    })();



  } catch (error) {
    console.error('上传单词失败:', error);

    // 检查是否是超时错误
    if (error instanceof Error && error.message.includes('超时')) {
      return NextResponse.json(
        {
          error: '请求处理超时',
          details: 'Netlify 免费版有 10 秒超时限制。请尝试：\n1. 上传较小的文件（< 500KB）\n2. 使用简单的单词格式（单词 + 词义）\n3. 不勾选"包含例句"选项',
          suggestions: [
            '上传较小的文件',
            '使用简单的单词格式（如：adventure - 冒险）',
            '不勾选"包含例句"选项',
            '升级到 Netlify Pro 计划以获得更长的超时时间'
          ]
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '上传失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
