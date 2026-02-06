/**
 * 艾宾浩斯记忆曲线复习时间计算工具
 */

export interface ReviewSchedule {
  reviewCount: number;
  nextReviewAt: Date;
  intervalHours: number;
}

/**
 * 艾宾浩斯记忆曲线复习间隔（小时）
 * - 第1次复习：1小时后
 * - 第2次复习：1天后（24小时）
 * - 第3次复习：3天后（72小时）
 * - 第4次复习：7天后（168小时）
 * - 第5次复习：15天后（360小时）
 * - 第6次复习：30天后（720小时）
 * - 第7次及以后：每30天复习一次
 */
const EBBINGHAUS_INTERVALS = [1, 24, 72, 168, 360, 720];

/**
 * 计算下次复习时间
 * @param reviewCount 当前复习次数
 * @param lastReviewAt 最后复习时间
 * @returns 下次复习时间安排
 */
export function calculateNextReview(
  reviewCount: number,
  lastReviewAt: Date = new Date()
): ReviewSchedule {
  const intervalHours =
    reviewCount < EBBINGHAUS_INTERVALS.length
      ? EBBINGHAUS_INTERVALS[reviewCount]
      : 720; // 第7次及以后，每30天复习一次

  const nextReviewAt = new Date(lastReviewAt.getTime() + intervalHours * 60 * 60 * 1000);

  return {
    reviewCount: reviewCount + 1,
    nextReviewAt,
    intervalHours,
  };
}

/**
 * 检查是否需要复习
 * @param nextReviewAt 下次复习时间
 * @returns 是否需要复习
 */
export function needsReview(nextReviewAt: Date | null | string): boolean {
  if (!nextReviewAt) return true;

  const reviewTime = typeof nextReviewAt === 'string' ? new Date(nextReviewAt) : nextReviewAt;
  return new Date() >= reviewTime;
}

/**
 * 计算掌握等级
 * @param consecutiveCorrect 连续正确次数
 * @param reviewCount 复习次数
 * @returns 掌握等级 (0-5)
 */
export function calculateMasteryLevel(
  consecutiveCorrect: number,
  reviewCount: number
): number {
  // 连续正确3次以上，且复习次数至少3次，才算掌握
  if (consecutiveCorrect >= 3 && reviewCount >= 3) {
    return Math.min(5, Math.floor((consecutiveCorrect + reviewCount) / 2));
  }
  return Math.max(0, Math.floor(consecutiveCorrect / 2));
}

/**
 * 格式化复习时间
 * @param date 日期
 * @returns 格式化后的时间字符串
 */
export function formatReviewTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return '现在可复习';
  if (diffHours < 1) return `${Math.floor(diffMs / (1000 * 60))}分钟后`;
  if (diffHours < 24) return `${Math.floor(diffHours)}小时后`;
  if (diffDays === 1) return '明天';
  if (diffDays < 7) return `${diffDays}天后`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周后`;
  return `${Math.floor(diffDays / 30)}月后`;
}
