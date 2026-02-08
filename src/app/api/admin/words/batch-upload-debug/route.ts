import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/utils/auth';
import { getDb } from '@/utils/db';
import { sql, or, eq } from 'drizzle-orm';
import { words } from '@/storage/database/shared/schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[批量上传调试] ========== 开始 ==========');

  try {
    // 验证权限
    const permission = await checkPermission('admin');
    console.log('[批量上传调试] 权限检查结果:', permission);

    if (!permission.success) {
      console.log('[批量上传调试] 权限检查失败');
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    console.log('[批量上传调试] 权限检查通过，用户ID:', permission.userId);

    const body = await request.json();
    console.log('[批量上传调试] 请求体:', JSON.stringify(body, null, 2));

    const { words: wordsData, batchNumber, totalBatches } = body;

    console.log('[批量上传调试] 批次信息:', { batchNumber, totalBatches, wordCount: wordsData?.length });

    if (!Array.isArray(wordsData) || wordsData.length === 0) {
      console.log('[批量上传调试] 单词数据无效');
      return NextResponse.json(
        { error: '单词数据无效' },
        { status: 400 }
      );
    }

    const db = await getDb();
    let newWords = 0;
    let updatedWords = 0;
    let failedWords = 0;

    // 批量检查已存在的单词
    // 保持单词的原始大小写（专有名词需要大写）
    // 在查询时使用 LOWER(word) 进行比较
    const wordsWithLower = wordsData.map((w: any) => ({
      ...w,
      wordLower: w.word.toLowerCase()
    }));

    const allWordsLower = wordsWithLower.map(w => w.wordLower);
    console.log('[批量上传调试] 查询单词列表:', allWordsLower.slice(0, 5));

    // 使用 OR 条件查询已存在的单词（支持大小写不敏感）
    const conditions = allWordsLower.map(word => 
      eq(sql`LOWER(${words.word})`, word)
    );
    
    const existingWordsResult = await db
      .select()
      .from(words)
      .where(or(...conditions));

    console.log('[批量上传调试] 已存在单词数:', existingWordsResult.length);
    if (existingWordsResult.length > 0) {
      console.log('[批量上传调试] 已存在单词示例:', existingWordsResult.slice(0, 3).map((w: any) => ({ word: w.word, id: w.id })));
    }

    const existingWordsMap = new Map(
      existingWordsResult.map((w: any) => [w.word.toLowerCase(), w])
    );

    // 批量插入新单词
    const newWordsList = wordsWithLower.filter(w => !existingWordsMap.has(w.wordLower));
    console.log('[批量上传调试] 准备插入单词数:', newWordsList.length);
    console.log('[批量上传调试] 待插入单词示例:', newWordsList.slice(0, 3));

    if (newWordsList.length > 0) {
      try {
        const insertData = newWordsList.map((wordData: any) => ({
          word: wordData.word, // 保持原始大小写（专有名词需要大写）
          phonetic: wordData.pronunciation || '',
          meaning: wordData.definition || '',
          example: wordData.example || '',
          exampleTranslation: wordData.exampleTranslation || '',
          difficulty: 1,
        }));

        console.log('[批量上传调试] 执行插入...');

        const inserted = await db
          .insert(words)
          .values(insertData)
          .returning();

        console.log('[批量上传调试] 插入成功数:', inserted.length);
        console.log('[批量上传调试] 插入结果示例:', inserted.slice(0, 3));

        newWords = inserted.length;
      } catch (error) {
        console.error('[批量上传调试] 插入失败:', error);
        failedWords += newWordsList.length;
      }
    } else {
      console.log('[批量上传调试] 没有新单词需要插入');
    }

    console.log('[批量上传调试] ========== 结束 ==========');

    return NextResponse.json({
      success: true,
      data: {
        batchNumber,
        totalBatches,
        processedWords: wordsData.length,
        newWords,
        updatedWords,
        failedWords,
        message: `批次 ${batchNumber}/${totalBatches} 处理完成 - 新增: ${newWords}, 更新: ${updatedWords}, 失败: ${failedWords}`,
      },
    });
  } catch (error) {
    console.error('[批量上传调试] 未捕获错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量上传失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
