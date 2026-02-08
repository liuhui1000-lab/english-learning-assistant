/**
 * 题目哈希生成工具
 *
 * 用于生成题目的唯一标识符，支持去重和来源追踪
 */

import crypto from 'crypto';

/**
 * 题目数据接口
 */
export interface QuestionData {
  question: string; // 题目内容
  options?: string[] | string | any; // 选项（可以是数组、字符串或 JSON 对象）
  type?: string; // 题目类型
}

/**
 * 生成题目哈希
 *
 * 使用 MD5 算法生成题目内容的哈希值，用于识别重复题目
 *
 * @param questionData 题目数据
 * @returns 32 字符的 MD5 哈希字符串
 *
 * @example
 * ```typescript
 * const hash = generateQuestionHash({
 *   question: "What is the capital of China?",
 *   options: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen"]
 * });
 * // 返回: "a1b2c3d4e5f6..."
 * ```
 */
export function generateQuestionHash(questionData: QuestionData): string {
  // 标准化选项数据
  let normalizedOptions = '';

  if (questionData.options) {
    if (Array.isArray(questionData.options)) {
      // 如果是数组，按字母顺序排序后拼接
      normalizedOptions = questionData.options
        .map(opt => String(opt).trim())
        .sort()
        .join('|');
    } else if (typeof questionData.options === 'string') {
      // 如果是字符串，直接使用
      normalizedOptions = questionData.options.trim();
    } else {
      // 如果是对象，转换为 JSON 字符串
      normalizedOptions = JSON.stringify(questionData.options);
    }
  }

  // 拼接题目内容
  // 格式：题目 + 选项（如果有）
  const content = `${questionData.question.trim()}|||${normalizedOptions}`;

  // 生成 MD5 哈希
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 生成题目哈希（简化版）
 *
 * 仅基于题目内容生成哈希，忽略选项
 * 适用于选项不重要或经常变化的场景
 *
 * @param question 题目内容
 * @returns 32 字符的 MD5 哈希字符串
 *
 * @example
 * ```typescript
 * const hash = generateQuestionHashSimple("What is the capital of China?");
 * // 返回: "a1b2c3d4e5f6..."
 * ```
 */
export function generateQuestionHashSimple(question: string): string {
  return crypto.createHash('md5').update(question.trim()).digest('hex');
}

/**
 * 比较两个题目是否相同
 *
 * @param question1 第一个题目
 * @param question2 第二个题目
 * @returns 是否相同
 */
export function isQuestionSame(question1: QuestionData, question2: QuestionData): boolean {
  return generateQuestionHash(question1) === generateQuestionHash(question2);
}

/**
 * 批量生成题目哈希
 *
 * @param questions 题目数组
 * @returns 哈希数组
 */
export function generateQuestionHashBatch(questions: QuestionData[]): string[] {
  return questions.map(q => generateQuestionHash(q));
}

/**
 * 统计题目哈希的重复情况
 *
 * @param hashes 哈希数组
 * @returns 重复统计信息
 *
 * @example
 * ```typescript
 * const hashes = generateQuestionHashBatch(questions);
 * const stats = analyzeHashDuplication(hashes);
 * console.log(stats.totalQuestions); // 总题目数
 * console.log(stats.uniqueQuestions); // 唯一题目数
 * console.log(stats.duplicateCount); // 重复题目数
 * console.log(stats.duplicationRate); // 重复率
 * ```
 */
export function analyzeHashDuplication(hashes: string[]) {
  const hashMap = new Map<string, number>();
  let duplicateCount = 0;

  // 统计每个哈希出现的次数
  for (const hash of hashes) {
    const count = (hashMap.get(hash) || 0) + 1;
    hashMap.set(hash, count);

    if (count > 1) {
      duplicateCount++;
    }
  }

  const totalQuestions = hashes.length;
  const uniqueQuestions = hashMap.size;
  const duplicationRate = totalQuestions > 0 ? (duplicateCount / totalQuestions) * 100 : 0;

  return {
    totalQuestions,
    uniqueQuestions,
    duplicateCount,
    duplicationRate: Math.round(duplicationRate * 100) / 100, // 保留两位小数
    duplicates: Array.from(hashMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([hash, count]) => ({ hash, count })),
  };
}
