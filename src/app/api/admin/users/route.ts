/**
 * 管理员用户管理API
 * GET    /api/admin/users        - 获取用户列表
 * GET    /api/admin/users/:id    - 获取用户详情
 * POST   /api/admin/users        - 创建用户
 * PUT    /api/admin/users/:id    - 修改用户
 * DELETE /api/admin/users/:id    - 删除用户
 * POST   /api/admin/users/:id/reset-password - 重置密码
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission, isAdmin } from '@/utils/auth';
import { hashPassword, generateToken } from '@/utils/auth';

/**
 * GET /api/admin/users - 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      console.error('获取用户列表失败:', permission.error);
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('查询用户列表参数:', { role, isActive, page, limit });

    // 构建查询条件
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (isActive !== null) {
      whereConditions.push(`is_active = $${paramIndex}`);
      params.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    console.log('查询条件:', whereClause);
    console.log('查询参数:', params);

    // 查询用户列表
    const usersQuery = `
      SELECT
        id,
        username,
        email,
        full_name,
        role,
        is_active,
        last_login_at,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    console.log('执行查询:', usersQuery);

    const usersResult = await query(usersQuery, params);

    console.log('查询结果行数:', usersResult.rows.length);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 2));
    const total = parseInt(countResult.rows[0].total);

    console.log('用户总数:', total);

    // 获取每个用户的统计数据
    const userIds = usersResult.rows.map((u: any) => u.id);
    const statsQuery = userIds.length > 0
      ? `
        SELECT
          user_id,
          total_count,
          knowledge_points,
          difficulties,
          sources
        FROM user_mistake_stats
        WHERE user_id = ANY($1)
      `
      : '';

    const statsResult = statsQuery ? await query(statsQuery, [userIds]) : { rows: [] };
    const statsMap = new Map(statsResult.rows.map((s: any) => [s.user_id, s]));

    // 组装数据
    const users = usersResult.rows.map((user: any) => ({
      ...user,
      stats: statsMap.get(user.id) || null,
    }));

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users - 创建用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      console.error('创建用户失败:', permission.error);
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      username,
      email,
      password,
      fullName,
      role = 'user',
    } = body;

    console.log('创建用户请求:', { username, email, fullName, role });

    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: '用户名、邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 验证角色
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: '角色必须是 admin 或 user' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      console.error('用户名或邮箱已存在');
      return NextResponse.json(
        { error: '用户名或邮箱已存在' },
        { status: 409 }
      );
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    console.log('准备创建用户，密码已哈希');

    // 创建用户
    const userId = `user_${Date.now()}_${generateToken(8)}`;
    const result = await query(
      `INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      [userId, username, email, passwordHash, fullName, role, true]
    );

    const user = result.rows[0];

    console.log('用户创建成功:', user);

    return NextResponse.json({
      success: true,
      data: user,
      message: '用户创建成功',
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}
