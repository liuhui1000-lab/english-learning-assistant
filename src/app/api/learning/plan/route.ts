/**
 * 学习计划 API
 * GET /api/learning/plan - 生成学习计划（向下兼容）
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateLearningPlan } from '@/storage/database/learningContentAdapter';
import { getCurrentUserFromRequest } from '@/utils/authHelper';

/**
 * GET /api/learning/plan - 生成学习计划
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

    const plan = await generateLearningPlan(grade);

    return NextResponse.json({
      success: true,
      data: plan,
      message: `为 ${grade} 学生生成学习计划`,
    });
  } catch (error) {
    console.error('[生成学习计划] 错误:', error);
    return NextResponse.json(
      { error: '生成学习计划失败' },
      { status: 500 }
    );
  }
}
