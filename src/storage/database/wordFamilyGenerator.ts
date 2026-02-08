/**
 * 词族生成器（Word Family Generator）
 * 基于词转表生成词族，并关联单词和词转
 */

import { getDb } from '@/utils/db';
import {
  wordFamilies,
  words,
  wordTransformations,
  type WordFamily,
} from './shared/schema';
import { eq, inArray } from 'drizzle-orm';

export interface GeneratedWordFamily {
  baseWord: string;
  familyName: string;
  transformations: string[];
  grade?: string;
  sourceCount: number;
}

/**
 * 基于词转表生成词族列表
 */
export async function generateWordFamiliesFromTransformations(): Promise<GeneratedWordFamily[]> {
  const db = await getDb();

  // 查询所有词转
  const allTransformations = await db.select().from(wordTransformations);

  // 按基础词分组
  const familyMap = new Map<string, string[]>();

  for (const transformation of allTransformations) {
    const baseWord = transformation.baseWord.toLowerCase();

    // 解析 transformations JSON 获取所有变形
    const transformations = transformation.transformations as any[];
    const relatedWords = transformations.map(t => t.word || t.targetWord || baseWord);

    // 添加到词族
    if (familyMap.has(baseWord)) {
      const existing = familyMap.get(baseWord)!;
      familyMap.set(baseWord, [...new Set([...existing, ...relatedWords, baseWord])]);
    } else {
      familyMap.set(baseWord, [...new Set([...relatedWords, baseWord])]);
    }
  }

  // 转换为词族列表
  const families: GeneratedWordFamily[] = [];

  for (const [baseWord, relatedWords] of familyMap.entries()) {
    // 查找相关单词确定主要年级
    const relatedWordRecords = await db
      .select()
      .from(words)
      .where(
        inArray(words.word, relatedWords.map(w => w.toLowerCase()))
      );

    // 确定主要年级（取最早出现的年级）
    let grade = '8年级';
    const gradeOrder = ['6年级', '7年级', '8年级', '9年级'];

    for (const wordRecord of relatedWordRecords) {
      const gradeIndex = gradeOrder.indexOf(wordRecord.grade || '8年级');
      const currentGradeIndex = gradeOrder.indexOf(grade);
      if (gradeIndex !== -1 && gradeIndex < currentGradeIndex) {
        grade = wordRecord.grade || '8年级';
      }
    }

    families.push({
      baseWord,
      familyName: `${baseWord} 词族`,
      transformations: relatedWords.filter(w => w !== baseWord),
      grade,
      sourceCount: relatedWordRecords.length,
    });
  }

  return families;
}

/**
 * 创建词族并关联内容
 */
export async function createWordFamilyFromTransformation(
  family: GeneratedWordFamily
): Promise<WordFamily> {
  const db = await getDb();

  // 检查词族是否已存在
  const existing = await db
    .select()
    .from(wordFamilies)
    .where(eq(wordFamilies.baseWord, family.baseWord));

  if (existing.length > 0) {
    return existing[0];
  }

  // 创建词族
  const [newFamily] = await db
    .insert(wordFamilies)
    .values({
      baseWord: family.baseWord,
      familyName: family.familyName,
      grade: family.grade || '8年级',
      sourceType: 'exam',
      sourceInfo: '基于词转表生成',
      difficulty: 1,
    })
    .returning();

  // 关联词转到词族
  const transformations = await db
    .select()
    .from(wordTransformations)
    .where(eq(wordTransformations.baseWord, family.baseWord));

  for (const transformation of transformations) {
    await db
      .update(wordTransformations)
      .set({ wordFamilyId: newFamily.id })
      .where(eq(wordTransformations.id, transformation.id));
  }

  // 关联单词到词族
  for (const word of family.transformations) {
    const wordRecords = await db
      .select()
      .from(words)
      .where(eq(words.word, word.toLowerCase()));

    for (const wordRecord of wordRecords) {
      await db
        .update(words)
        .set({ wordFamilyId: newFamily.id })
        .where(eq(words.id, wordRecord.id));
    }
  }

  return newFamily;
}

/**
 * 批量生成词族
 */
export async function batchGenerateWordFamilies(
  skipExisting: boolean = true
): Promise<{
  total: number;
  created: number;
  skipped: number;
  families: Array<{
    baseWord: string;
    familyId?: string;
    wordCount: number;
    transformationCount: number;
    created: boolean;
  }>;
}> {
  // 生成词族列表
  const families = await generateWordFamiliesFromTransformations();

  const results = {
    total: families.length,
    created: 0,
    skipped: 0,
    families: [] as any[],
  };

  for (const family of families) {
    try {
      const existing = await getDb()
        .select()
        .from(wordFamilies)
        .where(eq(wordFamilies.baseWord, family.baseWord));

      if (existing.length > 0 && skipExisting) {
        results.skipped++;
        results.families.push({
          baseWord: family.baseWord,
          familyId: existing[0].id,
          wordCount: family.transformations.length,
          transformationCount: 1, // 简化处理
          created: false,
        });
        continue;
      }

      const created = await createWordFamilyFromTransformation(family);
      results.created++;
      results.families.push({
        baseWord: family.baseWord,
        familyId: created.id,
        wordCount: family.transformations.length,
        transformationCount: 1,
        created: true,
      });
    } catch (error: any) {
      console.error(`创建词族 ${family.baseWord} 失败:`, error);
    }
  }

  return results;
}

/**
 * 根据用户年级获取推荐的词族
 */
export async function getRecommendedFamiliesForUser(
  userGrade: string
): Promise<WordFamily[]> {
  const db = await getDb();

  const gradeOrder = ['6年级', '7年级', '8年级', '9年级'];
  const userGradeIndex = gradeOrder.indexOf(userGrade);

  if (userGradeIndex === -1) {
    return [];
  }

  // 查询到当前年级及之前的词族
  const allowedGrades = gradeOrder.slice(0, userGradeIndex + 1);

  const families = await db
    .select()
    .from(wordFamilies)
    .where(
      inArray(wordFamilies.grade, allowedGrades)
    );

  // 为每个词族获取详情，确保包含该年级的单词
  const recommendedFamilies: WordFamily[] = [];

  for (const family of families) {
    // 查询该词族的单词
    const familyWords = await db
      .select()
      .from(words)
      .where(eq(words.wordFamilyId, family.id));

    // 检查是否有该年级及之前的单词
    const hasValidWords = familyWords.some(w => {
      const wordGradeIndex = gradeOrder.indexOf(w.grade || '8年级');
      return wordGradeIndex !== -1 && wordGradeIndex <= userGradeIndex;
    });

    if (hasValidWords) {
      recommendedFamilies.push(family);
    }
  }

  return recommendedFamilies;
}
