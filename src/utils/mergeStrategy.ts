/**
 * 合并策略工具
 * 支持替换、追加、智能合并、跳过等多种合并策略
 */

import { callAI } from '@/utils/aiHelper';

/**
 * 合并策略类型
 */
export enum MergeStrategy {
  REPLACE = 'replace', // 替换：直接使用新内容
  APPEND = 'append', // 追加：保留原有，添加新内容
  SMART_MERGE = 'smart_merge', // 智能合并：AI 辅助选择最佳内容
  SKIP = 'skip', // 跳过：不修改已有内容
}

/**
 * 合并结果接口
 */
export interface MergeResult {
  success: boolean;
  mergedItem: any;
  reason: string;
}

/**
 * 语法点合并结果
 */
export interface GrammarPointMergeResult extends MergeResult {
  mergedItem: {
    id: number;
    name: string;
    category?: string;
    description?: string;
    examples?: string[];
    source?: string;
    updatedAt?: Date;
  };
}

/**
 * 固定搭配合并结果
 */
export interface CollocationMergeResult extends MergeResult {
  mergedItem: {
    id: number;
    phrase: string;
    meaning?: string;
    example?: string;
    source?: string;
    updatedAt?: Date;
  };
}

/**
 * 应用语法点合并策略
 *
 * @param existingItem 已有语法点
 * @param newItem 新语法点
 * @param strategy 合并策略
 * @returns 合并结果
 */
export async function applyGrammarPointMergeStrategy(
  existingItem: {
    id: number;
    name: string;
    category?: string;
    description?: string;
    examples?: string[];
    source?: string;
    updatedAt?: Date;
  },
  newItem: {
    name: string;
    category?: string;
    description?: string;
    examples?: string[];
    source?: string;
  },
  strategy: MergeStrategy
): Promise<GrammarPointMergeResult> {
  try {
    switch (strategy) {
      case MergeStrategy.REPLACE:
        return {
          success: true,
          mergedItem: {
            ...existingItem,
            name: newItem.name,
            category: newItem.category || existingItem.category,
            description: newItem.description || existingItem.description,
            examples: newItem.examples || existingItem.examples,
            source: newItem.source || existingItem.source,
            updatedAt: new Date(),
          },
          reason: '已使用新内容替换原有内容',
        };

      case MergeStrategy.APPEND:
        return {
          success: true,
          mergedItem: {
            ...existingItem,
            category: newItem.category || existingItem.category,
            description: existingItem.description || newItem.description,
            examples: [
              ...(existingItem.examples || []),
              ...(newItem.examples || []).filter(
                (ex) => !existingItem.examples?.includes(ex)
              ),
            ],
            source: `${existingItem.source || ''}, ${newItem.source || ''}`,
            updatedAt: new Date(),
          },
          reason: '已将新内容追加到原有内容',
        };

      case MergeStrategy.SKIP:
        return {
          success: true,
          mergedItem: existingItem,
          reason: '已跳过，保留原有内容',
        };

      case MergeStrategy.SMART_MERGE:
        return await smartMergeGrammarPoint(existingItem, newItem);

      default:
        return {
          success: false,
          mergedItem: existingItem,
          reason: '未知的合并策略',
        };
    }
  } catch (error) {
    console.error('[语法点合并] 错误:', error);
    return {
      success: false,
      mergedItem: existingItem,
      reason: '合并失败',
    };
  }
}

/**
 * 应用固定搭配合并策略
 *
 * @param existingItem 已有固定搭配
 * @param newItem 新固定搭配
 * @param strategy 合并策略
 * @returns 合并结果
 */
export async function applyCollocationMergeStrategy(
  existingItem: {
    id: number;
    phrase: string;
    meaning?: string;
    example?: string;
    source?: string;
    updatedAt?: Date;
  },
  newItem: {
    phrase: string;
    meaning?: string;
    example?: string;
    source?: string;
  },
  strategy: MergeStrategy
): Promise<CollocationMergeResult> {
  try {
    switch (strategy) {
      case MergeStrategy.REPLACE:
        return {
          success: true,
          mergedItem: {
            ...existingItem,
            phrase: newItem.phrase,
            meaning: newItem.meaning || existingItem.meaning,
            example: newItem.example || existingItem.example,
            source: newItem.source || existingItem.source,
            updatedAt: new Date(),
          },
          reason: '已使用新内容替换原有内容',
        };

      case MergeStrategy.APPEND:
        return {
          success: true,
          mergedItem: {
            ...existingItem,
            meaning: existingItem.meaning || newItem.meaning,
            example: existingItem.example || newItem.example,
            source: `${existingItem.source || ''}, ${newItem.source || ''}`,
            updatedAt: new Date(),
          },
          reason: '已将新内容追加到原有内容',
        };

      case MergeStrategy.SKIP:
        return {
          success: true,
          mergedItem: existingItem,
          reason: '已跳过，保留原有内容',
        };

      case MergeStrategy.SMART_MERGE:
        return await smartMergeCollocation(existingItem, newItem);

      default:
        return {
          success: false,
          mergedItem: existingItem,
          reason: '未知的合并策略',
        };
    }
  } catch (error) {
    console.error('[固定搭配合并] 错误:', error);
    return {
      success: false,
      mergedItem: existingItem,
      reason: '合并失败',
    };
  }
}

/**
 * 智能合并语法点（AI 辅助）
 */
