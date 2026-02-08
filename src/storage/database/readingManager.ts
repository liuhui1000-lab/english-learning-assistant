import { eq, and, SQL, sql } from "drizzle-orm";
import { getDb } from "@/utils/db";
import {
  articles,
  userReadingProgress,
  insertArticleSchema,
  type Article,
  type InsertArticle,
} from "./shared/schema";

export class ReadingManager {
  async createArticle(data: InsertArticle): Promise<Article> {
    const db = await getDb();
    // 直接插入数据，避免 Zod schema 的类型兼容性问题
    const [article] = await db.insert(articles).values(data).returning();
    return article as Article;
  }

  async getArticles(options: { skip?: number; limit?: number } = {}): Promise<Article[]> {
    const { skip = 0, limit = 100 } = options;
    const db = await getDb();
    return db.select().from(articles).limit(limit).offset(skip);
  }

  async getArticlesByLevel(level: string): Promise<Article[]> {
    const db = await getDb();
    return db.select().from(articles).where(eq(articles.level, level));
  }

  async getArticleById(id: string): Promise<Article | null> {
    const db = await getDb();
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || null;
  }

  async recordProgress(
    userId: string,
    articleId: string,
    score: number,
    timeSpent: number,
    completed: boolean = false
  ): Promise<any> {
    const db = await getDb();
    const [progress] = await db
      .insert(userReadingProgress)
      .values({
        userId,
        articleId,
        score,
        timeSpent,
        completed,
      })
      .returning();
    return progress;
  }

  async getUserProgress(userId: string): Promise<any[]> {
    const db = await getDb();
    return db
      .select({
        articleId: userReadingProgress.articleId,
        score: userReadingProgress.score,
        completed: userReadingProgress.completed,
        timeSpent: userReadingProgress.timeSpent,
        articleTitle: articles.title,
        articleLevel: articles.level,
        articleWordCount: articles.wordCount,
      })
      .from(userReadingProgress)
      .innerJoin(articles, eq(userReadingProgress.articleId, articles.id))
      .where(eq(userReadingProgress.userId, userId));
  }

  async getUserStats(userId: string): Promise<any> {
    const db = await getDb();
    const result = await db
      .select({
        totalArticles: sql<number>`count(*)`.as("total_articles"),
        totalTimeSpent: sql<number>`sum(${userReadingProgress.timeSpent})`.as("total_time_spent"),
        averageScore: sql<number>`avg(${userReadingProgress.score})`.as("average_score"),
      })
      .from(userReadingProgress)
      .where(eq(userReadingProgress.userId, userId));

    return result[0] || {
      totalArticles: 0,
      totalTimeSpent: 0,
      averageScore: 0,
    };
  }
}

export const readingManager = new ReadingManager();
