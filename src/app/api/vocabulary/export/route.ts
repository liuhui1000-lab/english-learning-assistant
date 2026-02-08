import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { words, userWordProgress } from '@/storage/database/shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// 下载词库（包含掌握度）
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const format = searchParams.get('format') || 'json'; // json 或 csv

    // 获取所有单词及其掌握度
    const allWords = await db
      .select({
        word: words,
        masteryLevel: userWordProgress.masteryLevel,
        reviewCount: userWordProgress.reviewCount,
        errorCount: userWordProgress.errorCount,
        lastReviewAt: userWordProgress.lastReviewAt,
        nextReviewAt: userWordProgress.nextReviewAt,
      })
      .from(words)
      .leftJoin(
        userWordProgress,
        and(
          eq(userWordProgress.wordId, words.id),
          eq(userWordProgress.userId, userId)
        )
      )
      .orderBy(words.word);

    // 转换数据格式
    const exportData = allWords.map((item) => ({
      word: item.word.word,
      phonetic: item.word.phonetic,
      meaning: item.word.meaning,
      example: item.word.example,
      exampleTranslation: item.word.exampleTranslation,
      difficulty: item.word.difficulty,
      masteryLevel: item.masteryLevel ?? 0,
      reviewCount: item.reviewCount ?? 0,
      errorCount: item.errorCount ?? 0,
      lastReviewAt: item.lastReviewAt ?? null,
      nextReviewAt: item.nextReviewAt ?? null,
    }));

    if (format === 'csv') {
      // CSV 格式 - 使用中文表头
      const headers = [
        '单词',
        '音标',
        '释义',
        '例句',
        '例句翻译',
        '难度',
        '掌握度',
        '复习次数',
        '错误次数',
        '最后复习时间',
        '下次复习时间',
      ];

      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          [
            row.word,
            row.phonetic,
            row.meaning,
            row.example,
            row.exampleTranslation,
            row.difficulty,
            row.masteryLevel,
            row.reviewCount,
            row.errorCount,
            row.lastReviewAt ?? '',
            row.nextReviewAt ?? '',
          ]
            .map((value) => {
              // 处理包含逗号、引号、换行的字段
              const strValue = String(value ?? '');
              if (
                strValue.includes(',') ||
                strValue.includes('"') ||
                strValue.includes('\n')
              ) {
                return `"${strValue.replace(/"/g, '""')}"`;
              }
              return strValue;
            })
            .join(',')
        ),
      ].join('\n');

      // 添加 BOM (Byte Order Mark) 以便 Excel 正确识别 UTF-8 编码
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const csvBuffer = Buffer.concat([bom, Buffer.from(csvContent, 'utf-8')]);

      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="vocabulary_${userId}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON 格式
    return NextResponse.json(
      {
        success: true,
        userId,
        exportDate: new Date().toISOString(),
        totalWords: exportData.length,
        words: exportData,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="vocabulary_${userId}_${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error) {
    console.error('Error exporting vocabulary:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
