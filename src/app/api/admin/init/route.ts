/**
 * 系统初始化 API
 * POST /api/admin/init - 初始化系统，创建默认管理员用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { hashPassword } from '@/utils/auth';

/**
 * POST /api/admin/init - 初始化系统
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, masterKey } = body;

    // 验证主密钥（防止未授权访问）
    const ADMIN_INIT_KEY = process.env.ADMIN_INIT_KEY || 'init-admin-2024';

    if (masterKey !== ADMIN_INIT_KEY) {
      return NextResponse.json(
        { error: '主密钥无效' },
        { status: 403 }
      );
    }

    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: '用户名、邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 检查是否已有用户
    const existingUsers = await query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(existingUsers.rows[0].count);

    if (userCount > 0) {
      return NextResponse.json(
        { error: '系统已初始化，请直接登录' },
        { status: 400 }
      );
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建管理员用户
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const result = await query(
      `INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      [userId, username, email, passwordHash, '系统管理员', 'admin', true]
    );

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      data: user,
      message: '系统初始化成功，管理员账户已创建',
    });
  } catch (error) {
    console.error('系统初始化失败:', error);
    return NextResponse.json(
      { error: '系统初始化失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/init - 检查系统是否已初始化
 */
export async function GET() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(result.rows[0].count);

    return NextResponse.json({
      success: true,
      data: {
        initialized: userCount > 0,
        userCount,
      },
    });
  } catch (error) {
    console.error('检查系统状态失败:', error);
    return NextResponse.json(
      { error: '检查系统状态失败' },
      { status: 500 }
    );
  }
}