async function smartMergeGrammarPoint(
  existingItem: {
    id: number;
    name: string;
    category?: string;
    description?: string;
    examples?: string[];
    source?: string;
  },
  newItem: {
    name: string;
    category?: string;
    description?: string;
    examples?: string[];
    source?: string;
  }
): Promise<GrammarPointMergeResult> {
  try {
    const prompt = `请智能合并以下两个语法点：

语法点 1（已有）：
名称：${existingItem.name}
分类：${existingItem.category || '无'}
描述：${existingItem.description || '无'}
例句：${(existingItem.examples || []).join('; ') || '无'}

语法点 2（新增）：
名称：${newItem.name}
分类：${newItem.category || '无'}
描述：${newItem.description || '无'}
例句：${(newItem.examples || []).join('; ') || '无'}

请返回 JSON 格式：
{
  "name": "合并后的名称",
  "category": "合并后的分类",
  "description": "合并后的描述（综合两者的优点）",
  "examples": ["例句1", "例句2"],
  "reason": "合并原因"
}

合并原则：
1. 保留最准确的名称
2. 描述要综合两者的优点，去除重复
3. 例句去重后保留最有代表性的
4. 如果内容基本相同，使用更详细的版本
`;

    const result = await callAI(prompt, {
      responseType: 'json',
      maxTokens: 500,
    });

    if (!result || typeof result !== 'object') {
      console.error('[AI 智能合并] 返回格式错误:', result);
      // 降级到追加策略
      return {
        success: true,
        mergedItem: {
          ...existingItem,
          category: newItem.category || existingItem.category,
          description: existingItem.description || newItem.description,
          examples: [
            ...(existingItem.examples || []),
            ...(newItem.examples || []).filter(
              (ex) => !existingItem.examples?.includes(ex)
            ),
          ],
          source: `${existingItem.source || ''}, ${newItem.source || ''}`,
          updatedAt: new Date(),
        },
        reason: 'AI 合并失败，降级使用追加策略',
      };
    }

    return {
      success: true,
      mergedItem: {
        ...existingItem,
        name: result.name || existingItem.name,
        category: result.category || newItem.category || existingItem.category,
        description: result.description || existingItem.description || newItem.description,
        examples: result.examples || [
          ...(existingItem.examples || []),
          ...(newItem.examples || []),
        ],
        source: `${existingItem.source || ''}, ${newItem.source || ''}`,
        updatedAt: new Date(),
      },
      reason: result.reason || 'AI 智能合并成功',
    };
  } catch (error) {
    console.error('[AI 智能合并] 错误:', error);
    // 降级到追加策略
    return {
      success: true,
      mergedItem: {
        ...existingItem,
        category: newItem.category || existingItem.category,
        description: existingItem.description || newItem.description,
        examples: [
          ...(existingItem.examples || []),
          ...(newItem.examples || []).filter(
            (ex) => !existingItem.examples?.includes(ex)
          ),
        ],
        source: `${existingItem.source || ''}, ${newItem.source || ''}`,
        updatedAt: new Date(),
      },
      reason: 'AI 合并失败，降级使用追加策略',
    };
  }
}

/**
 * 智能合并固定搭配（AI 辅助）
 */
async function smartMergeCollocation(
  existingItem: {
    id: number;
    phrase: string;
    meaning?: string;
    example?: string;
    source?: string;
  },
  newItem: {
    phrase: string;
    meaning?: string;
    example?: string;
    source?: string;
  }
): Promise<CollocationMergeResult> {
  try {
    const prompt = `请智能合并以下两个固定搭配：

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
  "phrase": "合并后的短语",
  "meaning": "合并后的含义（综合两者的优点）",
  "example": "合并后的例句（选择最有代表性的）",
  "reason": "合并原因"
}

合并原则：
1. 保留最准确的短语
2. 含义要综合两者的优点，去除重复
3. 例句选择最有代表性的
4. 如果内容基本相同，使用更详细的版本
`;

    const result = await callAI(prompt, {
      responseType: 'json',
      maxTokens: 300,
    });

    if (!result || typeof result !== 'object') {
      console.error('[AI 智能合并] 返回格式错误:', result);
      // 降级到追加策略
      return {
        success: true,
        mergedItem: {
          ...existingItem,
          meaning: existingItem.meaning || newItem.meaning,
          example: existingItem.example || newItem.example,
          source: `${existingItem.source || ''}, ${newItem.source || ''}`,
          updatedAt: new Date(),
        },
        reason: 'AI 合并失败，降级使用追加策略',
      };
    }

    return {
      success: true,
      mergedItem: {
        ...existingItem,
        phrase: result.phrase || existingItem.phrase,
        meaning: result.meaning || existingItem.meaning || newItem.meaning,
        example: result.example || existingItem.example || newItem.example,
        source: `${existingItem.source || ''}, ${newItem.source || ''}`,
        updatedAt: new Date(),
      },
      reason: result.reason || 'AI 智能合并成功',
    };
  } catch (error) {
    console.error('[AI 智能合并] 错误:', error);
    // 降级到追加策略
    return {
      success: true,
      mergedItem: {
        ...existingItem,
        meaning: existingItem.meaning || newItem.meaning,
        example: existingItem.example || newItem.example,
        source: `${existingItem.source || ''}, ${newItem.source || ''}`,
        updatedAt: new Date(),
      },
      reason: 'AI 合并失败，降级使用追加策略',
    };
  }
}
