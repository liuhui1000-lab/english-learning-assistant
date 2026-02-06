/**
 * 用户登录API
 * POST /api/auth/login - 用户登录
 * POST /api/auth/logout - 用户登出
 * GET  /api/auth/me - 获取当前用户信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { verifyPassword, generateAuthToken, setAuthCookie, getCurrentUser } from '@/utils/auth';

/**
 * POST /api/auth/login - 用户登录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码为必填项' },
        { status: 400 }
      );
    }

    // 查询用户
    const result = await query(
      `SELECT
        id,
        username,
        email,
        password_hash,
        full_name,
        role,
        is_active
      FROM users
      WHERE username = $1 OR email = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      // 记录失败的登录尝试
      await query(
        `INSERT INTO user_login_logs (user_id, success, failure_reason)
         VALUES (NULL, false, '用户不存在')`
      );

      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // 检查账户是否激活
    if (!user.is_active) {
      // 记录失败的登录尝试
      await query(
        `INSERT INTO user_login_logs (user_id, success, failure_reason)
         VALUES ($1, false, '账户已禁用')`,
        [user.id]
      );

      return NextResponse.json(
        { error: '账户已被禁用，请联系管理员' },
        { status: 403 }
      );
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // 记录失败的登录尝试
      await query(
        `INSERT INTO user_login_logs (user_id, success, failure_reason)
         VALUES ($1, false, '密码错误')`,
        [user.id]
      );

      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 记录成功的登录
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    await query(
      `INSERT INTO user_login_logs (user_id, ip_address, user_agent, success)
       VALUES ($1, $2, $3, true)`,
      [user.id, ipAddress, userAgent]
    );

    // 生成认证token
    const token = generateAuthToken(user.id, user.role);

    // 设置cookie
    const cookie = setAuthCookie(token);

    // 返回用户信息
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        lastLoginAt: new Date().toISOString(),
      },
      message: '登录成功',
    });

    // 在响应中设置cookie
    response.cookies.set(cookie.name, cookie.value, cookie.attributes);

    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
