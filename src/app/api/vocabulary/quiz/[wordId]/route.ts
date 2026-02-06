import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { words } from '@/storage/database/shared/schema';
import { sql, eq, ne } from 'drizzle-orm';

// 生成词义选择题
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  try {
    const db = await getDb();
    const { wordId } = await params;

    // 获取目标单词
    const [targetWord] = await db
      .select()
      .from(words)
      .where(eq(words.id, wordId))
      .limit(1);

    if (!targetWord) {
      return NextResponse.json(
        { success: false, error: '单词不存在' },
        { status: 404 }
      );
    }

    // 获取3个干扰项（随机选择）
    const distractors = await db
      .select()
      .from(words)
      .where(ne(words.id, wordId))
      .orderBy(sql`RANDOM()`)
      .limit(3);

    // 组合选项
    const options = [
      {
        id: targetWord.id,
        text: targetWord.meaning,
        isCorrect: true,
      },
      ...distractors.map(d => ({
        id: d.id,
        text: d.meaning,
        isCorrect: false,
      })),
    ];

    // 随机打乱选项顺序
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return NextResponse.json({
      success: true,
      word: {
        id: targetWord.id,
        word: targetWord.word,
        phonetic: targetWord.phonetic,
      },
      options,
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { success: false, error: '生成题目失败' },
      { status: 500 }
    );
  }
}
