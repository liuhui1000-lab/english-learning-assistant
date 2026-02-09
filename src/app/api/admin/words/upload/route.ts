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
import { getDb } from '@/utils/db';
import { words } from '@/storage/database/shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';
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

    // 验证文件大小（放宽到 50MB，注：Netlify 仍有 6MB 限制，建议大文件分片）
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: '文件过大，单次上传请不超过 50MB' },
        { status: 400 }
      );
    }

    // 创建超时控制 Promise（15秒，给予更多处理时间）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求处理超时，请分批上传或检查网络')), 15000);
    });

    // 创建处理 Promise
    const processPromise = (async () => {
      const startTime = Date.now();
      console.log(`[单词上传] 开始处理文件: ${file.name}, 大小: ${file.size} bytes`);

      // 解析文件内容
      const parseResult = await parseFile(file);
      const text = parseResult.text;

      if (!text.trim()) {
        throw new Error('文件内容为空');
      }

      // 首先尝试规则解析
      let parsedWords = await parseWordDocument(text, {
        fetchPronunciation: true,
        fetchPartOfSpeech: true,
        fetchExample: includeExamples,
      });

      // 如果规则解析失败或结果为空，尝试 AI 解析
      if (parsedWords.length === 0) {
        try {
          const { parseWordsWithAI } = await import('@/utils/aiHelper');
          const aiResult: any = await parseWordsWithAI(text, {
            includeExamples,
            timeout: 10000,
          });

          if (aiResult.success && aiResult.words?.length > 0) {
            parsedWords = aiResult.words;
          }
        } catch (error) {
          console.error('[单词上传] AI 解析异常:', error);
        }
      }

      if (parsedWords.length === 0) {
        throw new Error('未能从文档中解析出单词');
      }

      // 保存到数据库
      const db = await getDb();
      const allWords = parsedWords.map(w => w.word);

      // 分批查询已存在单词
      const QUERY_BATCH_SIZE = 100;
      const existingWordsResult = [];
      for (let i = 0; i < allWords.length; i += QUERY_BATCH_SIZE) {
        const batch = allWords.slice(i, i + QUERY_BATCH_SIZE);
        const batchResult = await db.select().from(words).where(inArray(words.word, batch));
        existingWordsResult.push(...batchResult);
      }

      const existingWordsMap = new Map(existingWordsResult.map(w => [w.word, w]));
      const insertedWords = [];

      // 1. 批量插入新单词
      const newWordsData = parsedWords
        .filter(w => !existingWordsMap.has(w.word))
        .map(wordData => ({
          word: wordData.word,
          phonetic: wordData.pronunciation || '',
          meaning: wordData.definition || '',
          example: wordData.example || '',
          exampleTranslation: wordData.exampleTranslation || '',
          difficulty: 1,
        }));

      if (newWordsData.length > 0) {
        const INSERT_BATCH_SIZE = 50;
        for (let i = 0; i < newWordsData.length; i += INSERT_BATCH_SIZE) {
          const batch = newWordsData.slice(i, i + INSERT_BATCH_SIZE);
          const inserted = await db.insert(words).values(batch).returning();
          insertedWords.push(...inserted);
        }
      }

      // 2. 优化更新：使用事务分批更新
      const wordsToUpdate = parsedWords.filter(w => existingWordsMap.has(w.word));
      if (wordsToUpdate.length > 0) {
        const UPDATE_BATCH_SIZE = 20;
        for (let i = 0; i < wordsToUpdate.length; i += UPDATE_BATCH_SIZE) {
          const batch = wordsToUpdate.slice(i, i + UPDATE_BATCH_SIZE);
          await db.transaction(async (tx) => {
            for (const wordData of batch) {
              const existingWord = existingWordsMap.get(wordData.word)!;
              const [updated] = await tx
                .update(words)
                .set({
                  phonetic: wordData.pronunciation || existingWord.phonetic,
                  meaning: wordData.definition || existingWord.meaning,
                  example: wordData.example || existingWord.example,
                  exampleTranslation: wordData.exampleTranslation || existingWord.exampleTranslation,
                })
                .where(eq(words.id, existingWord.id))
                .returning();
              insertedWords.push(updated);
            }
          });
        }
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
          newWords: newWordsData.length,
          updatedWords: wordsToUpdate.length,
        },
        message: `成功导入 ${insertedWords.length} 个单词（${newWordsData.length} 个新单词，${wordsToUpdate.length} 个已更新）`,
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
