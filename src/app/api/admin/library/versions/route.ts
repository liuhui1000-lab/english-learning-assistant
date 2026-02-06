/**
 * 题库版本管理API
 * GET    /api/admin/library/versions       - 获取所有题库版本
 * POST   /api/admin/library/versions       - 创建新版本
 * PUT    /api/admin/library/versions/:id   - 更新版本信息
 * DELETE /api/admin/library/versions/:id   - 删除版本
 * POST   /api/admin/library/versions/:id/activate - 激活版本
 * GET    /api/admin/library/versions/:id/export - 导出版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';

/**
 * GET /api/admin/library/versions - 获取所有题库版本
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const libraryType = searchParams.get('libraryType');

    // 构建查询条件
    let whereClause = '';
    const params: any[] = [];

    if (libraryType) {
      whereClause = 'WHERE library_type = $1';
      params.push(libraryType);
    }

    // 查询版本列表
    const result = await query(
      `SELECT * FROM library_version_list
       ${whereClause}
       ORDER BY library_type, created_at DESC`,
      params
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('获取题库版本失败:', error);
    return NextResponse.json(
      { error: '获取题库版本失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/versions - 创建新版本
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      libraryType, // 'word' | 'grammar' | 'phrase' | 'reading'
      version,
      description,
    } = body;

    // 验证必填字段
    if (!libraryType || !version) {
      return NextResponse.json(
        { error: '题库类型和版本号为必填项' },
        { status: 400 }
      );
    }

    // 检查版本是否已存在
    const existingVersion = await query(
      'SELECT id FROM library_versions WHERE library_type = $1 AND version = $2',
      [libraryType, version]
    );

    if (existingVersion.rows.length > 0) {
      return NextResponse.json(
        { error: '该版本已存在' },
        { status: 409 }
      );
    }

    // 创建版本
    const result = await query(
      `INSERT INTO library_versions (library_type, version, description, created_by, is_active)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [libraryType, version, description, permission.userId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '版本创建成功',
    });
  } catch (error) {
    console.error('创建版本失败:', error);
    return NextResponse.json(
      { error: '创建版本失败' },
      { status: 500 }
    );
  }
}
