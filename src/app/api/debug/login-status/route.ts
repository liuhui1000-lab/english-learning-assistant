/**
 * 调试 API：检查登录状态
 * GET /debug/login-status
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 获取 Cookie
    const cookies = request.cookies.getAll();
    const authCookie = request.cookies.get('auth_token');

    return NextResponse.json({
      success: true,
      data: {
        allCookies: cookies,
        authCookie: authCookie,
        hasAuthCookie: !!authCookie,
        authCookieValue: authCookie?.value,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
      },
      { status: 500 }
    );
  }
}
