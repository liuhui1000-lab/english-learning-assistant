import { eq, SQL, like } from "drizzle-orm";
import { getDb } from "@/utils/db";
import { collocations, insertCollocationSchema, type Collocation, type InsertCollocation } from "./shared/schema";

export class CollocationManager {
  async createCollocation(data: InsertCollocation): Promise<Collocation> {
    const db = await getDb();
    const validated = insertCollocationSchema.parse(data);
    const [collocation] = await db.insert(collocations).values(validated).returning();
    return collocation;
  }

  async getCollocations(options: { skip?: number; limit?: number } = {}): Promise<Collocation[]> {
    const { skip = 0, limit = 100 } = options;
    const db = await getDb();
    return db.select().from(collocations).limit(limit).offset(skip);
  }

  async getCollocationsByCategory(category: string): Promise<Collocation[]> {
    const db = await getDb();
    return db.select().from(collocations).where(eq(collocations.category, category));
  }

  async getCollocationById(id: string): Promise<Collocation | null> {
    const db = await getDb();
    const [collocation] = await db.select().from(collocations).where(eq(collocations.id, id));
    return collocation || null;
  }

  async searchCollocations(keyword: string): Promise<Collocation[]> {
    const db = await getDb();
    return db.select().from(collocations).where(like(collocations.phrase, `%${keyword}%`));
  }
}

export const collocationManager = new CollocationManager();
