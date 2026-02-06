/**
 * Gemini 1.5 Flash 集成工具函数
 * 用于批量分析错题、提取知识点、生成深度分析报告
 */

// Gemini API 配置
const GEMINI_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-1.5-flash-latest',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  batchSize: 10,  // 每批10题
  requestDelay: 4000,  // 请求间隔4秒（满足15次/分钟限制）
  maxRetries: 3,  // 失败重试3次
  temperature: 0.1,  // 降低随机性
  maxOutputTokens: 2048,  // 限制输出token
};

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用 Gemini API（带重试）
 */
export async function callGemini(prompt: string, options?: {
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const retryCount = 0;
  const maxRetries = GEMINI_CONFIG.maxRetries;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(
        `${GEMINI_CONFIG.baseUrl}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options?.temperature ?? GEMINI_CONFIG.temperature,
              maxOutputTokens: options?.maxOutputTokens ?? GEMINI_CONFIG.maxOutputTokens,
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          // 达到速率限制
          const waitTime = Math.pow(2, retryCount) * 60000;  // 指数退避
          console.warn(`⚠️  达到速率限制，等待 ${waitTime / 1000} 秒`);
          await sleep(waitTime);
          continue;
        }
        throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('Gemini API 返回空响应');
      }

      return text;

    } catch (error) {
      console.error(`❌ Gemini API 调用失败（尝试 ${retryCount + 1}/${maxRetries}）:`, error);
      if (retryCount === maxRetries - 1) {
        throw error;
      }
      await sleep(Math.pow(2, retryCount) * 5000);
    }
  }

  throw new Error('Gemini API 调用失败');
}

/**
 * 批量分析错题（提取知识点）
 */
export async function analyzeMistakesBatch(mistakes: Array<{ id: number; question: string }>): Promise<Array<{
  id: number;
  knowledgePoint: string;
  subKnowledgePoint: string;
  difficulty: string;
}>> {
  if (mistakes.length === 0) {
    return [];
  }

  const prompt = `分析以下英语语法错题，提取知识点。请严格按照JSON格式返回。

题目列表：
${mistakes.map((m, i) => `[${m.id}] ${m.question}`).join('\n')}

返回格式（严格JSON，不要其他内容）：
[
  {
    "id": 1,
    "knowledgePoint": "时态",
    "subKnowledgePoint": "一般现在时",
    "difficulty": "easy|intermediate|hard"
  }
]`;

  try {
    const response = await callGemini(prompt);
    return parseGeminiJSONResponse(response);
  } catch (error) {
    console.error('❌ 批量分析失败:', error);
    // 返回默认值，避免阻塞
    return mistakes.map(m => ({
      id: m.id,
      knowledgePoint: '未分类',
      subKnowledgePoint: '',
      difficulty: 'intermediate',
    }));
  }
}

/**
 * 深度分析错题（识别模式、趋势）
 */
export async function deepAnalyzeMistakes(mistakes: Array<{
  question: string;
  knowledgePoint?: string;
  created_at?: string;
}>): Promise<{
  insights: Array<{
    knowledgePoint: string;
    weakness: string;
    suggestion: string;
  }>;
  trend: string;
  priority: string[];
}> {
  if (mistakes.length === 0) {
    return { insights: [], trend: '', priority: [] };
  }

  const prompt = `分析以下英语错题，识别学习模式和薄弱点。

题目列表：
${mistakes.map((m, i) => `${i + 1}. [${m.knowledgePoint || '未分类'}] ${m.question}`).join('\n')}

请分析并返回JSON：
{
  "insights": [
    {
      "knowledgePoint": "时态",
      "weakness": "经常混淆一般现在时和一般过去时",
      "suggestion": "重点练习时态对比题"
    }
  ],
  "trend": "学习趋势描述",
  "priority": ["优先级1", "优先级2", "优先级3"]
}`;

  try {
    const response = await callGemini(prompt, {
      temperature: 0.2,
      maxOutputTokens: 2048,
    });
    return parseGeminiJSONResponse(response);
  } catch (error) {
    console.error('❌ 深度分析失败:', error);
    return { insights: [], trend: '暂无明显趋势', priority: [] };
  }
}

/**
 * 分析文档内容（提取单词/语法题/词转题）
 */
export async function analyzeDocument(content: string, documentType: 'vocabulary' | 'grammar' | 'transformation'): Promise<{
  items: any[];
}> {
  let prompt: string;

  switch (documentType) {
    case 'vocabulary':
      prompt = `从以下文本中提取英语单词，返回JSON格式：

文本内容：
${content.substring(0, 10000)}

返回格式：
{
  "words": [
    {
      "word": "adventure",
      "pronunciation": "/ədˈventʃər/",
      "partOfSpeech": "n.",
      "definition": "冒险；奇遇",
      "example": "Life is full of adventures.",
      "exampleTranslation": "生活充满了冒险。"
    }
  ]
}`;
      break;

    case 'grammar':
      prompt = `从以下文本中提取英语语法选择题，返回JSON格式：

文本内容：
${content.substring(0, 10000)}

返回格式：
{
  "questions": [
    {
      "question": "He _____ to school by bike every day.",
      "options": ["A. go", "B. goes", "C. going", "D. went"],
      "correctAnswer": "B",
      "explanation": "一般现在时第三人称单数形式，go变为goes。",
      "category": "时态",
      "subCategory": "一般现在时"
    }
  ]
}`;
      break;

    case 'transformation':
      prompt = `从以下文本中提取英语词转题（用所给词的正确形式填空），返回JSON格式：

文本内容：
${content.substring(0, 10000)}

返回格式：
{
  "questions": [
    {
      "sentence": "He enjoys _____ (read) books in the library.",
      "hint": "read",
      "answer": "reading",
      "explanation": "enjoy doing sth.，enjoy后面接动名词形式。",
      "grammarPoint": "非谓语动词",
      "variationPattern": "read -> reading"
    }
  ]
}`;
      break;
  }

  try {
    const response = await callGemini(prompt);
    return parseGeminiJSONResponse(response);
  } catch (error) {
    console.error('❌ 文档分析失败:', error);
    return { items: [] };
  }
}

/**
 * 解析 Gemini JSON 响应
 */
function parseGeminiJSONResponse(response: string): any {
  try {
    // 尝试直接解析
    return JSON.parse(response);
  } catch (e) {
    // 如果直接解析失败，尝试提取 JSON 部分
    const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error('❌ JSON 解析失败:', response);
        return null;
      }
    }
    console.error('❌ 无法提取 JSON:', response);
    return null;
  }
}

/**
 * 检查 API 配额
 */
export async function checkRateLimit(): Promise<{
  remaining: number;
  warning: boolean;
  emergency: boolean;
}> {
  // 这里可以从数据库或缓存中获取实际使用情况
  // 暂时返回默认值
  return {
    remaining: 1500,  // 假设剩余1500次
    warning: false,
    emergency: false,
  };
}

/**
 * 安全调用 Gemini（带配额检查）
 */
export async function safeCallGemini(prompt: string, options?: {
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ success: boolean; result?: string; error?: string }> {
  const quota = await checkRateLimit();

  if (quota.emergency) {
    return {
      success: false,
      error: 'API 配额不足，请稍后重试',
    };
  }

  if (quota.warning) {
    console.warn('⚠️  API 配额即将用完！剩余：', quota.remaining);
  }

  try {
    const result = await callGemini(prompt, options);
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
