/**
 * 题库版本操作API
 * GET    /api/admin/library/versions/:id   - 获取版本详情
 * PUT    /api/admin/library/versions/:id   - 更新版本信息
 * DELETE /api/admin/library/versions/:id   - 删除版本
 * POST   /api/admin/library/versions/:id/activate - 激活版本
 * GET    /api/admin/library/versions/:id/export - 导出版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/admin/library/versions/:id - 获取版本详情
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

    const { id: versionId } = await context.params;

    // 查询版本信息
    const versionResult = await query(
      'SELECT * FROM library_version_list WHERE id = $1',
      [versionId]
    );

    if (versionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    const version = versionResult.rows[0];

    // 根据题库类型查询题目列表
    let itemsResult;
    switch (version.library_type) {
      case 'word':
        itemsResult = await query(
          'SELECT * FROM words WHERE version_id = $1 ORDER BY word',
          [versionId]
        );
        break;
      // 其他题库类型...
      default:
        itemsResult = { rows: [] };
    }

    return NextResponse.json({
      success: true,
      data: {
        version,
        items: itemsResult.rows,
        itemCount: itemsResult.rows.length,
      },
    });
  } catch (error) {
    console.error('获取版本详情失败:', error);
    return NextResponse.json(
      { error: '获取版本详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/library/versions/:id - 更新版本信息
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

    const { id: versionId } = await context.params;
    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json(
        { error: '描述为必填项' },
        { status: 400 }
      );
    }

    // 更新版本信息
    const result = await query(
      'UPDATE library_versions SET description = $1 WHERE id = $2 RETURNING *',
      [description, versionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '版本信息更新成功',
    });
  } catch (error) {
    console.error('更新版本信息失败:', error);
    return NextResponse.json(
      { error: '更新版本信息失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/library/versions/:id - 删除版本
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

    const { id: versionId } = await context.params;

    // 检查是否为激活版本
    const versionResult = await query(
      'SELECT is_active FROM library_versions WHERE id = $1',
      [versionId]
    );

    if (versionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    if (versionResult.rows[0].is_active) {
      return NextResponse.json(
        { error: '无法删除激活的版本，请先激活其他版本' },
        { status: 400 }
      );
    }

    // 删除版本（会级联删除相关题目）
    const result = await query(
      'DELETE FROM library_versions WHERE id = $1 RETURNING *',
      [versionId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '版本删除成功',
    });
  } catch (error) {
    console.error('删除版本失败:', error);
    return NextResponse.json(
      { error: '删除版本失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/versions/:id/activate - 激活版本
 */
export async function POST(
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

    const versionId = (await context.params).id;

    // 查询版本信息
    const versionResult = await query(
      'SELECT library_type, version FROM library_versions WHERE id = $1',
      [versionId]
    );

    if (versionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    const version = versionResult.rows[0];

    // 激活版本（使用数据库函数）
    await query(
      'SELECT activate_library_version($1, $2, $3)',
      [version.library_type, version.version, permission.userId]
    );

    // 记录变更
    await query(
      'SELECT record_version_changes($1, $2)',
      [version.library_type, version.version]
    );

    return NextResponse.json({
      success: true,
      message: '版本激活成功',
    });
  } catch (error: any) {
    console.error('激活版本失败:', error);
    return NextResponse.json(
      { error: error.message || '激活版本失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/library/versions/:id/export - 导出版本
 */
export async function GET_export(
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

    const versionId = (await context.params).id;

    // 查询版本信息
    const versionResult = await query(
      'SELECT * FROM library_versions WHERE id = $1',
      [versionId]
    );

    if (versionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    const version = versionResult.rows[0];

    // 根据题库类型查询题目
    let itemsResult;
    switch (version.library_type) {
      case 'word':
        itemsResult = await query(
          'SELECT word, meaning, phonetic, example, category, difficulty FROM words WHERE version_id = $1',
          [versionId]
        );
        break;
      // 其他题库类型...
      default:
        itemsResult = { rows: [] };
    }

    // 生成JSON数据
    const exportData = {
      version: version.version,
      libraryType: version.library_type,
      description: version.description,
      exportedAt: new Date().toISOString(),
      items: itemsResult.rows,
    };

    // 返回JSON文件
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${version.library_type}-${version.version}.json"`,
      },
    });
  } catch (error) {
    console.error('导出版本失败:', error);
    return NextResponse.json(
      { error: '导出版本失败' },
      { status: 500 }
    );
  }
}
