/**
 * 管理员用户管理API - 单个用户操作
 * GET    /api/admin/users/:id    - 获取用户详情
 * PUT    /api/admin/users/:id    - 修改用户
 * DELETE /api/admin/users/:id    - 删除用户
 * POST   /api/admin/users/:id/reset-password - 重置密码
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';
import { hashPassword, generateToken } from '@/utils/auth';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/admin/users/:id - 获取用户详情
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = (await context.params).id;

    // 查询用户基本信息
    const userResult = await query(
      `SELECT
        id,
        username,
        email,
        full_name,
        role,
        is_active,
        last_login_at,
        created_at,
        updated_at,
        last_analysis_date,
        has_new_mistakes,
        last_mistake_updated
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 查询错题统计
    const statsResult = await query(
      'SELECT * FROM user_mistake_stats WHERE user_id = $1',
      [userId]
    );
    const stats = statsResult.rows[0] || null;

    // 查询深度分析
    const analysisResult = await query(
      'SELECT * FROM user_mistake_analysis WHERE user_id = $1',
      [userId]
    );
    const analysis = analysisResult.rows[0] || null;

    // 查询最近登录日志
    const loginLogsResult = await query(
      `SELECT ip_address, user_agent, login_at, success, failure_reason
       FROM user_login_logs
       WHERE user_id = $1
       ORDER BY login_at DESC
       LIMIT 10`,
      [userId]
    );
    const loginLogs = loginLogsResult.rows;

    // 查询错题数量
    const mistakesResult = await query(
      `SELECT category, COUNT(*) as count
       FROM user_mistakes
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );
    const mistakesByCategory = mistakesResult.rows;

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        stats,
        analysis,
        loginLogs,
        mistakesByCategory,
      },
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { error: '获取用户详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/:id - 修改用户
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = (await context.params).id;
    const body = await request.json();
    const {
      email,
      fullName,
      role,
      isActive,
    } = body;

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      values.push(fullName);
      paramIndex++;
    }

    if (role !== undefined) {
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json(
          { error: '角色必须是 admin 或 user' },
          { status: 400 }
        );
      }
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    values.push(userId);

    // 更新用户
    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, username, email, full_name, role, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '用户信息更新成功',
    });
  } catch (error) {
    console.error('修改用户失败:', error);
    return NextResponse.json(
      { error: '修改用户失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id - 删除用户
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = (await context.params).id;

    // 检查是否为管理员自己
    const currentUser = permission.userId;
    if (userId === currentUser) {
      return NextResponse.json(
        { error: '不能删除自己的账户' },
        { status: 400 }
      );
    }

    // 删除用户（会级联删除相关数据）
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '用户删除成功',
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/:id/reset-password - 重置用户密码
 */
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
