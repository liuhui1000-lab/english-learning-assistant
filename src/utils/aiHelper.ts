/**
 * AI 调用助手工具
 * 复用现有的 AI 提供商配置系统
 */

import { query } from '@/utils/db';

export interface AIProvider {
  id: number;
  provider_name: string;
  model_name: string;
  api_key: string;
  config?: any;
}

export interface ParsedWord {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleTranslation: string;
}

/**
 * 获取激活的 AI 配置
 */
export async function getActiveAIProvider(): Promise<AIProvider | null> {
  try {
    const result = await query(`
      SELECT id, provider_name, model_name, api_key, config
      FROM ai_providers
      WHERE is_active = TRUE
      ORDER BY priority ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.warn('[AI] 没有找到激活的 AI 配置');
      return null;
    }

    return result.rows[0] as AIProvider;
  } catch (error) {
    console.error('[AI] 获取 AI 配置失败:', error);
    return null;
  }
}

/**
 * AI 服务商 API 端点配置
 */
const API_ENDPOINTS: Record<string, any> = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  kimi: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    headers: (apiKey: string) => ({ 'x-goog-api-key': apiKey }),
  },
  minimax: {
    url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }),
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
  }
};

/**
 * 调用 AI 进行智能单词解析
 * @param text - 要解析的文本
 * @param options - 解析选项
 */
export async function parseWordsWithAI(
  text: string,
  options: {
    includeExamples?: boolean;
    maxTokens?: number;
  } = {}
): Promise<{ success: boolean; words: ParsedWord[]; error?: string }> {
  const { includeExamples = false, maxTokens = 4000 } = options;

  console.log('[AI] 开始解析单词，文本长度:', text.length);

  // 获取 AI 配置
  const provider = await getActiveAIProvider();
  if (!provider) {
    console.error('[AI] 没有可用的 AI 配置');
    return {
      success: false,
      words: [],
      error: '没有可用的 AI 配置，请先配置 AI 提供商'
    };
  }

  console.log('[AI] 使用 AI 提供商:', provider.provider_name, provider.model_name);

  const apiConfig = API_ENDPOINTS[provider.provider_name];
  if (!apiConfig) {
    console.error('[AI] 不支持的 AI 提供商:', provider.provider_name);
    return {
      success: false,
      words: [],
      error: `不支持的 AI 提供商: ${provider.provider_name}`
    };
  }

  // 构建系统提示词
  const exampleInstruction = includeExamples
    ? '（如果文本中有则提取，没有则生成一个简单例句）'
    : '（留空字符串）';
  const translationInstruction = includeExamples
    ? '（如果有例句则翻译，没有则留空字符串）'
    : '（留空字符串）';

  const systemPrompt = `你是一个专业的英语单词解析助手。请从给定的文本中提取所有英语单词及其相关信息。

重要规则：
1. 提取所有独立的英语单词（不在其他单词内部）
2. 忽略纯中文内容
3. 支持任意格式：列表、表格、段落、混合格式
4. 识别并处理各种分隔符（逗号、顿号、冒号、横线、空格、制表符等）
5. 每个单词只提取一次

输出格式（必须是有效的 JSON）：
{
  "words": [
    {
      "word": "单词（小写）",
      "pronunciation": "音标字符串（如 /ədˈventʃər/，如果没有则为空字符串）",
      "partOfSpeech": "词性（如 n.、v.、adj.、adv. 等，如果没有则为空字符串）",
      "definition": "中文词义",
      "example": "英文例句句子${exampleInstruction}",
      "exampleTranslation": "例句中文翻译${translationInstruction}"
    }
  ]
}

注意事项：
- 输出必须是纯 JSON 格式，不要包含任何其他文本
- word 字段必须是小写
- 如果信息缺失，使用空字符串 "" 而不是 null 或 undefined
- 只返回 JSON 对象，不要添加 \`\`\`json 标记或其他格式`;

  try {
    // 构建请求 payload
    let payload: any;

    if (provider.provider_name === 'gemini') {
      // Gemini 特殊格式
      payload = {
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: `\n\n要解析的文本：\n${text}` }
          ]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
        }
      };
    } else if (provider.provider_name === 'claude') {
      // Claude 特殊格式
      payload = {
        model: provider.model_name,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `请解析以下文本中的单词：\n\n${text}` }
        ]
      };
    } else if (provider.provider_name === 'minimax') {
      // MiniMax 特殊格式
      payload = {
        model: provider.model_name,
        tokens_to_generate: maxTokens,
        temperature: 0.3,
        messages: [
          { sender_type: 'USER', sender_name: 'User', text: `${systemPrompt}\n\n要解析的文本：\n${text}` }
        ]
      };
    } else {
      // OpenAI 兼容格式（OpenAI, DeepSeek, Kimi, Zhipu）
      payload = {
        model: provider.model_name,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请解析以下文本中的单词：\n\n${text}` }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      };
    }

    console.log('[AI] 发送请求到:', apiConfig.url);
    const startTime = Date.now();

    const response = await fetch(apiConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers(provider.api_key)
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    console.log('[AI] API 响应时间:', duration, 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] API 调用失败:', response.status, errorText);
      return {
        success: false,
        words: [],
        error: `AI 调用失败 (${response.status}): ${errorText.substring(0, 200)}`
      };
    }

    const responseData = await response.json();
    console.log('[AI] API 响应成功');

    // 解析响应
    let responseText = '';

    if (provider.provider_name === 'gemini') {
      responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider.provider_name === 'claude') {
      responseText = responseData.content?.[0]?.text || '';
    } else if (provider.provider_name === 'minimax') {
      responseText = responseData.choices?.[0]?.messages?.[0]?.text || '';
    } else {
      responseText = responseData.choices?.[0]?.message?.content || '';
    }

    console.log('[AI] 原始响应（前500字符）:', responseText.substring(0, 500));

    if (!responseText) {
      console.error('[AI] AI 返回的内容为空');
      return {
        success: false,
        words: [],
        error: 'AI 返回的内容为空'
      };
    }

    // 清理响应文本（移除可能的 markdown 标记）
    responseText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    console.log('[AI] 清理后的响应（前500字符）:', responseText.substring(0, 500));

    // 解析 JSON
    let parsed: { words: ParsedWord[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      console.error('[AI] JSON 解析失败:', error);
      console.error('[AI] 响应内容:', responseText);

      // 尝试提取 JSON 部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log('[AI] 通过正则提取 JSON 成功');
        } catch (e2) {
          console.error('[AI] 正则提取 JSON 也失败');
          return {
            success: false,
            words: [],
            error: 'AI 返回的格式不正确，无法解析为 JSON'
          };
        }
      } else {
        return {
          success: false,
          words: [],
          error: 'AI 返回的格式不正确，无法解析为 JSON'
        };
      }
    }

    if (!parsed.words || !Array.isArray(parsed.words)) {
      console.error('[AI] AI 返回的数据格式不正确', parsed);
      return {
        success: false,
        words: [],
        error: 'AI 返回的数据格式不正确：缺少 words 数组'
      };
    }

    console.log('[AI] 成功解析', parsed.words.length, '个单词');

    // 标准化单词数据
    const normalizedWords = parsed.words.map((w: any) => ({
      word: w.word ? w.word.toLowerCase().trim() : '',
      pronunciation: w.pronunciation || '',
      partOfSpeech: w.partOfSpeech || '',
      definition: w.definition || '',
      example: w.example || '',
      exampleTranslation: w.exampleTranslation || ''
    })).filter((w: ParsedWord) => w.word.length > 0);

    console.log('[AI] 标准化后剩余', normalizedWords.length, '个有效单词');

    return {
      success: true,
      words: normalizedWords
    };

  } catch (error) {
    console.error('[AI] 解析过程出错:', error);
    return {
      success: false,
      words: [],
      error: error instanceof Error ? error.message : '解析过程出错'
    };
  }
}
