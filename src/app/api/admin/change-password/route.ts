import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { getCurrentUserFromRequest } from '@/utils/authHelper';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    console.log('修改密码请求:', { oldPassword: '***', newPassword: '***' });

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

    // 直接从 request 获取当前用户信息
    const currentUser = getCurrentUserFromRequest(request);

    console.log('当前用户:', currentUser);

    if (!currentUser) {
      console.error('用户未登录');
      return NextResponse.json(
        { success: false, error: '用户未登录' },
        { status: 401 }
      );
    }

    console.log('用户ID:', currentUser.userId, '用户角色:', currentUser.role);

    // 验证是否为管理员
    if (currentUser.role !== 'admin') {
      console.error('非管理员用户尝试修改密码');
      return NextResponse.json(
        { success: false, error: '只有管理员可以修改密码' },
        { status: 403 }
      );
    }

    // 查询用户信息
    const result = await query(
      `SELECT id, username, password_hash FROM users WHERE id = $1`,
      [currentUser.userId]
    );

    console.log('数据库查询结果行数:', result.rows?.length);

    if (!result.rows || result.rows.length === 0) {
      console.error('未找到用户:', currentUser.userId);
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const existingUser = result.rows[0];
    console.log('现有用户数据:', { id: existingUser.id, username: existingUser.username });

    // 验证旧密码
    const inputHash = crypto
      .createHash('sha256')
      .update(oldPassword)
      .digest('hex');

    console.log('旧密码哈希比对:', {
      input: inputHash,
      stored: existingUser.password_hash,
      match: inputHash === existingUser.password_hash
    });

    if (inputHash !== existingUser.password_hash) {
      console.error('旧密码不匹配');
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

    console.log('准备更新密码');

    // 更新密码
    await query(
      `UPDATE users
       SET password_hash = $1, updated_at = $2
       WHERE id = $3`,
      [newPasswordHash, new Date().toISOString(), currentUser.userId]
    );

    console.log('密码更新成功');

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
