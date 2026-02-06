// 为 schema 添加 insert 和 select 类型

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  words,
  userWordProgress,
  collocations,
  articles,
  userReadingProgress,
  grammarExercises,
} from './schema';

// Words
export const insertWordSchema = createInsertSchema(words);
export const selectWordSchema = createSelectSchema(words);
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = z.infer<typeof selectWordSchema>;

// Collocations
export const insertCollocationSchema = createInsertSchema(collocations);
export const selectCollocationSchema = createSelectSchema(collocations);
export type InsertCollocation = z.infer<typeof insertCollocationSchema>;
export type Collocation = z.infer<typeof selectCollocationSchema>;

// Articles
export const insertArticleSchema = createInsertSchema(articles);
export const selectArticleSchema = createSelectSchema(articles);
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = z.infer<typeof selectArticleSchema>;

// Grammar Exercises
export const insertGrammarExerciseSchema = createInsertSchema(grammarExercises);
export const selectGrammarExerciseSchema = createSelectSchema(grammarExercises);
export type InsertGrammarExercise = z.infer<typeof insertGrammarExerciseSchema>;
export type GrammarExercise = z.infer<typeof selectGrammarExerciseSchema>;
