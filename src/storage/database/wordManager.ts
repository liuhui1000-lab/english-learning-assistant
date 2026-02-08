import { eq, and, SQL, sql } from "drizzle-orm";
import { getDb } from "@/utils/db";
import { words, userWordProgress, insertWordSchema, type Word, type InsertWord } from "./shared/schema";

export class WordManager {
  async createWord(data: InsertWord): Promise<Word> {
    const db = await getDb();
    const validated = insertWordSchema.parse(data);
    const [word] = await db.insert(words).values(validated).returning();
    return word;
  }

  async getWords(options: { skip?: number; limit?: number } = {}): Promise<Word[]> {
    const { skip = 0, limit = 100 } = options;
    const db = await getDb();
    return db.select().from(words).limit(limit).offset(skip);
  }

  async getAllWords(): Promise<Word[]> {
    const db = await getDb();
    return db.select().from(words);
  }

  async getWordById(id: string): Promise<Word | null> {
    const db = await getDb();
    const [word] = await db.select().from(words).where(eq(words.id, id));
    return word || null;
  }

  async getUserProgress(userId: string, options: { skip?: number; limit?: number } = {}): Promise<any[]> {
    const { skip = 0, limit = 100 } = options;
    const db = await getDb();
    return db
      .select({
        wordId: userWordProgress.wordId,
        masteryLevel: userWordProgress.masteryLevel,
        reviewCount: userWordProgress.reviewCount,
        lastReviewAt: userWordProgress.lastReviewAt,
        nextReviewAt: userWordProgress.nextReviewAt,
        word: words.word,
        meaning: words.meaning,
        example: words.example,
      })
      .from(userWordProgress)
      .innerJoin(words, eq(userWordProgress.wordId, words.id))
      .where(eq(userWordProgress.userId, userId))
      .limit(limit)
      .offset(skip);
  }

  async updateProgress(
    userId: string,
    wordId: string,
    data: {
      masteryLevel: number;
      reviewCount: number;
      nextReviewAt: Date;
    }
  ): Promise<any> {
    const db = await getDb();
    const now = new Date();
    const [progress] = await db
      .update(userWordProgress)
      .set({
        ...data,
        lastReviewAt: now.toISOString(),
        updatedAt: now.toISOString(),
        nextReviewAt: data.nextReviewAt.toISOString(),
      })
      .where(and(eq(userWordProgress.userId, userId), eq(userWordProgress.wordId, wordId)))
      .returning();
    return progress;
  }

  async addProgress(
    userId: string,
    wordId: string,
    masteryLevel: number,
    nextReviewAt: Date
  ): Promise<any> {
    const db = await getDb();
    const now = new Date();
    const [progress] = await db
      .insert(userWordProgress)
      .values({
        userId,
        wordId,
        masteryLevel,
        reviewCount: 1,
        lastReviewAt: now.toISOString(),
        nextReviewAt: nextReviewAt.toISOString(),
      })
      .returning();
    return progress;
  }

  async getReviewWords(userId: string, limit: number = 20): Promise<any[]> {
    const db = await getDb();
    const now = new Date();
    return db
      .select({
        wordId: userWordProgress.wordId,
        masteryLevel: userWordProgress.masteryLevel,
        word: words.word,
        meaning: words.meaning,
        example: words.example,
      })
      .from(userWordProgress)
      .innerJoin(words, eq(userWordProgress.wordId, words.id))
      .where(
        and(
          eq(userWordProgress.userId, userId),
          sql`${userWordProgress.nextReviewAt} <= ${now}`
        )
      )
      .limit(limit);
  }
}

export const wordManager = new WordManager();
