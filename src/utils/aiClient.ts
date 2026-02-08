/**
 * 统一AI调用工具类
 * 支持多个AI服务（Gemini、DeepSeek、Kimi、OpenAI、MiniMax、Claude）
 */

import { getDb } from '@/utils/db';

interface AIProvider {
  id: number;
  provider_name: string;
  model_name: string;
  api_key: string;
  is_active: boolean;
  priority: number;
  config?: any;
}

interface AIResponse {
  success: boolean;
  content?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: {
    code: string;
    message: string;
    isQuotaError?: boolean;
    userMessage?: string;
    retryAfter?: string;
    details?: any;
  };
}

interface AIStreamResponse {
  content: string;
  done: boolean;
  error?: any;
}

/**
 * 从数据库获取当前激活的AI配置
 */
async function getActiveProvider(): Promise<AIProvider | null> {
  try {
    const db = await getDb();
    const result = await db.execute(`
      SELECT id, provider_name, model_name, api_key, is_active, priority, config
      FROM ai_providers
      WHERE is_active = TRUE
      ORDER BY priority ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.error('没有激活的AI配置');
      return null;
    }

    return result.rows[0] as unknown as AIProvider;
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return null;
  }
}

/**
 * 调用 Gemini API
 */
async function callGemini(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();

      // 处理速率限制
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: error.error?.message || 'Gemini API 配额已用完',
            isQuotaError: true,
            userMessage: 'Gemini API 配额已用完，请稍后重试或切换AI服务',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'Gemini API 调用失败',
        },
      };
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'Gemini API 返回空内容',
        },
      };
    }

    const content = data.candidates[0].content.parts[0].text;

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error: any) {
    console.error('调用 Gemini API 失败:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || '网络错误',
      },
    };
  }
}

/**
 * 调用 DeepSeek API
 */
async function callDeepSeek(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // 处理速率限制
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: error.error?.message || 'DeepSeek API 配额已用完',
            isQuotaError: true,
            userMessage: 'DeepSeek API 配额已用完，请稍后重试或切换AI服务',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'DeepSeek API 调用失败',
        },
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'DeepSeek API 返回空内容',
        },
      };
    }

    const content = data.choices[0].message.content;

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    console.error('调用 DeepSeek API 失败:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || '网络错误',
      },
    };
  }
}

/**
 * 调用 Kimi API
 */
async function callKimi(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // 处理速率限制
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: error.error?.message || 'Kimi API 配额已用完',
            isQuotaError: true,
            userMessage: 'Kimi API 配额已用完，请稍后重试或切换AI服务',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'Kimi API 调用失败',
        },
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'Kimi API 返回空内容',
        },
      };
    }

    const content = data.choices[0].message.content;

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    console.error('调用 Kimi API 失败:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || '网络错误',
      },
    };
  }
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // 处理速率限制
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: error.error?.message || 'OpenAI API 配额已用完',
            isQuotaError: true,
            userMessage: 'OpenAI API 配额已用完，请稍后重试或切换AI服务',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'OpenAI API 调用失败',
        },
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'OpenAI API 返回空内容',
        },
      };
    }

    const content = data.choices[0].message.content;

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    console.error('调用 OpenAI API 失败:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || '网络错误',
      },
    };
  }
}

/**
 * 调用 MiniMax API
 */
async function callMiniMax(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // 处理速率限制
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: error.error?.message || 'MiniMax API 配额已用完',
            isQuotaError: true,
            userMessage: 'MiniMax API 配额已用完，请稍后重试或切换AI服务',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'MiniMax API 调用失败',
        },
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'MiniMax API 返回空内容',
        },
      };
    }

    const content = data.choices[0].messages[0].text || data.choices[0].text;

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    console.error('调用 MiniMax API 失败:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || '网络错误',
      },
    };
  }
}

/**
 * 调用 Claude API
 */
async function callClaude(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // 处理速率限制
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: error.error?.message || 'Claude API 配额已用完',
            isQuotaError: true,
            userMessage: 'Claude API 配额已用完，请稍后重试或切换AI服务',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'Claude API 调用失败',
        },
      };
    }

    const data = await response.json();

    if (!data.content || data.content.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'Claude API 返回空内容',
        },
      };
    }

    const content = data.content[0].text;

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  } catch (error: any) {
    console.error('调用 Claude API 失败:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || '网络错误',
      },
    };
  }
}

/**
 * 统一调用接口（自动选择激活的AI服务）
 */
export async function callAI(prompt: string): Promise<AIResponse> {
  // 获取当前激活的AI配置
  const provider = await getActiveProvider();

  if (!provider) {
    return {
      success: false,
      error: {
        code: 'NO_PROVIDER',
        message: '没有激活的AI配置',
        userMessage: '系统未配置AI服务，请联系管理员',
      },
    };
  }

  console.log(`使用 ${provider.provider_name} (${provider.model_name}) 进行调用`);

  // 根据provider_name调用对应的API
  let response: AIResponse;

  switch (provider.provider_name) {
    case 'gemini':
      response = await callGemini(prompt, provider.api_key, provider.model_name);
      break;
    case 'deepseek':
      response = await callDeepSeek(prompt, provider.api_key, provider.model_name);
      break;
    case 'kimi':
      response = await callKimi(prompt, provider.api_key, provider.model_name);
      break;
    case 'openai':
      response = await callOpenAI(prompt, provider.api_key, provider.model_name);
      break;
    case 'minimax':
      response = await callMiniMax(prompt, provider.api_key, provider.model_name);
      break;
    case 'claude':
      response = await callClaude(prompt, provider.api_key, provider.model_name);
      break;
    default:
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_PROVIDER',
          message: `不支持的AI服务: ${provider.provider_name}`,
        },
      };
  }

  return response;
}

/**
 * 带重试的调用（指数退避）
 */
export async function callAIWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<AIResponse> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await callAI(prompt);

    if (response.success) {
      return response;
    }

    // 如果是配额错误，直接返回，不重试
    if (response.error?.isQuotaError) {
      return response;
    }

    // 如果是网络错误，重试
    if (response.error?.code === 'NETWORK_ERROR') {
      console.log(`网络错误，第 ${attempt + 1}/${maxRetries} 次重试...`);
      lastError = response.error;

      // 指数退避
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
      continue;
    }

    // 其他错误直接返回
    return response;
  }

  return {
    success: false,
    error: {
      code: 'MAX_RETRIES_EXCEEDED',
      message: '重试次数已达上限',
      details: lastError,
    },
  };
}

/**
 * 流式调用（DeepSeek、Kimi、OpenAI 支持）
 */
export async function* callAIStream(
  prompt: string
): AsyncGenerator<AIStreamResponse, void, unknown> {
  const provider = await getActiveProvider();

  if (!provider) {
    yield {
      content: '',
      done: true,
      error: {
        code: 'NO_PROVIDER',
        message: '没有激活的AI配置',
        userMessage: '系统未配置AI服务，请联系管理员',
      },
    };
    return;
  }

  console.log(`使用 ${provider.provider_name} (${provider.model_name}) 进行流式调用`);

  // 目前只有 DeepSeek、Kimi、OpenAI、MiniMax、Claude 支持流式
  if (provider.provider_name !== 'deepseek' &&
      provider.provider_name !== 'kimi' &&
      provider.provider_name !== 'openai' &&
      provider.provider_name !== 'minimax' &&
      provider.provider_name !== 'claude') {
    // 非流式AI服务，先调用完整接口，然后逐字输出
    const response = await callAI(prompt);

    if (!response.success || !response.content) {
      yield {
        content: '',
        done: true,
        error: response.error,
      };
      return;
    }

    const content = response.content;
    for (let i = 0; i < content.length; i++) {
      yield {
        content: content.slice(0, i + 1),
        done: false,
      };
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    yield {
      content,
      done: true,
    };
    return;
  }

  try {
    const baseUrl =
      provider.provider_name === 'deepseek'
        ? 'https://api.deepseek.com/chat/completions'
        : provider.provider_name === 'kimi'
        ? 'https://api.moonshot.cn/v1/chat/completions'
        : provider.provider_name === 'minimax'
        ? 'https://api.minimax.chat/v1/text/chatcompletion_v2'
        : provider.provider_name === 'claude'
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.openai.com/v1/chat/completions';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.provider_name === 'claude') {
      headers['x-api-key'] = provider.api_key;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${provider.api_key}`;
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.model_name,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      yield {
        content: '',
        done: true,
        error: {
          code: 'API_ERROR',
          message: error.error?.message || 'API 调用失败',
        },
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield {
        content: '',
        done: true,
        error: {
          code: 'NO_READER',
          message: '无法读取响应流',
        },
      };
      return;
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            yield {
              content: fullContent,
              done: true,
            };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              yield {
                content: fullContent,
                done: false,
              };
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    yield {
      content: fullContent,
      done: true,
    };
  } catch (error: any) {
    yield {
      content: '',
      done: true,
      error: {
        code: 'STREAM_ERROR',
        message: error.message || '流式调用失败',
      },
    };
  }
}
