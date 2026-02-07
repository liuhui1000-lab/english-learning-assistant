import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// 测试AI配置
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Test] 开始测试AI配置');

    // 验证管理员权限
    const admin = await verifyAdmin();
    if (!admin) {
      console.log('[Test] 权限验证失败');
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要管理员权限' } },
        { status: 401 }
      );
    }
    console.log('[Test] 权限验证成功');

    const { id } = await params;
    const providerId = parseInt(id);
    console.log('[Test] 测试配置ID:', providerId);

    if (isNaN(providerId)) {
      console.log('[Test] 无效的配置ID');
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
      console.log('[Test] 配置不存在');
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '配置不存在' } },
        { status: 404 }
      );
    }

    const provider = result.rows[0];
    console.log('[Test] 找到配置:', {
      id: provider.id,
      provider_name: provider.provider_name,
      model_name: provider.model_name
    });

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
      console.log('[Test] 验证失败:', errors);
      return NextResponse.json({
        success: false,
        valid: false,
        errors: errors,
        message: '配置验证失败'
      });
    }

    console.log('[Test] 验证通过');

    // 根据不同服务商进行不同的测试
    let testResult = {
      success: true,
      valid: true,
      provider: provider.provider_name,
      model: provider.model_name,
      message: '配置格式验证通过',
      timestamp: new Date().toISOString()
    };

    console.log('[Test] 返回结果:', testResult);

    // 尝试简单的API调用测试（可选，这里只做格式验证）
    // 实际生产环境可能需要根据各个服务商的API进行实际的调用测试

    return NextResponse.json(testResult);
  } catch (error: any) {
    console.error('[Test] 测试AI配置失败:', error);
    console.error('[Test] 错误详情:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
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
