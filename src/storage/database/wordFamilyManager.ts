/**
 * 词族管理器（Word Family Manager）
 * 管理词族、单词、词转、搭配之间的关联关系
 */

import { getDb } from '@/utils/db';
import {
  wordFamilies,
  words,
  wordTransformations,
  collocations,
  userWordFamilyProgress,
  type WordFamily,
  type Word,
  type WordTransformation,
  type Collocation,
} from './shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface WordFamilyWithRelations {
  family: WordFamily;
  words: Word[];
  transformations: WordTransformation[];
  collocations: Collocation[];
}

export class WordFamilyManager {
  /**
   * 创建词族
   */
  async createWordFamily(data: {
    baseWord: string;
    familyName: string;
    grade?: string;
    sourceType?: 'list' | 'exam' | 'mistake';
    sourceInfo?: string;
    difficulty?: number;
  }): Promise<WordFamily> {
    const db = await getDb();
    const [family] = await db
      .insert(wordFamilies)
      .values({
        baseWord: data.baseWord,
        familyName: data.familyName,
        grade: data.grade || '8年级',
        sourceType: data.sourceType || 'list',
        sourceInfo: data.sourceInfo,
        difficulty: data.difficulty || 1,
      })
      .returning();
    return family;
  }

  /**
   * 根据基础词查找词族
   */
  async getWordFamilyByBaseWord(baseWord: string): Promise<WordFamily | null> {
    const db = await getDb();
    const families = await db
      .select()
      .from(wordFamilies)
      .where(eq(wordFamilies.baseWord, baseWord.toLowerCase()));
    return families[0] || null;
  }

  /**
   * 根据单词查找词族
   */
  async getWordFamilyByWord(word: string): Promise<WordFamily | null> {
    const db = await getDb();
    const wordRecords = await db
      .select()
      .from(words)
      .where(eq(words.word, word.toLowerCase()));

    if (wordRecords.length === 0) {
      return null;
    }

    const wordRecord = wordRecords[0];
    if (!wordRecord.wordFamilyId) {
      return null;
    }

    const families = await db
      .select()
      .from(wordFamilies)
      .where(eq(wordFamilies.id, wordRecord.wordFamilyId));

    return families[0] || null;
  }

  /**
   * 查询词族及其所有关联内容
   */
  async getWordFamilyWithRelations(familyId: string): Promise<WordFamilyWithRelations | null> {
    const db = await getDb();

    // 查询词族
    const families = await db
      .select()
      .from(wordFamilies)
      .where(eq(wordFamilies.id, familyId));

    if (families.length === 0) {
      return null;
    }

    const family = families[0];

    // 查询关联的单词
    const familyWords = await db
      .select()
      .from(words)
      .where(eq(words.wordFamilyId, familyId));

    // 查询关联的词转
    const familyTransformations = await db
      .select()
      .from(wordTransformations)
      .where(eq(wordTransformations.wordFamilyId, familyId));

    // 查询关联的搭配（包含该词族基础词的搭配）
    const allCollocations = await db.select().from(collocations);
    const familyCollocations = allCollocations.filter(col =>
      col.phrase.toLowerCase().includes(family.baseWord.toLowerCase())
    );

    return {
      family,
      words: familyWords,
      transformations: familyTransformations,
      collocations: familyCollocations,
    };
  }

  /**
   * 添加单词到词族
   */
  async addWordToFamily(wordId: string, familyId: string): Promise<void> {
    const db = await getDb();
    await db
      .update(words)
      .set({ wordFamilyId: familyId })
      .where(eq(words.id, wordId));
  }

  /**
   * 通过单词文本添加到词族
   */
  async addWordToFamilyByText(wordText: string, familyId: string): Promise<void> {
    const db = await getDb();
    const wordRecords = await db
      .select()
      .from(words)
      .where(eq(words.word, wordText.toLowerCase()));

    if (wordRecords.length > 0) {
      await this.addWordToFamily(wordRecords[0].id, familyId);
    }
  }

  /**
   * 添加词转到词族
   */
  async addTransformationToFamily(transformationId: string, familyId: string): Promise<void> {
    const db = await getDb();
    await db
      .update(wordTransformations)
      .set({ wordFamilyId: familyId })
      .where(eq(wordTransformations.id, transformationId));
  }

