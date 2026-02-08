/**
 * 批量上传单词 API
 * 用于前端分批上传，避免超时
 */

import { NextRequest, NextResponse } from 'next/server';
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

    const body = await request.json();
    const { words: wordsData, batchNumber, totalBatches } = body;

    // 验证数据
    if (!Array.isArray(wordsData) || wordsData.length === 0) {
      return NextResponse.json(
        { error: '单词数据无效' },
        { status: 400 }
      );
    }

    if (wordsData.length > 200) {
      return NextResponse.json(
        { error: '单批单词数量不能超过 200 个' },
        { status: 400 }
      );
    }

    console.log(`[批量上传] 批次 ${batchNumber}/${totalBatches}，单词数量: ${wordsData.length}`);
    console.log(`[批量上传] 前3个单词:`, JSON.stringify(wordsData.slice(0, 3), null, 2));

    const db = await getDb();
    let newWords = 0;
    let updatedWords = 0;
    let failedWords = 0;

    // 批量检查已存在的单词
    const allWords = wordsData.map((w: any) => w.word);
    console.log(`[批量上传] 查询已存在单词，数量: ${allWords.length}`);
    console.log(`[批量上传] 单词列表:`, allWords.slice(0, 10));

    const existingWordsResult = await db
      .select()
      .from(words)
      .where(inArray(words.word, allWords));

    console.log(`[批量上传] 查询结果: 已存在 ${existingWordsResult.length} 个单词`);
    if (existingWordsResult.length > 0) {
      console.log(`[批量上传] 已存在单词示例:`, existingWordsResult.slice(0, 3).map(w => w.word));
    }

    const existingWordsMap = new Map(
      existingWordsResult.map(w => [w.word.toLowerCase(), w])
    );

    // 批量插入新单词（使用小写比较）
    const newWordsList = wordsData.filter((w: any) => !existingWordsMap.has(w.word.toLowerCase()));
    console.log(`[批量上传] 准备插入 ${newWordsList.length} 个新单词`);

    if (newWordsList.length > 0) {
      try {
        const insertData = newWordsList.map((wordData: any) => ({
          word: wordData.word.toLowerCase(), // 统一使用小写
          phonetic: wordData.pronunciation || '',
          meaning: wordData.definition || '',
          example: wordData.example || '',
          exampleTranslation: wordData.exampleTranslation || '',
          difficulty: 1,
        }));

        console.log(`[批量上传] 插入数据示例:`, JSON.stringify(insertData.slice(0, 2), null, 2));

        const inserted = await db
          .insert(words)
          .values(insertData)
          .returning();

        newWords = inserted.length;
      } catch (error) {
        console.error('[批量上传] 批量插入失败:', error);
        failedWords += newWordsList.length;
      }
    }

    // 批量更新已存在的单词
    const wordsToUpdate = wordsData.filter((w: any) => existingWordsMap.has(w.word));
    if (wordsToUpdate.length > 0) {
      for (const wordData of wordsToUpdate) {
        try {
          const existingWord = existingWordsMap.get(wordData.word)!;
          await db
            .update(words)
            .set({
              phonetic: wordData.pronunciation || existingWord.phonetic,
              meaning: wordData.definition || existingWord.meaning,
              example: wordData.example || existingWord.example,
              exampleTranslation: wordData.exampleTranslation || existingWord.exampleTranslation,
            })
            .where(eq(words.id, existingWord.id));

          updatedWords++;
        } catch (error) {
          console.error(`[批量上传] 更新单词失败: ${wordData.word}`, error);
          failedWords++;
        }
      }
    }

    console.log(`[批量上传] 完成 - 新增: ${newWords}, 更新: ${updatedWords}, 失败: ${failedWords}`);

    return NextResponse.json({
      success: true,
      data: {
        batchNumber,
        totalBatches,
        processedWords: wordsData.length,
        newWords,
        updatedWords,
        failedWords,
      },
      message: `批次 ${batchNumber}/${totalBatches} 处理完成`,
    });
  } catch (error) {
    console.error('[批量上传] 处理失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '批量上传失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
