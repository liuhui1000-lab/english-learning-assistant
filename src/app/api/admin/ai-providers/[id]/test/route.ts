import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/auth';
import { query } from '@/utils/db';

// AI服务商API端点配置
const API_ENDPOINTS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    testPayload: {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    }
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    testPayload: {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    }
  },
  kimi: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    testPayload: {
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    }
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    headers: (apiKey: string) => ({ 'x-goog-api-key': apiKey }),
    testPayload: {
      contents: [{ parts: [{ text: 'Hi' }] }]
    }
  },
  minimax: {
    url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    testPayload: {
      model: 'abab6.5s-chat',
      messages: [{ sender_type: 'USER', sender_name: 'User', text: 'Hi' }],
      tokens_to_generate: 5
    }
  },
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }),
    testPayload: {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    }
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    testPayload: {
      model: 'glm-4',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    }
  }
};

// 测试AI配置（真实API调用）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Test] 开始测试AI配置（真实API）');

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

    // 格式验证
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
      console.log('[Test] 格式验证失败:', errors);
      return NextResponse.json({
        success: false,
        valid: false,
        errors: errors,
        message: '配置验证失败',
        testType: 'format'
      });
    }

    console.log('[Test] 格式验证通过，开始API调用测试');

    // 真实API调用测试
    const apiConfig = API_ENDPOINTS[provider.provider_name as keyof typeof API_ENDPOINTS];

    if (!apiConfig) {
      console.log('[Test] 不支持的AI服务商:', provider.provider_name);
      return NextResponse.json({
        success: false,
        valid: false,
        message: `不支持的AI服务商: ${provider.provider_name}`,
        testType: 'api'
      });
    }

    try {
      console.log('[Test] 发送API请求到:', apiConfig.url);

      // 构建测试payload（使用配置中的模型名）
      let testPayload = apiConfig.testPayload;

      // 如果是OpenAI兼容的API，使用用户配置的模型
      if (['openai', 'deepseek', 'kimi', 'zhipu'].includes(provider.provider_name)) {
        testPayload = {
          ...testPayload,
          model: provider.model_name,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        };
      }

      const startTime = Date.now();
      const response = await fetch(apiConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiConfig.headers(provider.api_key)
        },
        body: JSON.stringify(testPayload)
      });

      const duration = Date.now() - startTime;
      console.log('[Test] API响应时间:', duration, 'ms');

      const responseData = await response.json();
      console.log('[Test] API响应状态:', response.status);
      console.log('[Test] API响应数据:', JSON.stringify(responseData).substring(0, 200));

      // 检查响应状态
      if (!response.ok) {
        const errorMsg = responseData.error?.message || responseData.error || 'API调用失败';

        // 判断具体的错误类型
        let errorType = 'UNKNOWN';
        if (response.status === 401 || response.status === 403) {
          errorType = 'AUTH_FAILED';
        } else if (response.status === 404) {
          errorType = 'MODEL_NOT_FOUND';
        } else if (response.status === 429) {
          errorType = 'RATE_LIMIT';
        } else if (responseData.error?.type === 'invalid_request_error') {
          errorType = 'INVALID_REQUEST';
        }

        console.log('[Test] API调用失败，错误类型:', errorType);

        return NextResponse.json({
          success: false,
          valid: false,
          message: 'API调用失败',
          errorType,
          errorMessage: errorMsg,
          statusCode: response.status,
          duration,
          testType: 'api'
        });
      }

      // API调用成功
      console.log('[Test] API调用成功');

      // 尝试提取响应内容
      let content = '';
      try {
        if (responseData.choices?.[0]?.message?.content) {
          // OpenAI格式
          content = responseData.choices[0].message.content;
        } else if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
          // Gemini格式
          content = responseData.candidates[0].content.parts[0].text;
        } else if (responseData.content?.[0]?.text) {
          // MiniMax格式
          content = responseData.content[0].text;
        }
      } catch (e) {
        console.log('[Test] 无法提取响应内容:', e);
      }

      return NextResponse.json({
        success: true,
        valid: true,
        message: 'API连接成功',
        provider: provider.provider_name,
        model: provider.model_name,
        responsePreview: content || '连接成功但无法解析响应',
        statusCode: response.status,
        duration,
        testType: 'api'
      });

    } catch (error: any) {
      console.error('[Test] API调用异常:', error);

      let errorMessage = error.message || '网络错误';
      let errorType = 'NETWORK_ERROR';

      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        errorType = 'CONNECTION_FAILED';
      } else if (error.message?.includes('timeout')) {
        errorType = 'TIMEOUT';
      }

      return NextResponse.json({
        success: false,
        valid: false,
        message: 'API连接失败',
        errorType,
        errorMessage,
        testType: 'api'
      });
    }
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
