/**
 * 学习内容适配 API
 * GET /api/learning/content - 获取用户可访问的学习内容（向下兼容，支持学期）
 */

import { NextRequest, NextResponse } from 'next/server';
import { adaptWordFamiliesForUser } from '@/storage/database/learningContentAdapter';
import { getCurrentUserFromRequest } from '@/utils/authHelper';

/**
 * GET /api/learning/content - 获取用户可访问的学习内容（向下兼容，支持学期）
 *
 * 查询参数：
 * - gradeSemester: 年级学期组合，如 "8年级上学期"、"8年级下学期"
 * - limit: 返回的词族数量，默认 50
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

    // 从查询参数获取年级学期（如果没有提供，默认8年级下学期）
    const gradeSemester = searchParams.get('gradeSemester') || '8年级下学期';

    const families = await adaptWordFamiliesForUser(gradeSemester, limit);

    // 获取可访问的年级学期
    const allGradeSemesters = ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'];
    const userIndex = allGradeSemesters.indexOf(gradeSemester);
    const accessibleGradeSemesters = allGradeSemesters.filter((_, index) => index <= userIndex);

    return NextResponse.json({
      success: true,
      data: {
        userGradeSemester: gradeSemester,
        accessibleGradeSemesters,
        count: families.length,
        families,
      },
      message: `为 ${gradeSemester} 学生推荐 ${families.length} 个词族`,
    });
  } catch (error) {
    console.error('[获取学习内容] 错误:', error);
    return NextResponse.json(
      { error: '获取学习内容失败' },
      { status: 500 }
    );
  }
}
