/**
 * POST /api/admin/users/:id/reset-password - 重置用户密码
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';
import { hashPassword } from '@/utils/auth';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      console.error('重置密码权限检查失败:', permission.error);
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = (await context.params).id;
    const body = await request.json();
    const { newPassword } = body;

    console.log('重置密码请求:', { userId, newPasswordLength: newPassword?.length });

    if (!newPassword || newPassword.length < 6) {
      console.error('密码长度不足');
      return NextResponse.json(
        { error: '新密码长度不能少于6位' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const userCheck = await query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      console.error('用户不存在:', userId);
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = userCheck.rows[0];
    console.log('准备为用户重置密码:', user.username);

    // 哈希新密码
    const passwordHash = await hashPassword(newPassword);

    console.log('密码已哈希，准备更新数据库');

    // 更新密码
    const result = await query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, email`,
      [passwordHash, userId]
    );

    console.log('更新结果行数:', result.rows.length);

    if (result.rows.length === 0) {
      console.error('更新失败，用户不存在');
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    console.log('密码重置成功:', result.rows[0]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '密码重置成功',
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈');
    console.error('错误类型:', error instanceof Error ? error.constructor.name : typeof error);

    return NextResponse.json(
      {
        error: '重置密码失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
