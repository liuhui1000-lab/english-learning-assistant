/**
 * AI 语法点提取工具
 * 从语法题中提取语法知识点
 */

import { callAI } from '@/utils/aiHelper';

/**
 * 语法题接口
 */
export interface GrammarQuestion {
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

/**
 * 提取结果接口
 */
export interface GrammarPointExtraction {
  pointName: string;
  category?: string;
  confidence: number;
  reason?: string;
}

/**
 * 从语法题中提取语法知识点
 *
 * @param question 语法题
 * @returns 语法点提取结果
 */
export async function extractGrammarPointFromQuestion(
  question: GrammarQuestion
): Promise<GrammarPointExtraction | null> {
  try {
    const prompt = `请分析以下语法题，提取主要考查的语法知识点：

题目：${question.question}
${question.options ? `选项：${question.options.join(' / ')}` : ''}
正确答案：${question.correctAnswer}
${question.explanation ? `解析：${question.explanation}` : ''}

请返回 JSON 格式，包含以下字段：
{
  "pointName": "语法知识点名称（如：形容词比较级、被动语态、虚拟语气等）",
  "category": "语法分类（如：形容词、时态、从句等）",
  "confidence": 0-1 之间的数字，表示置信度",
  "reason": "判断原因（简要说明为什么是这个语法点）"
}

要求：
1. 语法点名称要简洁准确
2. 分类要清晰
3. 如果题目明显不是语法题，请返回 pointName 为 "非语法题"
`;

    const result = await callAI(prompt, {
      responseType: 'json',
      maxTokens: 200,
    });

    // 验证结果
    if (!result || typeof result !== 'object') {
      console.error('[语法点提取] AI 返回格式错误:', result);
      return null;
    }

    // 检查是否为语法题
    if (result.pointName === '非语法题') {
      return null;
    }

    return {
      pointName: result.pointName || '',
      category: result.category || '',
      confidence: result.confidence || 0.5,
      reason: result.reason || '',
    };
  } catch (error) {
    console.error('[语法点提取] 错误:', error);
    return null;
  }
}

/**
 * 批量提取语法点
 *
 * @param questions 语法题数组
 * @returns 语法点提取结果数组
 */
export async function extractGrammarPointsBatch(
  questions: GrammarQuestion[]
): Promise<GrammarPointExtraction[]> {
  const results: GrammarPointExtraction[] = [];

  for (const question of questions) {
    const result = await extractGrammarPointFromQuestion(question);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * 统计语法点出现频率
 *
 * @param extractions 语法点提取结果数组
 * @returns 语法点频率统计
 */
export function analyzeGrammarPointFrequency(
  extractions: GrammarPointExtraction[]
): Map<string, number> {
  const frequency = new Map<string, number>();

  for (const extraction of extractions) {
    const pointName = extraction.pointName.trim();
    const count = (frequency.get(pointName) || 0) + 1;
    frequency.set(pointName, count);
  }

  return frequency;
}

/**
 * 去重语法点列表
 *
 * @param extractions 语法点提取结果数组
 * @returns 去重后的语法点列表
 */
export function deduplicateGrammarPoints(
  extractions: GrammarPointExtraction[]
): GrammarPointExtraction[] {
  const seen = new Map<string, GrammarPointExtraction>();

  for (const extraction of extractions) {
    const pointName = extraction.pointName.trim();

    if (!seen.has(pointName)) {
      seen.set(pointName, extraction);
    } else {
      // 如果已经存在，保留置信度更高的
      const existing = seen.get(pointName)!;
      if (extraction.confidence > existing.confidence) {
        seen.set(pointName, extraction);
      }
    }
  }

  return Array.from(seen.values());
}
