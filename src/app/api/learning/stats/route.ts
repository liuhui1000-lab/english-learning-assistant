/**
 * 学习统计 API
 * GET /api/learning/stats - 获取用户学习统计（向下兼容，支持学期）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserLearningStats } from '@/storage/database/learningContentAdapter';
import { getCurrentUserFromRequest } from '@/utils/authHelper';

/**
 * GET /api/learning/stats - 获取用户学习统计（向下兼容，支持学期）
 *
 * 查询参数：
 * - gradeSemester: 年级学期组合，如 "8年级上学期"、"8年级下学期"
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
    const gradeSemester = searchParams.get('gradeSemester') || '8年级下学期';

    const stats = await getUserLearningStats(user.id, gradeSemester);

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
