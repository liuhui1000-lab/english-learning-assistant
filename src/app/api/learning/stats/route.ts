/**
 * 学习统计 API
 * GET /api/learning/stats - 获取用户学习统计（向下兼容）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserLearningStats } from '@/storage/database/learningContentAdapter';
import { getCurrentUserFromRequest } from '@/utils/authHelper';

/**
 * GET /api/learning/stats - 获取用户学习统计
 */
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade') || '8年级';

    const stats = await getUserLearningStats(user.id, grade);

    return NextResponse.json({
      success: true,
      data: stats,
      message: '学习统计数据',
    });
  } catch (error) {
    console.error('[获取学习统计] 错误:', error);
    return NextResponse.json(
      { error: '获取学习统计失败' },
      { status: 500 }
    );
  }
}
