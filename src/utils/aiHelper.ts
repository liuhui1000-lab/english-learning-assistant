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
    timeout?: number;  // 添加超时参数
    batchSize?: number;  // 批次大小（字符数）
  } = {}
): Promise<{ success: boolean; words: ParsedWord[]; error?: string }> {
  const {
    includeExamples = false,
    maxTokens = 4000,
    timeout = 25000,  // 默认 25 秒超时
    batchSize = 8000  // 每批次 8000 字符
  } = options;

  console.log('[AI] 开始解析单词，文本长度:', text.length);

  // 如果文本过长，分批处理
  if (text.length > batchSize) {
    console.log('[AI] 文本过长，启用分批处理模式');
    return await parseWordsWithBatches(text, {
      includeExamples,
      maxTokens,
      timeout,
      batchSize
    });
  }

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

    // 也要更新 Gemini 的文本
    if (provider.provider_name === 'gemini') {
      payload.contents[1].parts[0].text = `\n\n要解析的文本：\n${text}`;
    } else if (provider.provider_name === 'claude') {
      payload.messages[0].content = `请解析以下文本中的单词：\n\n${text}`;
    } else if (provider.provider_name === 'minimax') {
      payload.messages[0].text = `${systemPrompt}\n\n要解析的文本：\n${text}`;
    }

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    console.log('[AI] 发送请求到:', apiConfig.url, '超时设置:', timeout, 'ms');
    const startTime = Date.now();

    const response = await fetch(apiConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers(provider.api_key)
      },
      body: JSON.stringify(payload),
      signal: controller.signal  // 添加超时信号
    });

    clearTimeout(timeoutId);  // 清除超时定时器

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

    // 检查是否是超时错误
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('abort')) {
        return {
          success: false,
          words: [],
          error: 'AI 调用超时，请尝试使用更快的 AI 服务商或减少文本长度'
        };
      }
    }

    return {
      success: false,
      words: [],
      error: error instanceof Error ? error.message : '解析过程出错'
    };
  }
}

/**
 * 分批解析大文本
 * 将文本分成多个批次，每批次分别调用 AI 解析
 */
async function parseWordsWithBatches(
  text: string,
  options: {
    includeExamples?: boolean;
    maxTokens?: number;
    timeout?: number;
    batchSize?: number;
  }
): Promise<{ success: boolean; words: ParsedWord[]; error?: string }> {
  const { batchSize = 8000, timeout = 25000, maxTokens = 4000, includeExamples = false } = options;

  console.log('[AI-分批] 开始分批处理，总文本长度:', text.length, '批次大小:', batchSize);

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  console.log('[AI-分批] 分割出', paragraphs.length, '个段落');

  const batches: string[] = [];
  let currentBatch = '';

  for (const paragraph of paragraphs) {
    if (currentBatch.length + paragraph.length > batchSize && currentBatch.length > 0) {
      batches.push(currentBatch.trim());
      currentBatch = '';
    }
    currentBatch += (currentBatch ? '\n\n' : '') + paragraph;
  }

  if (currentBatch.trim().length > 0) {
    batches.push(currentBatch.trim());
  }

  console.log('[AI-分批] 分成', batches.length, '个批次');

  const provider = await getActiveAIProvider();
  if (!provider) {
    return { success: false, words: [], error: '没有可用的 AI 配置' };
  }

  const apiConfig = API_ENDPOINTS[provider.provider_name];
  if (!apiConfig) {
    return { success: false, words: [], error: `不支持的 AI 提供商` };
  }

  const allWords: ParsedWord[] = [];
  const seenWords = new Set<string>();

  for (let i = 0; i < batches.length; i++) {
    console.log(`[AI-分批] 处理第 ${i + 1}/${batches.length} 个批次`);

    try {
      const words = await parseSingleBatch(
        provider,
        apiConfig,
        batches[i],
        includeExamples,
        maxTokens,
        timeout,
        provider.provider_name
      );

      for (const word of words) {
        if (!seenWords.has(word.word)) {
          seenWords.add(word.word);
          allWords.push(word);
        }
      }
    } catch (error) {
      console.error(`[AI-分批] 批次 ${i + 1} 解析失败:`, error);
    }
  }

  console.log('[AI-分批] 完成，共解析到', allWords.length, '个唯一单词');

  return {
    success: allWords.length > 0,
    words: allWords,
    error: allWords.length === 0 ? '所有批次都解析失败' : undefined
  };
}

/**
 * 解析单个批次
 */
async function parseSingleBatch(
  provider: AIProvider,
  apiConfig: any,
  text: string,
  includeExamples: boolean,
  maxTokens: number,
  timeout: number,
  providerName: string
): Promise<ParsedWord[]> {
  const systemPrompt = includeExamples 
    ? '从文本中提取所有英语单词，输出JSON：{"words":[{"word":"小写","pronunciation":"","partOfSpeech":"","definition":"","example":"","exampleTranslation":""}]}'
    : '从文本中提取所有英语单词，输出JSON：{"words":[{"word":"小写","pronunciation":"","partOfSpeech":"","definition":"","example":"","exampleTranslation":""}]}';

  let payload: any;

  if (providerName === 'gemini') {
    payload = {
      contents: [{ parts: [{ text: systemPrompt }, { text: text }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 }
    };
  } else if (providerName === 'claude') {
    payload = {
      model: provider.model_name,
      max_tokens: maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }]
    };
  } else if (providerName === 'minimax') {
    payload = {
      model: provider.model_name,
      tokens_to_generate: maxTokens,
      temperature: 0.3,
      messages: [{ sender_type: 'USER', sender_name: 'User', text: systemPrompt + text }]
    };
  } else {
    payload = {
      model: provider.model_name,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
      max_tokens: maxTokens,
      temperature: 0.3,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(apiConfig.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...apiConfig.headers(provider.api_key) },
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`AI 调用失败 (${response.status})`);
  }

  const responseData = await response.json();

  let responseText = '';
  if (providerName === 'gemini') {
    responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (providerName === 'claude') {
    responseText = responseData.content?.[0]?.text || '';
  } else if (providerName === 'minimax') {
    responseText = responseData.choices?.[0]?.messages?.[0]?.text || '';
  } else {
    responseText = responseData.choices?.[0]?.message?.content || '';
  }

  if (!responseText) {
    throw new Error('AI 返回的内容为空');
  }

  responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed: { words: ParsedWord[] };
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 返回格式不正确');
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  if (!parsed.words || !Array.isArray(parsed.words)) {
    throw new Error('AI 返回格式不正确');
  }

  return parsed.words
    .map((w: any) => ({
      word: w.word?.toLowerCase()?.trim() || '',
      pronunciation: w.pronunciation || '',
      partOfSpeech: w.partOfSpeech || '',
      definition: w.definition || '',
      example: w.example || '',
      exampleTranslation: w.exampleTranslation || ''
    }))
    .filter((w: ParsedWord) => w.word.length > 0);
}
