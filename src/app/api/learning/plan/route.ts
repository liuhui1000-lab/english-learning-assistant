/**
 * 学习计划 API
 * GET /api/learning/plan - 生成学习计划（向下兼容，支持学期）
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateLearningPlan } from '@/storage/database/learningContentAdapter';
import { getCurrentUserFromRequest } from '@/utils/authHelper';

/**
 * GET /api/learning/plan - 生成学习计划（向下兼容，支持学期）
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

    const plan = await generateLearningPlan(gradeSemester);

    return NextResponse.json({
      success: true,
      data: plan,
      message: `为 ${gradeSemester} 学生生成学习计划`,
    });
  } catch (error) {
    console.error('[生成学习计划] 错误:', error);
    return NextResponse.json(
      { error: '生成学习计划失败' },
      { status: 500 }
    );
  }
}
