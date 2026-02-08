/**
 * 去重检测工具
 * 支持精确匹配和模糊匹配
 */

import { getDb } from '@/utils/db';
import { grammarPoints, collocations } from '@/storage/database/shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * 去重检测结果接口
 */
export interface DuplicateDetectionResult {
  exactMatches: Array<{
    newItem: any;
    existingItem: any;
  }>;
  possibleMatches: Array<{
    newItem: any;
    existingItem: any;
    similarity: number;
  }>;
  uniqueItems: any[];
}

/**
 * 重复匹配项接口
 */
export interface DuplicateMatch {
  item: any;
  similarity: number;
}

/**
 * 语法点重复检测结果接口
 */
export interface GrammarPointDuplicateResult {
  exactMatch: any | null;
  possibleMatches: DuplicateMatch[];
}

/**
 * 查找重复的语法点
 *
 * @param name 语法点名称
 * @param description 语法点描述
 * @returns 重复检测结果
 */
export async function findDuplicateGrammarPoints(
  name: string,
  description?: string
): Promise<GrammarPointDuplicateResult> {
  const db = await getDb();
  const normalizedName = name.trim().toLowerCase();

  // 1. 精确匹配（名称相同，不区分大小写）
  const [exactMatch] = await db
    .select()
    .from(grammarPoints)
    .where(sql`LOWER(${grammarPoints.name}) = ${normalizedName}`)
    .limit(1);

  if (exactMatch) {
    return {
      exactMatch,
      possibleMatches: [],
    };
  }

  // 2. 模糊匹配（名称相似）
  const allPoints = await db.select().from(grammarPoints).limit(100); // 限制数量，提高性能

  const possibleMatches: DuplicateMatch[] = [];

  for (const existingPoint of allPoints) {
    const existingName = existingPoint.name.trim().toLowerCase();
    const similarity = calculateSimilarity(normalizedName, existingName);

    if (similarity > 0.7) { // 相似度阈值
      possibleMatches.push({
        item: existingPoint,
        similarity,
      });
    }
  }

  return {
    exactMatch: null,
    possibleMatches: possibleMatches.sort((a, b) => b.similarity - a.similarity),
  };
}

/**
 * 计算编辑距离（Levenshtein Distance）
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * 计算文本相似度（0-1）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(len1, len2);

  return 1 - distance / maxLength;
}

/**
 * 检测语法点重复
 *
 * @param newGrammarPoints 新的语法点列表
 * @returns 去重检测结果
 */
export async function detectGrammarPointDuplicates(
  newGrammarPoints: Array<{ name: string; description?: string }>
): Promise<DuplicateDetectionResult> {
  const db = await getDb();

  const exactMatches: any[] = [];
  const possibleMatches: any[] = [];
  const uniqueItems: any[] = [];

  for (const newItem of newGrammarPoints) {
    const normalizedName = newItem.name.trim().toLowerCase();

    // 1. 精确匹配（名称相同，不区分大小写）
    const [exactMatch] = await db
      .select()
      .from(grammarPoints)
      .where(sql`LOWER(${grammarPoints.name}) = ${normalizedName}`)
      .limit(1);

    if (exactMatch) {
      exactMatches.push({ newItem, existingItem: exactMatch });
      continue;
    }

    // 2. 模糊匹配（名称相似）
    const allPoints = await db.select().from(grammarPoints).limit(100); // 限制数量，提高性能

    for (const existingPoint of allPoints) {
      const existingName = existingPoint.name.trim().toLowerCase();
      const similarity = calculateSimilarity(normalizedName, existingName);

      if (similarity > 0.7) { // 相似度阈值
        possibleMatches.push({
          newItem,
          existingItem: existingPoint,
          similarity,
        });
        break; // 找到一个匹配即可
      }
    }

    if (!possibleMatches.some(m => m.newItem === newItem)) {
      uniqueItems.push(newItem);
    }
  }

  return { exactMatches, possibleMatches, uniqueItems };
}

/**
 * 检测固定搭配重复
 *
 * @param newCollocations 新的固定搭配列表
 * @returns 去重检测结果
 */
export async function detectCollocationDuplicates(
  newCollocations: Array<{ phrase: string; meaning?: string }>
): Promise<DuplicateDetectionResult> {
  const db = await getDb();

  const exactMatches: any[] = [];
  const possibleMatches: any[] = [];
  const uniqueItems: any[] = [];

  for (const newItem of newCollocations) {
    const normalizedPhrase = newItem.phrase.trim().toLowerCase();

    // 1. 精确匹配（短语相同，不区分大小写）
    const [exactMatch] = await db
      .select()
      .from(collocations)
      .where(sql`LOWER(${collocations.phrase}) = ${normalizedPhrase}`)
      .limit(1);

    if (exactMatch) {
      exactMatches.push({ newItem, existingItem: exactMatch });
      continue;
    }

    // 2. 模糊匹配（短语相似）
    const allCollocations = await db.select().from(collocations).limit(100);

    for (const existingCollocation of allCollocations) {
      const existingPhrase = existingCollocation.phrase.trim().toLowerCase();
      const similarity = calculateSimilarity(normalizedPhrase, existingPhrase);

      if (similarity > 0.7) {
        possibleMatches.push({
          newItem,
          existingItem: existingCollocation,
          similarity,
        });
        break;
      }
    }

    if (!possibleMatches.some(m => m.newItem === newItem)) {
      uniqueItems.push(newItem);
    }
  }

  return { exactMatches, possibleMatches, uniqueItems };
}

/**
 * 批量检测重复
 *
 * @param items 新项目列表
 * @param tableName 表名
 * @returns 去重检测结果
 */
export async function detectDuplicates(
  items: Array<{ name?: string; phrase?: string; description?: string }>,
  tableName: 'grammarPoints' | 'collocations'
): Promise<DuplicateDetectionResult> {
  if (tableName === 'grammarPoints') {
    return detectGrammarPointDuplicates(items as Array<{ name: string; description?: string }>);
  } else if (tableName === 'collocations') {
    return detectCollocationDuplicates(items as Array<{ phrase: string; meaning?: string }>);
  }

  return {
    exactMatches: [],
    possibleMatches: [],
    uniqueItems: items,
  };
}
