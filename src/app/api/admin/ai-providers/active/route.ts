import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 获取当前激活的AI配置
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要管理员权限' } },
        { status: 401 }
      );
    }

    // 查询所有激活的配置
    const result = await query(`
      SELECT
        id,
        provider_name,
        model_name,
        CONCAT(LEFT(api_key, 4), '****', RIGHT(api_key, 4)) as api_key_masked,
        is_active,
        priority,
        created_at,
        updated_at
      FROM ai_providers
      WHERE is_active = TRUE
      ORDER BY priority ASC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
      message: `当前有 ${result.rows.length} 个激活的AI配置`,
    });
  } catch (error: any) {
    console.error('获取激活AI配置失败:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '获取激活AI配置失败' } },
      { status: 500 }
    );
  }
}
