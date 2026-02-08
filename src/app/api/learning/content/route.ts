/**
 * 学习内容适配 API
 * GET /api/learning/content - 获取用户可访问的学习内容（向下兼容）
 * GET /api/learning/stats - 获取用户学习统计
 * GET /api/learning/plan - 生成学习计划
 */

import { NextRequest, NextResponse } from 'next/server';
import { adaptWordFamiliesForUser, getUserLearningStats, generateLearningPlan } from '@/storage/database/learningContentAdapter';
import { getCurrentUserFromRequest } from '@/utils/authHelper';
import { z } from 'zod';

/**
 * GET /api/learning/content - 获取用户可访问的学习内容（向下兼容）
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
    const limit = parseInt(searchParams.get('limit') || '50');

    // 从用户信息中获取年级（如果没有提供，默认8年级）
    // 注意：这里需要用户表有 grade 字段，或者从其他地方获取
    // 暂时使用参数方式
    const grade = searchParams.get('grade') || '8年级';

    const families = await adaptWordFamiliesForUser(grade, limit);

    return NextResponse.json({
      success: true,
      data: {
        userGrade: grade,
        accessibleGrades: ['6年级', '7年级', '8年级', '9年级'].filter(g =>
          ['6年级', '7年级', '8年级', '9年级'].indexOf(g) <=
          ['6年级', '7年级', '8年级', '9年级'].indexOf(grade)
        ),
        count: families.length,
        families,
      },
      message: `为 ${grade} 学生推荐 ${families.length} 个词族`,
    });
  } catch (error) {
    console.error('[获取学习内容] 错误:', error);
    return NextResponse.json(
      { error: '获取学习内容失败' },
      { status: 500 }
    );
  }
}
