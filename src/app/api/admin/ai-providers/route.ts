import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 获取所有AI配置
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

    // 查询所有AI配置
    const result = await query(`
      SELECT
        id,
        provider_name,
        model_name,
        -- API密钥脱敏，只显示前4位和后4位
        CONCAT(LEFT(api_key, 4), '****', RIGHT(api_key, 4)) as api_key_masked,
        is_active,
        priority,
        config,
        created_at,
        updated_at
      FROM ai_providers
      ORDER BY priority ASC, created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('获取AI配置失败:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '获取AI配置失败' } },
      { status: 500 }
    );
  }
}

// 创建AI配置
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要管理员权限' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider_name, model_name, api_key, priority = 0 } = body;

    // 验证必填字段
    if (!provider_name || !model_name || !api_key) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'provider_name, model_name, api_key 为必填字段' } },
        { status: 400 }
      );
    }

    // 验证 provider_name 是否合法
    const validProviders = ['gemini', 'deepseek', 'kimi', 'openai', 'minimax', 'claude'];
    if (!validProviders.includes(provider_name)) {
      return NextResponse.json(
        { error: { code: 'INVALID_PROVIDER', message: `无效的 provider_name，支持：${validProviders.join(', ')}` } },
        { status: 400 }
      );
    }

    // 检查是否已有激活的配置
    const existingActive = await query(`
      SELECT id FROM ai_providers
      WHERE provider_name = $1 AND is_active = TRUE
    `, [provider_name]);

    const is_active = existingActive.rows.length === 0;

    // 插入新配置
    const result = await query(`
      INSERT INTO ai_providers (provider_name, model_name, api_key, is_active, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, provider_name, model_name, is_active, priority, created_at
    `, [provider_name, model_name, api_key, is_active, priority]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: is_active ? 'AI配置创建并激活成功' : 'AI配置创建成功',
    });
  } catch (error: any) {
    console.error('创建AI配置失败:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '创建AI配置失败' } },
      { status: 500 }
    );
  }
}
