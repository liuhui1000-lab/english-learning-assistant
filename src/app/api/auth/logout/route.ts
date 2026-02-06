/**
 * 用户登出API
 * POST /api/auth/logout - 用户登出
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/utils/auth';

/**
 * POST /api/auth/logout - 用户登出
 */
export async function POST(request: NextRequest) {
  try {
    // 清除认证cookie
    clearAuthCookie();

    return NextResponse.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}
