/**
 * 学习内容适配器（Learning Content Adapter）
 * 根据用户年级向下兼容地推荐学习内容
 */

import { getDb } from '../db';
import {
  wordFamilies,
  words,
  wordTransformations,
  collocations,
  userWordFamilyProgress,
  type WordFamilyWithRelations,
} from './shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface LearningContent {
  grade: string;
  wordFamilies: WordFamilyWithRelations[];
  stats: {
    totalWords: number;
    currentGradeWords: number;
    reviewWords: number;
  };
}

/**
 * 年级向下兼容映射
 */
const GRADE_COMPATIBILITY: Record<string, string[]> = {
  '6年级': ['6年级'],
  '7年级': ['6年级', '7年级'],
  '8年级': ['6年级', '7年级', '8年级'],
  '9年级': ['6年级', '7年级', '8年级', '9年级'],
};

/**
 * 获取用户可访问的年级列表（向下兼容）
 */
export function getAccessibleGrades(userGrade: string): string[] {
  return GRADE_COMPATIBILITY[userGrade] || [userGrade];
}

/**
 * 为用户适配词族（向下兼容）
 */
export async function adaptWordFamiliesForUser(
  userGrade: string,
  limit: number = 50
): Promise<WordFamilyWithRelations[]> {
  const db = await getDb();
  const accessibleGrades = getAccessibleGrades(userGrade);

  // 查询主要年级在可访问范围内的词族
  const families = await db
    .select()
    .from(wordFamilies)
    .where(
      sql`${wordFamilies.grade} = ANY(${accessibleGrades})`
    )
    .limit(limit);

  // 为每个词族获取关联内容（按年级筛选）
  const adaptedFamilies: WordFamilyWithRelations[] = [];

  for (const family of families) {
    // 获取该词族的所有单词（不限制年级，全部显示）
    const familyWords = await db
      .select()
      .from(words)
      .where(eq(words.wordFamilyId, family.id));

    // 按年级分组
    const wordsByGrade: Record<string, typeof familyWords> = {
      '6年级': [],
      '7年级': [],
      '8年级': [],
      '9年级': [],
    };

    for (const word of familyWords) {
      const grade = word.grade || '8年级';
      if (wordsByGrade[grade]) {
        wordsByGrade[grade].push(word);
      }
    }

    // 只保留可访问年级的单词
    const accessibleWords = familyWords.filter(w =>
      accessibleGrades.includes(w.grade || '8年级')
    );

    // 检查是否有可访问的单词
    if (accessibleWords.length === 0) {
      continue;
    }

    // 获取词转（不限制年级）
    const familyTransformations = await db
      .select()
      .from(wordTransformations)
      .where(eq(wordTransformations.wordFamilyId, family.id));

    // 获取搭配（不限制年级）
    const allCollocations = await db.select().from(collocations);
    const familyCollocations = allCollocations.filter(col =>
      col.phrase.toLowerCase().includes(family.baseWord.toLowerCase())
    );

    adaptedFamilies.push({
      family: {
        ...family,
        // 标注这是该用户可见的词族
      },
      words: accessibleWords, // 只显示可访问年级的单词
      transformations: familyTransformations, // 不限制年级
      collocations: familyCollocations, // 不限制年级
    });
  }

  return adaptedFamilies;
}

/**
 * 获取用户的学习内容统计
 */
export async function getUserLearningStats(userId: string, userGrade: string): Promise<{
  totalFamilies: number;
  completedFamilies: number;
  dueFamilies: number;
  totalWords: number;
  currentGradeWords: number;
  reviewWords: number;
  masteryLevel: number;
}> {
  const db = await getDb();
  const accessibleGrades = getAccessibleGrades(userGrade);

  // 获取用户可见的词族
  const allFamilies = await db
    .select()
    .from(wordFamilies)
    .where(
      sql`${wordFamilies.grade} = ANY(${accessibleGrades})`
    );

  // 获取用户学习进度
  const allProgress = await db
    .select()
    .from(userWordFamilyProgress)
    .where(eq(userWordFamilyProgress.userId, userId));

  // 获取到复习时间的词族
  const now = new Date().toISOString();
  const dueProgress = allProgress.filter(p => p.nextReviewDate <= now);

  // 统计单词
  let totalWords = 0;
  let currentGradeWords = 0;
  let reviewWords = 0;

  for (const family of allFamilies) {
    const familyWords = await db
      .select()
      .from(words)
      .where(eq(words.wordFamilyId, family.id));

    for (const word of familyWords) {
      const wordGrade = word.grade || '8年级';
      if (accessibleGrades.includes(wordGrade)) {
        totalWords++;

        if (wordGrade === userGrade) {
          currentGradeWords++;
        } else {
          reviewWords++;
        }
      }
    }
  }

  // 计算平均掌握度
  const avgMasteryLevel = allProgress.length > 0
    ? allProgress.reduce((sum, p) => sum + p.masteryLevel, 0) / allProgress.length
    : 0;

  return {
    totalFamilies: allFamilies.length,
    completedFamilies: allProgress.filter(p => p.masteryLevel >= 5).length,
    dueFamilies: dueProgress.length,
    totalWords,
    currentGradeWords,
    reviewWords,
    masteryLevel: Math.round(avgMasteryLevel),
  };
}

/**
 * 为新用户推荐学习计划
 */
export async function generateLearningPlan(
  userGrade: string
): Promise<{
  currentGrade: string;
  recommendedFamilies: string[];
  schedule: Array<{
    phase: string;
    grade: string;
    families: number;
    estimatedDays: number;
  }>;
}> {
  const accessibleGrades = getAccessibleGrades(userGrade);
  const db = await getDb();

  const families = await db
    .select()
    .from(wordFamilies)
    .where(
      sql`${wordFamilies.grade} = ANY(${accessibleGrades})`
    );

  // 按年级分组
  const familiesByGrade: Record<string, typeof families> = {};
  for (const family of families) {
    const grade = family.grade || '8年级';
    if (!familiesByGrade[grade]) {
      familiesByGrade[grade] = [];
    }
    familiesByGrade[grade].push(family);
  }

  // 生成学习计划
  const schedule: any[] = [];
  const recommendedFamilies: string[] = [];

  for (const grade of accessibleGrades) {
    const gradeFamilies = familiesByGrade[grade] || [];
    recommendedFamilies.push(...gradeFamilies.map(f => f.id));

    schedule.push({
      phase: grade === userGrade ? '新学内容' : '复习内容',
      grade,
      families: gradeFamilies.length,
      estimatedDays: Math.ceil(gradeFamilies.length / 3), // 每天3个词族
    });
  }

  return {
    currentGrade: userGrade,
    recommendedFamilies,
    schedule,
  };
}
