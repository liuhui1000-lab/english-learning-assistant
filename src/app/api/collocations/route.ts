import { NextRequest, NextResponse } from 'next/server';
import { collocationManager } from '@/storage/database/collocationManager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    let collocations;
    if (category) {
      collocations = await collocationManager.getCollocationsByCategory(category);
    } else {
      collocations = await collocationManager.getCollocations();
    }

    return NextResponse.json({
      success: true,
      collocations,
      total: collocations.length,
    });
  } catch (error) {
    console.error('获取固定搭配失败:', error);
    return NextResponse.json(
      { error: '获取失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phrase, meaning, example, exampleTranslation, category, difficulty } = body;

    if (!phrase || !meaning || !category) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const collocation = await collocationManager.createCollocation({
      phrase,
      meaning,
      example,
      exampleTranslation,
      category,
      difficulty: difficulty || 1,
    });

    return NextResponse.json({
      success: true,
      collocation,
    });
  } catch (error) {
    console.error('创建固定搭配失败:', error);
    return NextResponse.json(
      { error: '创建失败，请稍后重试' },
      { status: 500 }
    );
  }
}
