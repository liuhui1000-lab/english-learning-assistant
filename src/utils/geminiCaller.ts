/**
 * Gemini API 调用（带配额检查和错误处理）
 * 支持文档分析和错题分析
 */

import { QuotaManager } from './quotaManager';

export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    isQuotaError: boolean;
    retryAfter?: string;
    userMessage: string;
  };
}

/**
 * 调用 Gemini API（带配额检查）
 */
export async function callGemini(
  prompt: string,
  type: 'document' | 'mistake' | 'batch' = 'document',
  maxRetries: number = 3
): Promise<GeminiResponse> {
  try {
    // 1. 检查配额
    const quotaCheck = await QuotaManager.trackCall(type);
    
    if (!quotaCheck.success) {
      const quota = await QuotaManager.getQuotaInfo();
      
      return {
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: quotaCheck.error || '免费额度已用完',
          isQuotaError: true,
          retryAfter: quotaCheck.retryAfter,
          userMessage: QuotaManager['generateQuotaErrorMessage'](quota),
        },
      };
    }

    // 2. 调用 Gemini API
    const result = await callGeminiWithRetry(prompt, maxRetries);
    
    // 3. 返回成功结果
    return {
      success: true,
      data: result,
    };

  } catch (error: any) {
    // 4. 处理错误
    const errorInfo = QuotaManager.handleApiError(error);
    
    // 如果是配额错误，记录并返回
    if (errorInfo.isQuotaError) {
      console.error('[Gemini] 配额错误:', errorInfo.message);
      
      return {
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: errorInfo.message,
          isQuotaError: true,
          retryAfter: errorInfo.retryAfter,
          userMessage: errorInfo.userMessage,
        },
      };
    }

    // 其他错误
    console.error('[Gemini] API 错误:', error);
    
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error.message || '未知错误',
        isQuotaError: false,
        userMessage: '分析失败，请稍后重试',
      },
    };
  }
}

/**
 * 带重试机制的 Gemini API 调用
 */
async function callGeminiWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未配置');
  }

  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 429 Too Many Requests - 速率限制
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // 指数退避：1s, 2s, 4s
          
          console.warn(`[Gemini] 速率限制，等待 ${waitTime}ms 后重试...`);
          await delay(waitTime);
          
          lastError = new Error(`速率限制：${errorData.error?.message || 'Too Many Requests'}`);
          continue;
        }
        
        // 其他错误
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // 解析响应
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('AI 返回空结果');
      }

      // 尝试解析 JSON
      try {
        return JSON.parse(text);
      } catch {
        return { text };
      }

    } catch (error: any) {
      lastError = error;
      
      // 如果不是速率限制错误，不再重试
      if (!error.message?.includes('速率限制')) {
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 批量调用 Gemini（用于错题分析）
 */
export async function batchCallGemini(
  items: any[],
  promptGenerator: (item: any, index: number) => string,
  type: 'document' | 'mistake' | 'batch' = 'mistake',
  batchSize: number = 10,
  delayMs: number = 4000
): Promise<{
  success: boolean;
  results: any[];
  errors: Array<{ index: number; error: any }>;
  quotaError?: {
    message: string;
    retryAfter: string;
    userMessage: string;
  };
}> {
  const results: any[] = [];
  const errors: Array<{ index: number; error: any }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // 检查配额
    const quotaCheck = await QuotaManager.trackCall(type);
    
    if (!quotaCheck.success) {
      const quota = await QuotaManager.getQuotaInfo();
      
      return {
        success: false,
        results,
        errors,
        quotaError: {
          message: quotaCheck.error || '免费额度已用完',
          retryAfter: quotaCheck.retryAfter || '',
          userMessage: QuotaManager['generateQuotaErrorMessage'](quota),
        },
      };
    }

    // 批量调用
    const batchResults = await Promise.allSettled(
      batch.map((item, batchIndex) => {
        const globalIndex = i + batchIndex;
        const prompt = promptGenerator(item, globalIndex);
        
        return callGemini(prompt, type, 1).then(response => {
          if (response.success) {
            return { index: globalIndex, data: response.data };
          } else {
            return { index: globalIndex, error: response.error };
          }
        });
      })
    );

    // 处理结果
    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex;
      
      if (result.status === 'fulfilled') {
        if (result.value.error) {
          errors.push({
            index: globalIndex,
            error: result.value.error,
          });
        } else {
          results.push(result.value);
        }
      } else {
        errors.push({
          index: globalIndex,
          error: {
            code: 'UNKNOWN_ERROR',
            message: result.reason?.message || '未知错误',
            userMessage: '分析失败',
          },
        });
      }
    });

    // 延迟（满足速率限制）
    if (i + batchSize < items.length) {
      await delay(delayMs);
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}
