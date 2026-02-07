import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 测试AI配置
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const providerId = parseInt(params.id);
    if (isNaN(providerId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: '无效的配置ID' } },
        { status: 400 }
      );
    }

    // 获取配置
    const result = await query(`
      SELECT id, provider_name, model_name, api_key, config
      FROM ai_providers
      WHERE id = $1
    `, [providerId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '配置不存在' } },
        { status: 404 }
      );
    }

    const provider = result.rows[0];

    // 简单验证：检查必填字段是否完整
    const errors: string[] = [];

    if (!provider.api_key || provider.api_key.trim().length < 5) {
      errors.push('API密钥格式不正确');
    }

    if (!provider.model_name || provider.model_name.trim().length < 1) {
      errors.push('模型名称不能为空');
    }

    const validProviders = ['gemini', 'deepseek', 'kimi', 'openai', 'minimax', 'claude', 'zhipu'];
    if (!validProviders.includes(provider.provider_name)) {
      errors.push(`不支持的AI服务商: ${provider.provider_name}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        valid: false,
        errors: errors,
        message: '配置验证失败'
      });
    }

    // 根据不同服务商进行不同的测试
    let testResult: any = {
      success: true,
      valid: true,
      provider: provider.provider_name,
      model: provider.model_name,
      message: '配置格式验证通过'
    };

    // 尝试简单的API调用测试（可选，这里只做格式验证）
    // 实际生产环境可能需要根据各个服务商的API进行实际的调用测试

    return NextResponse.json(testResult);
  } catch (error: any) {
    console.error('测试AI配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: { code: 'SERVER_ERROR', message: error.message || '测试AI配置失败' }
      },
      { status: 500 }
    );
  }
}
