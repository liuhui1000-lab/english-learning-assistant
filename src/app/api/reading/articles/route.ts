import { NextRequest, NextResponse } from 'next/server';
import { readingManager } from '@/storage/database/readingManager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const level = searchParams.get('level');

    let articles;
    if (level) {
      articles = await readingManager.getArticlesByLevel(level);
    } else {
      articles = await readingManager.getArticles();
    }

    // 如果有 userId，添加用户阅读进度
    if (userId) {
      const userProgress = await readingManager.getUserProgress(userId);
      const progressMap = new Map(
        userProgress.map(p => [p.articleId, { completed: p.completed, score: p.score }])
      );

      articles = articles.map(article => ({
        ...article,
        userProgress: progressMap.get(article.id) || { completed: false, score: 0 },
      }));
    }

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, level, wordCount, readTime, category, questions } = body;

    if (!title || !content || !level) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const article = await readingManager.createArticle({
      title,
      content,
      level,
      wordCount: wordCount || 0,
      readTime: readTime || 0,
      category,
      questions: questions || [],
    });

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json(
      { error: '创建失败，请稍后重试' },
      { status: 500 }
    );
  }
}
