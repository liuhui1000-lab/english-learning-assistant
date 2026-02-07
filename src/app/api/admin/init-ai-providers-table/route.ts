import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 初始化ai_providers表
export async function POST(request: NextRequest) {
  try {
    console.log('[Init] 开始初始化ai_providers表');

    // 验证管理员权限
    const admin = await verifyAdmin();
    if (!admin) {
      console.log('[Init] 权限验证失败');
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要管理员权限' } },
        { status: 401 }
      );
    }
    console.log('[Init] 权限验证成功:', admin.username);

    // 创建ai_providers表
    console.log('[Init] 创建ai_providers表...');
    await query(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id SERIAL PRIMARY KEY,
        provider_name VARCHAR(50) NOT NULL,
        model_name VARCHAR(100) NOT NULL,
        api_key TEXT NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        priority INTEGER DEFAULT 0,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT unique_active_provider UNIQUE (provider_name, is_active)
          WHERE is_active = TRUE
      );
    `);
    console.log('[Init] ai_providers表创建成功');

    // 创建索引
    console.log('[Init] 创建索引...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_name ON ai_providers(provider_name);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_priority ON ai_providers(priority);
    `);
    console.log('[Init] 索引创建成功');

    // 创建更新时间触发器
    console.log('[Init] 创建触发器函数...');
    await query(`
      CREATE OR REPLACE FUNCTION update_ai_providers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await query(`
      DROP TRIGGER IF EXISTS trigger_update_ai_providers_updated_at ON ai_providers;
    `);

    console.log('[Init] 创建触发器...');
    await query(`
      CREATE TRIGGER trigger_update_ai_providers_updated_at
        BEFORE UPDATE ON ai_providers
        FOR EACH ROW
        EXECUTE FUNCTION update_ai_providers_updated_at();
    `);
    console.log('[Init] 触发器创建成功');

    console.log('[Init] 初始化完成');
    return NextResponse.json({
      success: true,
      message: 'ai_providers表初始化成功'
    });
  } catch (error: any) {
    console.error('[Init] 初始化ai_providers表失败:', error);
    console.error('[Init] 错误详情:', {
      message: error?.message,
      code: error?.code,
      constraint: error?.constraint,
      table: error?.table,
      detail: error?.detail,
      stack: error?.stack
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error?.message || '初始化ai_providers表失败',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }
      },
      { status: 500 }
    );
  }
}
