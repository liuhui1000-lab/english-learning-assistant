import { eq, and, SQL, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  grammarPoints,
  grammarMistakes,
  insertGrammarMistakeSchema,
  type GrammarPoint,
  type GrammarMistake,
  type InsertGrammarMistake,
} from "./shared/schema";

export class GrammarManager {
  async createGrammarPoint(name: string, description: string, category: string, level: string = '8年级'): Promise<GrammarPoint> {
    const db = await getDb();
    const [point] = await db
      .insert(grammarPoints)
      .values({ name, description, category, level })
      .returning();
    return point;
  }

  async getGrammarPoints(): Promise<GrammarPoint[]> {
    const db = await getDb();
    return db.select().from(grammarPoints).orderBy(grammarPoints.category);
  }

  async getGrammarPointById(id: string): Promise<GrammarPoint | null> {
    const db = await getDb();
    const [point] = await db.select().from(grammarPoints).where(eq(grammarPoints.id, id));
    return point || null;
  }

  async createMistake(data: InsertGrammarMistake): Promise<GrammarMistake> {
    const db = await getDb();
    // 直接插入数据，避免 Zod schema 的类型兼容性问题
    const [mistake] = await db.insert(grammarMistakes).values(data).returning();
    return mistake as GrammarMistake;
  }

  async getUserMistakes(userId: string, options: { skip?: number; limit?: number } = {}): Promise<any[]> {
    const { skip = 0, limit = 100 } = options;
    const db = await getDb();
    return db
      .select({
        mistakeId: grammarMistakes.id,
        question: grammarMistakes.question,
        wrongAnswer: grammarMistakes.wrongAnswer,
        correctAnswer: grammarMistakes.correctAnswer,
        explanation: grammarMistakes.explanation,
        analysis: grammarMistakes.analysis,
        mastered: grammarMistakes.mastered,
        createdAt: grammarMistakes.createdAt,
        grammarPointName: grammarPoints.name,
        grammarPointDescription: grammarPoints.description,
        grammarPointCategory: grammarPoints.category,
      })
      .from(grammarMistakes)
      .innerJoin(grammarPoints, eq(grammarMistakes.grammarPointId, grammarPoints.id))
      .where(eq(grammarMistakes.userId, userId))
      .orderBy(desc(grammarMistakes.createdAt))
      .limit(limit)
      .offset(skip);
  }

  async getMistakesByGrammarPoint(userId: string, grammarPointId: string): Promise<GrammarMistake[]> {
    const db = await getDb();
    return db
      .select()
      .from(grammarMistakes)
      .where(and(eq(grammarMistakes.userId, userId), eq(grammarMistakes.grammarPointId, grammarPointId)));
  }

  async markMistakeMastered(mistakeId: string): Promise<GrammarMistake | null> {
    const db = await getDb();
    const [mistake] = await db
      .update(grammarMistakes)
      .set({ mastered: true })
      .where(eq(grammarMistakes.id, mistakeId))
      .returning();
    return mistake || null;
  }

  async getWeakPoints(userId: string, limit: number = 5): Promise<any[]> {
    const db = await getDb();
    return db
      .select({
        grammarPointName: grammarPoints.name,
        grammarPointId: grammarPoints.id,
        mistakeCount: sql<number>`count(*)`.as("mistake_count"),
      })
      .from(grammarMistakes)
      .innerJoin(grammarPoints, eq(grammarMistakes.grammarPointId, grammarPoints.id))
      .where(and(eq(grammarMistakes.userId, userId), eq(grammarMistakes.mastered, false)))
      .groupBy(grammarPoints.id, grammarPoints.name)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);
  }
}

export const grammarManager = new GrammarManager();
