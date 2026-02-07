import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 初始化ai_providers表
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

    // 创建ai_providers表
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

    // 创建索引
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_name ON ai_providers(provider_name);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_priority ON ai_providers(priority);
    `);

    // 创建更新时间触发器
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

    await query(`
      CREATE TRIGGER trigger_update_ai_providers_updated_at
        BEFORE UPDATE ON ai_providers
        FOR EACH ROW
        EXECUTE FUNCTION update_ai_providers_updated_at();
    `);

    return NextResponse.json({
      success: true,
      message: 'ai_providers表初始化成功'
    });
  } catch (error: any) {
    console.error('初始化ai_providers表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || '初始化ai_providers表失败' }
      },
      { status: 500 }
    );
  }
}
