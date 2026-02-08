/**
 * AI 内容相似度判断工具
 * 使用 AI 判断两个内容是否重复或相似
 */

import { callAI } from '@/utils/aiHelper';

/**
 * 内容相似度判断结果接口
 */
export interface ContentSimilarityResult {
  isSame: boolean;
  confidence: number; // 0-1
  reason: string;
}

/**
 * 判断语法点内容相似度
 *
 * @param newItem 新语法点
 * @param existingItem 已有语法点
 * @returns 相似度判断结果
 */
export async function checkGrammarPointSimilarity(
  newItem: { name: string; description?: string; category?: string },
  existingItem: { name: string; description?: string; category?: string }
): Promise<ContentSimilarityResult> {
  try {
    const prompt = `请判断以下两个语法点是否重复或相似：

语法点 1（已有）：
名称：${existingItem.name}
分类：${existingItem.category || '无'}
描述：${existingItem.description || '无'}

语法点 2（新增）：
名称：${newItem.name}
分类：${newItem.category || '无'}
描述：${newItem.description || '无'}

请返回 JSON 格式：
{
  "isSame": true/false,
  "confidence": 0-1 之间的数字,
  "reason": "判断原因"
}

判断标准：
1. 如果名称完全相同或非常相似，判定为相同
2. 如果描述内容基本相同，判定为相同
3. 如果名称不同但涉及相同语法知识，判定为相似
4. 如果名称和描述都完全不同，判定为不同
5. 置信度 0.8 以上表示高度确定
`;

    const result = await callAI(prompt, {
      responseType: 'json',
      maxTokens: 300,
    });

    if (!result || typeof result !== 'object') {
      console.error('[AI 相似度判断] 返回格式错误:', result);
      return {
        isSame: false,
        confidence: 0,
        reason: 'AI 返回格式错误',
      };
    }

    return {
      isSame: !!result.isSame,
      confidence: result.confidence || 0,
      reason: result.reason || '无',
    };
  } catch (error) {
    console.error('[AI 相似度判断] 错误:', error);
    return {
      isSame: false,
      confidence: 0,
      reason: 'AI 判断失败',
    };
  }
}

/**
 * 判断固定搭配内容相似度
 *
 * @param newItem 新固定搭配
 * @param existingItem 已有固定搭配
 * @returns 相似度判断结果
 */
export async function checkCollocationSimilarity(
  newItem: { phrase: string; meaning?: string; example?: string },
  existingItem: { phrase: string; meaning?: string; example?: string }
): Promise<ContentSimilarityResult> {
  try {
    const prompt = `请判断以下两个固定搭配是否重复或相似：

固定搭配 1（已有）：
短语：${existingItem.phrase}
含义：${existingItem.meaning || '无'}
例句：${existingItem.example || '无'}

固定搭配 2（新增）：
短语：${newItem.phrase}
含义：${newItem.meaning || '无'}
例句：${newItem.example || '无'}

请返回 JSON 格式：
{
  "isSame": true/false,
  "confidence": 0-1 之间的数字,
  "reason": "判断原因"
}

判断标准：
1. 如果短语完全相同，判定为相同
2. 如果短语相似且含义相同，判定为相同
3. 如果短语不同但含义完全相同，判定为相似
4. 如果短语和含义都完全不同，判定为不同
5. 置信度 0.8 以上表示高度确定
`;

    const result = await callAI(prompt, {
      responseType: 'json',
      maxTokens: 300,
    });

    if (!result || typeof result !== 'object') {
      console.error('[AI 相似度判断] 返回格式错误:', result);
      return {
        isSame: false,
        confidence: 0,
        reason: 'AI 返回格式错误',
      };
    }

    return {
      isSame: !!result.isSame,
      confidence: result.confidence || 0,
      reason: result.reason || '无',
    };
  } catch (error) {
    console.error('[AI 相似度判断] 错误:', error);
    return {
      isSame: false,
      confidence: 0,
      reason: 'AI 判断失败',
    };
  }
}

/**
 * 批量判断内容相似度
 *
 * @param possibleMatches 可能的匹配项
 * @param tableName 表名
 * @param threshold 置信度阈值（默认 0.8）
 * @returns 确认匹配和误判的匹配
 */
export async function batchCheckContentSimilarity(
  possibleMatches: Array<{
    newItem: any;
    existingItem: any;
    similarity: number;
  }>,
  tableName: 'grammarPoints' | 'collocations',
  threshold: number = 0.8
): Promise<{
  confirmedMatches: Array<{
    newItem: any;
    existingItem: any;
    similarity: number;
    confidence: number;
    reason: string;
  }>;
  falseMatches: Array<{
    newItem: any;
    existingItem: any;
    similarity: number;
    reason: string;
  }>;
}> {
  const confirmedMatches: any[] = [];
  const falseMatches: any[] = [];

  for (const match of possibleMatches) {
    let result: ContentSimilarityResult;

    if (tableName === 'grammarPoints') {
      result = await checkGrammarPointSimilarity(match.newItem, match.existingItem);
    } else {
      result = await checkCollocationSimilarity(match.newItem, match.existingItem);
    }

    if (result.isSame && result.confidence >= threshold) {
      confirmedMatches.push({
        ...match,
        confidence: result.confidence,
        reason: result.reason,
      });
    } else {
      falseMatches.push({
        ...match,
        reason: result.reason,
      });
    }
  }

  return { confirmedMatches, falseMatches };
}
