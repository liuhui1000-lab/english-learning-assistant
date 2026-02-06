import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 更新AI配置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要管理员权限' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { model_name, api_key, priority } = body;

    // 验证配置是否存在
    const existing = await query(`
      SELECT id, provider_name, is_active FROM ai_providers WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'AI配置不存在' } },
        { status: 404 }
      );
    }

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (model_name !== undefined) {
      updates.push(`model_name = $${paramIndex++}`);
      values.push(model_name);
    }

    if (api_key !== undefined) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(api_key);
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_CHANGES', message: '没有提供更新字段' } },
        { status: 400 }
      );
    }

    values.push(id);

    // 更新配置
    const result = await query(`
      UPDATE ai_providers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, provider_name, model_name, is_active, priority, updated_at
    `, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'AI配置更新成功',
    });
  } catch (error: any) {
    console.error('更新AI配置失败:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '更新AI配置失败' } },
      { status: 500 }
    );
  }
}

// 删除AI配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要管理员权限' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 验证配置是否存在
    const existing = await query(`
      SELECT id, is_active FROM ai_providers WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'AI配置不存在' } },
        { status: 404 }
      );
    }

    // 不允许删除激活的配置
    if (existing.rows[0].is_active) {
      return NextResponse.json(
        { error: { code: 'CANNOT_DELETE_ACTIVE', message: '不能删除激活的配置' } },
        { status: 400 }
      );
    }

    // 删除配置
    await query(`
      DELETE FROM ai_providers WHERE id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'AI配置删除成功',
    });
  } catch (error: any) {
    console.error('删除AI配置失败:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '删除AI配置失败' } },
      { status: 500 }
    );
  }
}
