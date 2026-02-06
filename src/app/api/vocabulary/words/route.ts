import { NextRequest, NextResponse } from 'next/server';
import { wordManager } from '@/storage/database/wordManager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const all = searchParams.get('all') === 'true';

    let words;
    if (userId) {
      // 获取用户学习进度
      words = await wordManager.getUserProgress(userId);
    } else if (all) {
      // 获取所有单词
      words = await wordManager.getAllWords();
    } else {
      // 获取单词列表（默认限制100个）
      words = await wordManager.getWords();
    }

    return NextResponse.json({
      success: true,
      words,
      total: words.length,
    });
  } catch (error) {
    console.error('获取单词列表失败:', error);
    return NextResponse.json(
      { error: '获取失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, phonetic, meaning, example, exampleTranslation, difficulty } = body;

    if (!word || !meaning) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const newWord = await wordManager.createWord({
      word,
      phonetic,
      meaning,
      example,
      exampleTranslation,
      difficulty: difficulty || 1,
    });

    return NextResponse.json({
      success: true,
      word: newWord,
    });
  } catch (error) {
    console.error('创建单词失败:', error);
    return NextResponse.json(
      { error: '创建失败，请稍后重试' },
      { status: 500 }
    );
  }
}
