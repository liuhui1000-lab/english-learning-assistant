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
import { words } from '@/storage/database/shared/schema';
import { eq, sql } from 'drizzle-orm';
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
    const includeExamples = formData.get('includeExamples') === 'true';

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

    // 创建超时控制 Promise（8秒，留2秒给 Netlify）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求处理超时，请使用"大文件模式"上传')), 8000);
    });

    // 创建处理 Promise
    const processPromise = (async () => {
      const startTime = Date.now();
      console.log(`[单词上传] 开始处理文件: ${file.name}, 大小: ${file.size} bytes`);

      // 解析文件内容
      console.log(`[单词上传] [${Date.now() - startTime}ms] 开始解析文件`);
      let text = '';

      try {
        const parseResult = await parseFile(file);
        text = parseResult.text;

        if (parseResult.warnings.length > 0) {
          console.warn('[单词上传] 解析警告:', parseResult.warnings);
        }
        console.log(`[单词上传] [${Date.now() - startTime}ms] 文件解析完成`);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : '文件解析失败');
      }

      if (!text.trim()) {
        throw new Error('文件内容为空');
      }

      // 首先尝试规则解析
      console.log(`[单词上传] [${Date.now() - startTime}ms] 尝试规则解析`);
      let parsedWords = await parseWordDocument(text, {
        fetchPronunciation: true,
        fetchPartOfSpeech: true,
        fetchExample: includeExamples,
      });

      console.log(`[单词上传] [${Date.now() - startTime}ms] 规则解析完成`, {
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
          const { parseWordsWithAI } = await import('@/utils/aiHelper');

          const aiPromise = parseWordsWithAI(text, {
            includeExamples,
            timeout: 7000,
          });

          const aiResult: any = await Promise.race([
            aiPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('AI 解析超时')), 8000))
          ]);

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

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const simpleWords = lines
              .map(line => {
                const match = line.match(/^([a-zA-Z]+)/);
                return match ? match[1].toLowerCase() : null;
              })
              .filter((w): w is string => w !== null && w.length > 1);

            if (simpleWords.length > 0) {
              console.log('[单词上传] 提取到', simpleWords.length, '个简单单词');

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
        throw new Error('未能从文档中解析出单词');
      }

      console.log(`[单词上传] [${Date.now() - startTime}ms] 成功解析 ${parsedWords.length} 个单词`);

      // 保存到数据库（使用批量操作）
      console.log(`[单词上传] [${Date.now() - startTime}ms] 开始数据库操作`);
      const db = await getDb();
      const insertedWords = [];

      // 批量检查已存在的单词
      const allWords = parsedWords.map(w => w.word);
      const existingWordsResult = await db
        .select()
        .from(words)
        .where(sql`${words.word} = ANY(${allWords})`);

      console.log(`[单词上传] [${Date.now() - startTime}ms] 查询已存在单词完成`, {
        total: allWords.length,
        existing: existingWordsResult.length,
      });

      const existingWordsMap = new Map(
        existingWordsResult.map(w => [w.word, w])
      );

      // 批量插入新单词
      const newWords = parsedWords.filter(w => !existingWordsMap.has(w.word));
      console.log(`[单词上传] [${Date.now() - startTime}ms] 准备插入新单词`, { count: newWords.length });
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
        console.log(`[单词上传] [${Date.now() - startTime}ms] 插入新单词完成`, { count: inserted.length });
      }

      // 批量更新已存在的单词
      const wordsToUpdate = parsedWords.filter(w => existingWordsMap.has(w.word));
      console.log(`[单词上传] [${Date.now() - startTime}ms] 准备更新已存在单词`, { count: wordsToUpdate.length });
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

      const totalTime = Date.now() - startTime;
      console.log(`[单词上传] 处理完成，总耗时: ${totalTime}ms`, {
        totalWords: parsedWords.length,
        newWords: newWords.length,
        updatedWords: wordsToUpdate.length,
      });

      return {
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
      };
    })();

    // 等待处理完成或超时
    const result: any = await Promise.race([processPromise, timeoutPromise]);

    return NextResponse.json(result);

  } catch (error) {
    console.error('上传单词失败:', error);

    // 检查是否是超时错误
    if (error instanceof Error && error.message.includes('超时')) {
      return NextResponse.json(
        {
          error: '请求处理超时',
          details: '处理时间过长。请使用"大文件模式"上传（在智能导入页面开启"大文件模式"开关）。\n\n大文件模式会分批处理，完全不受超时限制。',
          suggestions: [
            '使用"大文件模式"上传（推荐）',
            '上传较小的文件（< 200 个单词）',
            '使用简单的单词格式（如：adventure - 冒险）',
            '不勾选"包含例句"选项',
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
