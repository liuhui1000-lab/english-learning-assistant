import { NextRequest, NextResponse } from 'next/server';
import { wordManager } from '@/storage/database/wordManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, wordId, action } = body; // action: 'mastered' or 'review'

    if (!userId || !wordId || !action) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 计算下次复习时间（艾宾浩斯记忆曲线）
    const calculateNextReview = (currentLevel: number) => {
      const intervals = [1, 2, 4, 7, 14, 30]; // 天数
      const days = intervals[Math.min(currentLevel, intervals.length - 1)] || 30;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + days);
      return nextReview;
    };

    let progress;
    if (action === 'mastered') {
      // 已掌握，提高掌握程度
      progress = await wordManager.updateProgress(userId, wordId, {
        masteryLevel: Math.min(5, 1),
        reviewCount: 1,
        nextReviewAt: calculateNextReview(1),
      });

      if (!progress) {
        // 如果没有进度记录，创建一个
        progress = await wordManager.addProgress(userId, wordId, 1, calculateNextReview(1));
      }
    } else if (action === 'review') {
      // 需要复习，降低掌握程度
      progress = await wordManager.updateProgress(userId, wordId, {
        masteryLevel: Math.max(0, 0),
        reviewCount: 1,
        nextReviewAt: calculateNextReview(0),
      });

      if (!progress) {
        progress = await wordManager.addProgress(userId, wordId, 0, calculateNextReview(0));
      }
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return NextResponse.json(
      { error: '更新失败，请稍后重试' },
      { status: 500 }
    );
  }
}
