import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // 验证输入
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '新密码长度不能少于6位' },
        { status: 400 }
      );
    }

    // 从 cookie 获取当前用户信息
    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/me`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!authResponse.ok) {
      return NextResponse.json(
        { success: false, error: '用户未登录' },
        { status: 401 }
      );
    }

    const userData = await authResponse.json();

    if (!userData.success || !userData.data) {
      return NextResponse.json(
        { success: false, error: '用户信息获取失败' },
        { status: 401 }
      );
    }

    const user = userData.data;

    // 验证是否为管理员
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '只有管理员可以修改密码' },
        { status: 403 }
      );
    }

    // 查询用户信息
    const result = await query(
      `SELECT id, username, password_hash FROM users WHERE id = $1`,
      [user.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const existingUser = result.rows[0];

    // 验证旧密码
    const inputHash = crypto
      .createHash('sha256')
      .update(oldPassword)
      .digest('hex');

    if (inputHash !== existingUser.password_hash) {
      return NextResponse.json(
        { success: false, error: '当前密码不正确' },
        { status: 401 }
      );
    }

    // 生成新密码的哈希
    const newPasswordHash = crypto
      .createHash('sha256')
      .update(newPassword)
      .digest('hex');

    // 更新密码
    await query(
      `UPDATE users
       SET password_hash = $1, updated_at = $2
       WHERE id = $3`,
      [newPasswordHash, new Date().toISOString(), user.id]
    );

    return NextResponse.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
