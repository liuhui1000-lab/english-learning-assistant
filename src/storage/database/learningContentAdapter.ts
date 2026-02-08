/**
 * 学习内容适配器（Learning Content Adapter）
 * 根据用户年级和学期向下兼容地推荐学习内容
 * 支持每个年级分为上学期和下学期
 */

import { getDb } from '@/utils/db';
import {
  wordFamilies,
  words,
  wordTransformations,
  collocations,
  userWordFamilyProgress,
} from './shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import type { WordFamilyWithRelations } from './wordFamilyManager';

export interface LearningContent {
  grade: string;
  semester: string;
  wordFamilies: WordFamilyWithRelations[];
  stats: {
    totalWords: number;
    currentSemesterWords: number;
    reviewWords: number;
  };
}

/**
 * 年级学期向下兼容映射
 * 每个年级分为上学期和下学期
 */
const GRADE_SEMESTER_COMPATIBILITY: Record<string, string[]> = {
  '6年级上学期': ['6年级上学期'],
  '6年级下学期': ['6年级上学期', '6年级下学期'],
  '7年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期'],
  '7年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期'],
  '8年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期'],
  '8年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期'],
  '9年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期'],
  '9年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'],
};

/**
 * 从年级学期组合中提取年级和学期
 */
export function parseGradeSemester(gradeSemester: string): { grade: string; semester: string } {
  const parts = gradeSemester.match(/(\d+年级)(上学期|下学期)/);
  if (!parts) {
    return { grade: '8年级', semester: '下学期' };
  }
  return { grade: parts[1], semester: parts[2] };
}

/**
 * 组合年级和学期
 */
export function combineGradeSemester(grade: string, semester: string): string {
  return `${grade}${semester}`;
}

/**
 * 获取用户可访问的年级学期列表（向下兼容）
 */
export function getAccessibleGradeSemesters(userGradeSemester: string): string[] {
  return GRADE_SEMESTER_COMPATIBILITY[userGradeSemester] || [userGradeSemester];
}

/**
 * 为用户适配词族（向下兼容，支持学期）
 */
export async function adaptWordFamiliesForUser(
  userGradeSemester: string,
  limit: number = 50
): Promise<WordFamilyWithRelations[]> {
  const db = await getDb();
  const { grade: userGrade, semester: userSemester } = parseGradeSemester(userGradeSemester);
  const accessibleGradeSemesters = getAccessibleGradeSemesters(userGradeSemester);

  // 解析可访问的年级学期
  const accessibleItems = accessibleGradeSemesters.map(s => parseGradeSemester(s));

  // 查询主要年级在可访问范围内的词族
  const families = await db
    .select()
    .from(wordFamilies)
    .where(
      sql`${wordFamilies.grade} = ANY(${accessibleItems.map(i => i.grade)})`
    )
    .limit(limit);

  // 为每个词族获取关联内容（按年级和学期筛选）
  const adaptedFamilies: WordFamilyWithRelations[] = [];

  for (const family of families) {
    // 获取该词族的所有单词
    const familyWords = await db
      .select()
      .from(words)
      .where(eq(words.wordFamilyId, family.id));

    // 只保留可访问年级学期的单词
    const accessibleWords = familyWords.filter(w => {
      const wordGrade = w.grade || '8年级';
      const wordSemester = w.semester || '下学期';
      const wordGradeSemester = combineGradeSemester(wordGrade, wordSemester);
      return accessibleGradeSemesters.includes(wordGradeSemester);
    });

    // 检查是否有可访问的单词
    if (accessibleWords.length === 0) {
      continue;
    }

    // 获取词转（不限制年级和学期）
    const familyTransformations = await db
      .select()
      .from(wordTransformations)
      .where(eq(wordTransformations.wordFamilyId, family.id));

    // 获取搭配（不限制年级和学期）
    const allCollocations = await db.select().from(collocations);
    const familyCollocations = allCollocations.filter(col =>
      col.phrase.toLowerCase().includes(family.baseWord.toLowerCase())
    );

    adaptedFamilies.push({
      family: {
        ...family,
      },
      words: accessibleWords, // 只显示可访问年级学期的单词
      transformations: familyTransformations, // 不限制年级和学期
      collocations: familyCollocations, // 不限制年级和学期
    });
  }

  return adaptedFamilies;
}

/**
 * 获取用户的学习内容统计（支持学期）
 */
