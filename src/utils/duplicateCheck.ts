/**
 * 错题去重和相似度检测工具函数
 */

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateId?: number;
  similarityScore?: number;
  reason: 'exact_match' | 'high_similarity' | 'no_match';
}

export interface MistakeInfo {
  id?: number;
  userId: string;
  question: string;
}

/**
 * 第1层：精确去重检查（数据库唯一约束）
 */
export async function checkExactDuplicate(
  db: any,
  userId: string,
  question: string
): Promise<number | null> {
  try {
    const result = await db.execute(
      `SELECT id FROM user_mistakes 
       WHERE user_id = $1 AND question = $2 
       LIMIT 1`,
      [userId, question]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    return null;
  } catch (error) {
    console.error('❌ 精确去重检查失败:', error);
    return null;
  }
}

/**
 * 第2层：相似度检测（文本相似度）
 */
export async function checkSimilarity(
  db: any,
  userId: string,
  question: string,
  threshold: number = 0.85
): Promise<{ duplicateId: number | null; similarityScore: number }> {
  try {
    // 获取用户的所有错题
    const result = await db.execute(
      `SELECT id, question 
       FROM user_mistakes 
       WHERE user_id = $1
       ORDER BY created_at DESC 
       LIMIT 50`,  // 只检查最近的50题
      [userId]
    );

    let maxSimilarity = 0;
    let mostSimilarId = null;

    for (const row of result.rows) {
      const similarity = calculateSimilarity(question, row.question);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarId = row.id;
      }
    }

    if (maxSimilarity >= threshold) {
      return { duplicateId: mostSimilarId, similarityScore: maxSimilarity };
    }

    return { duplicateId: null, similarityScore: maxSimilarity };
  } catch (error) {
    console.error('❌ 相似度检测失败:', error);
    return { duplicateId: null, similarityScore: 0 };
  }
}

/**
 * 计算文本相似度（使用简单的余弦相似度）
 */
export function calculateSimilarity(text1: string, text2: string): number {
  // 预处理：转小写、去除标点、分词
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0;
  }

  // 创建词向量
  const vector1 = createVector(tokens1);
  const vector2 = createVector(tokens2);

  // 计算余弦相似度
  return cosineSimilarity(vector1, vector2);
}

/**
 * 文本分词（英文）
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);  // 过滤单字母
}

/**
 * 创建词向量
 */
function createVector(tokens: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) || 0) + 1);
  }
  return vector;
}

/**
 * 余弦相似度计算
 */
function cosineSimilarity(vector1: Map<string, number>, vector2: Map<string, number>): number {
  // 获取所有唯一词
  const keys1 = Array.from(vector1.keys());
  const keys2 = Array.from(vector2.keys());
  const allWords = new Set(keys1.concat(keys2));

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  const wordsArray = Array.from(allWords);
  for (let i = 0; i < wordsArray.length; i++) {
    const word = wordsArray[i];
    const v1 = vector1.get(word) || 0;
    const v2 = vector2.get(word) || 0;

    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * 完整的去重检查（多层检测）
 */
export async function checkDuplicate(
  db: any,
  userId: string,
  question: string,
  options: {
    exactCheck?: boolean;
    similarityCheck?: boolean;
    similarityThreshold?: number;
  } = {}
): Promise<DuplicateCheckResult> {
  const {
    exactCheck = true,
    similarityCheck = true,
    similarityThreshold = 0.85
  } = options;

  // 第1层：精确匹配
  if (exactCheck) {
    const duplicateId = await checkExactDuplicate(db, userId, question);
    if (duplicateId) {
      return {
        isDuplicate: true,
        duplicateId,
        similarityScore: 1.0,
        reason: 'exact_match'
      };
    }
  }

  // 第2层：相似度检测
  if (similarityCheck) {
    const { duplicateId, similarityScore } = await checkSimilarity(
      db,
      userId,
      question,
      similarityThreshold
    );

    if (duplicateId) {
      return {
        isDuplicate: true,
        duplicateId,
        similarityScore,
        reason: 'high_similarity'
      };
    }
  }

  // 没有重复
  return {
    isDuplicate: false,
    similarityScore: 0,
    reason: 'no_match'
  };
}

/**
 * 批量去重检查（用于批量上传）
 */
export async function batchCheckDuplicates(
  db: any,
  mistakes: Array<{ userId: string; question: string }>
): Promise<Array<{
  index: number;
  isDuplicate: boolean;
  duplicateId?: number;
  similarityScore?: number;
}>> {
  const results = [];

  for (let i = 0; i < mistakes.length; i++) {
    const check = await checkDuplicate(
      db,
      mistakes[i].userId,
      mistakes[i].question
    );

    results.push({
      index: i,
      isDuplicate: check.isDuplicate,
      duplicateId: check.duplicateId,
      similarityScore: check.similarityScore,
    });
  }

  return results;
}

/**
 * 标记重复错题
 */
export async function markAsDuplicate(
  db: any,
  mistakeId: number,
  duplicateOf: number
): Promise<void> {
  try {
    await db.execute(
      `UPDATE user_mistakes 
       SET duplicate_of = $2, status = 'duplicate' 
       WHERE id = $1`,
      [mistakeId, duplicateOf]
    );
  } catch (error) {
    console.error('❌ 标记重复失败:', error);
  }
}

/**
 * 智能合并相似错题
 */
export async function mergeSimilarMistakes(
  db: any,
  userId: string
): Promise<number> {
  try {
    // 获取所有未标记重复的错题
    const result = await db.execute(
      `SELECT id, question 
       FROM user_mistakes 
       WHERE user_id = $1 
       AND duplicate_of IS NULL
       AND status != 'duplicate'
       ORDER BY created_at DESC`,
      [userId]
    );

    let mergedCount = 0;

    for (let i = 0; i < result.rows.length; i++) {
      for (let j = i + 1; j < result.rows.length; j++) {
        const similarity = calculateSimilarity(
          result.rows[i].question,
          result.rows[j].question
        );

        if (similarity >= 0.9) {
          // 标记为重复
          await markAsDuplicate(db, result.rows[j].id, result.rows[i].id);
          mergedCount++;
        }
      }
    }

    return mergedCount;
  } catch (error) {
    console.error('❌ 合并相似错题失败:', error);
    return 0;
  }
}