  /**
   * 通过基础词添加词转到词族
   */
  async addTransformationToFamilyByBaseWord(baseWord: string, familyId: string): Promise<void> {
    const db = await getDb();
    const transformationRecords = await db
      .select()
      .from(wordTransformations)
      .where(eq(wordTransformations.baseWord, baseWord.toLowerCase()));

    if (transformationRecords.length > 0) {
      await this.addTransformationToFamily(transformationRecords[0].id, familyId);
    }
  }

  /**
   * 添加搭配到词族（通过关键词匹配）
   */
  async addCollocationsToFamily(familyId: string): Promise<number> {
    const family = await this.getWordFamilyById(familyId);
    if (!family) {
      return 0;
    }

    const db = await getDb();
    const allCollocations = await db.select().from(collocations);

    let count = 0;
    for (const collocation of allCollocations) {
      if (collocation.phrase.toLowerCase().includes(family.baseWord.toLowerCase())) {
        // 搭配表本身没有 wordFamilyId 字段，这里只是查询，不修改
        count++;
      }
    }

    return count;
  }

  /**
   * 查询所有词族
   */
  async getAllWordFamilies(): Promise<WordFamily[]> {
    const db = await getDb();
    return db
      .select()
      .from(wordFamilies)
      .orderBy(desc(wordFamilies.createdAt));
  }

  /**
   * 按年级查询词族
   */
  async getWordFamiliesByGrade(grade: string): Promise<WordFamily[]> {
    const db = await getDb();
    return db
      .select()
      .from(wordFamilies)
      .where(eq(wordFamilies.grade, grade))
      .orderBy(desc(wordFamilies.createdAt));
  }

  /**
   * 根据ID查询词族
   */
  async getWordFamilyById(id: string): Promise<WordFamily | null> {
    const db = await getDb();
    const families = await db.select().from(wordFamilies).where(eq(wordFamilies.id, id));
    return families[0] || null;
  }

  /**
   * 获取用户的词族学习进度
   */
  async getUserFamilyProgress(userId: string, familyId: string) {
    const db = await getDb();
    const progress = await db
      .select()
      .from(userWordFamilyProgress)
      .where(
        and(
          eq(userWordFamilyProgress.userId, userId),
          eq(userWordFamilyProgress.wordFamilyId, familyId)
        )
      );

    return progress[0] || null;
  }

  /**
   * 更新用户词族学习进度（艾宾浩斯）
   */
  async updateFamilyProgress(userId: string, familyId: string, nextReviewDate: Date) {
    const db = await getDb();
    const existing = await this.getUserFamilyProgress(userId, familyId);

    if (existing) {
      // 更新现有记录
      await db
        .update(userWordFamilyProgress)
        .set({
          reviewCount: existing.reviewCount + 1,
          masteryLevel: Math.min(existing.masteryLevel + 1, 5),
          nextReviewDate,
          lastReviewedAt: new Date().toISOString(),
        })
        .where(eq(userWordFamilyProgress.id, existing.id));
    } else {
      // 创建新记录
      await db.insert(userWordFamilyProgress).values({
        id: crypto.randomUUID(),
        userId,
        wordFamilyId: familyId,
        reviewCount: 1,
        masteryLevel: 1,
        nextReviewDate,
        lastReviewedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 获取需要复习的词族（艾宾浩斯）
   */
  async getDueFamilies(userId: string): Promise<WordFamily[]> {
    const db = await getDb();
    const now = new Date().toISOString();

    const dueProgress = await db
      .select()
      .from(userWordFamilyProgress)
      .where(
        and(
          eq(userWordFamilyProgress.userId, userId),
          sql`${userWordFamilyProgress.nextReviewDate} <= ${now}`
        )
      );

    if (dueProgress.length === 0) {
      return [];
    }

    const familyIds = dueProgress.map(p => p.wordFamilyId);
    const families = await db
      .select()
      .from(wordFamilies)
      .where(sql`${wordFamilies.id} = ANY(${familyIds})`);

    return families;
  }
}