export async function getUserLearningStats(userId: string, userGradeSemester: string): Promise<{
  totalFamilies: number;
  completedFamilies: number;
  dueFamilies: number;
  totalWords: number;
  currentSemesterWords: number;
  reviewWords: number;
  masteryLevel: number;
}> {
  const db = await getDb();
  const accessibleGradeSemesters = getAccessibleGradeSemesters(userGradeSemester);
  const accessibleItems = accessibleGradeSemesters.map(s => parseGradeSemester(s));

  // 获取用户可见的词族
  const allFamilies = await db
    .select()
    .from(wordFamilies)
    .where(
      sql`${wordFamilies.grade} = ANY(${accessibleItems.map(i => i.grade)})`
    );

  // 获取用户学习进度
  const allProgress = await db
    .select()
    .from(userWordFamilyProgress)
    .where(eq(userWordFamilyProgress.userId, userId));

  // 获取到复习时间的词族
  const now = new Date().toISOString();
  const dueProgress = allProgress.filter(p => (p.nextReviewAt || '') <= now);

  // 统计单词
  let totalWords = 0;
  let currentSemesterWords = 0;
  let reviewWords = 0;

  for (const family of allFamilies) {
    const familyWords = await db
      .select()
      .from(words)
      .where(eq(words.wordFamilyId, family.id));

    for (const word of familyWords) {
      const wordGrade = word.grade || '8年级';
      const wordSemester = word.semester || '下学期';
      const wordGradeSemester = combineGradeSemester(wordGrade, wordSemester);

      if (accessibleGradeSemesters.includes(wordGradeSemester)) {
        totalWords++;

        if (wordGradeSemester === userGradeSemester) {
          currentSemesterWords++;
        } else {
          reviewWords++;
        }
      }
    }
  }

  // 计算平均掌握度
  const avgMasteryLevel = allProgress.length > 0
    ? allProgress.reduce((sum, p) => sum + (p.masteryLevel || 0), 0) / allProgress.length
    : 0;

  return {
    totalFamilies: allFamilies.length,
    completedFamilies: allProgress.filter(p => (p.masteryLevel || 0) >= 5).length,
    dueFamilies: dueProgress.length,
    totalWords,
    currentSemesterWords,
    reviewWords,
    masteryLevel: Math.round(avgMasteryLevel),
  };
}

/**
 * 为新用户推荐学习计划（支持学期）
 */
export async function generateLearningPlan(
  userGradeSemester: string
): Promise<{
  currentGradeSemester: string;
  recommendedFamilies: string[];
  schedule: Array<{
    phase: string;
    gradeSemester: string;
    families: number;
    estimatedDays: number;
  }>;
}> {
  const accessibleGradeSemesters = getAccessibleGradeSemesters(userGradeSemester);
  const db = await getDb();
  const accessibleItems = accessibleGradeSemesters.map(s => parseGradeSemester(s));

  const families = await db
    .select()
    .from(wordFamilies)
    .where(
      sql`${wordFamilies.grade} = ANY(${accessibleItems.map(i => i.grade)})`
    );

  // 按年级学期分组
  const familiesByGradeSemester: Record<string, typeof families> = {};
  for (const family of families) {
    const familyGrade = family.grade || '8年级';
    const familySemester = family.semester || '下学期';
    const gradeSemester = combineGradeSemester(familyGrade, familySemester);

    if (!familiesByGradeSemester[gradeSemester]) {
      familiesByGradeSemester[gradeSemester] = [];
    }
    familiesByGradeSemester[gradeSemester].push(family);
  }

  // 生成学习计划
  const schedule: any[] = [];
  const recommendedFamilies: string[] = [];

  for (const gradeSemester of accessibleGradeSemesters) {
    const gradeSemesterFamilies = familiesByGradeSemester[gradeSemester] || [];
    recommendedFamilies.push(...gradeSemesterFamilies.map(f => f.id));

    schedule.push({
      phase: gradeSemester === userGradeSemester ? '新学内容' : '复习内容',
      gradeSemester,
      families: gradeSemesterFamilies.length,
      estimatedDays: Math.ceil(gradeSemesterFamilies.length / 3), // 每天3个词族
    });
  }

  return {
    currentGradeSemester: userGradeSemester,
    recommendedFamilies,
    schedule,
  };
}

/**
 * 获取所有年级学期组合
 */
export function getAllGradeSemesters(): string[] {
  return [
    '6年级上学期',
    '6年级下学期',
    '7年级上学期',
    '7年级下学期',
    '8年级上学期',
    '8年级下学期',
    '9年级上学期',
    '9年级下学期',
  ];
}
