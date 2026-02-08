import { pgTable, index, varchar, text, integer, timestamp, foreignKey, jsonb, boolean, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"


// 词族表（新增）
export const wordFamilies = pgTable("word_families", {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    baseWord: varchar("base_word", { length: 100 }).notNull(),
    familyName: varchar("family_name", { length: 100 }).notNull(),
    sourceType: varchar("source_type", { length: 20 }).default('list').notNull(), // 'list' | 'exam' | 'mistake'
    sourceInfo: varchar("source_info", { length: 200 }), // '6年级清单' | '2025年模拟卷A' | '错题收集'
    difficulty: integer().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    index("word_families_base_word_idx").using("btree", table.baseWord.asc().nullsLast().op("text_ops")),
    index("word_families_source_type_idx").using("btree", table.sourceType.asc().nullsLast().op("text_ops")),
])


export const collocations = pgTable("collocations", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        phrase: varchar({ length: 100 }).notNull(),
        meaning: text().notNull(),
        example: text(),
        exampleTranslation: text("example_translation"),
        category: varchar({ length: 50 }),
        difficulty: integer().default(1),
        sourceType: varchar("source_type", { length: 20 }).default('list').notNull(), // 'list' | 'exam' | 'mistake'
        sourceInfo: varchar("source_info", { length: 200 }), // '6年级清单' | '2025年模拟卷A'
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("collocations_phrase_idx").using("btree", table.phrase.asc().nullsLast().op("text_ops")),
]);

export const grammarPoints = pgTable("grammar_points", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        name: varchar({ length: 100 }).notNull(),
        description: text(),
        category: varchar({ length: 50 }),
        level: varchar("level", { length: 20 }), // '6年级' | '7年级' | '8年级' | '9年级'
        difficulty: integer().default(1),
        sourceType: varchar("source_type", { length: 20 }).default('preset').notNull(), // 'preset' | 'exam'
        sourceInfo: varchar("source_info", { length: 200 }), // '系统预设' | '2025年模拟卷A'
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("grammar_points_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const grammarMistakes = pgTable("grammar_mistakes", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        grammarPointId: varchar("grammar_point_id", { length: 36 }).notNull(),
        question: text().notNull(),
        wrongAnswer: text("wrong_answer"),
        correctAnswer: text("correct_answer"),
        explanation: text(),
        analysis: jsonb(),
        mastered: boolean().default(false),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("grammar_mistakes_grammar_point_id_idx").using("btree", table.grammarPointId.asc().nullsLast().op("text_ops")),
        index("grammar_mistakes_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.grammarPointId],
                        foreignColumns: [grammarPoints.id],
                        name: "grammar_mistakes_grammar_point_id_grammar_points_id_fk"
                }),
]);

export const articles = pgTable("articles", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        title: varchar({ length: 200 }).notNull(),
        content: text().notNull(),
        level: varchar({ length: 20 }).notNull(),
        wordCount: integer("word_count").default(0),
        readTime: integer("read_time").default(0),
        category: varchar({ length: 50 }),
        questions: jsonb(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("articles_level_idx").using("btree", table.level.asc().nullsLast().op("text_ops")),
        index("articles_title_idx").using("btree", table.title.asc().nullsLast().op("text_ops")),
]);

export const userReadingProgress = pgTable("user_reading_progress", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        articleId: varchar("article_id", { length: 36 }).notNull(),
        score: integer().default(0),
        completed: boolean().default(false),
        timeSpent: integer("time_spent").default(0),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.articleId],
                        foreignColumns: [articles.id],
                        name: "user_reading_progress_article_id_articles_id_fk"
                }),
]);

export const words = pgTable("words", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        wordFamilyId: varchar("word_family_id", { length: 36 }), // 关联词族
        word: varchar({ length: 100 }).notNull(),
        wordType: varchar("word_type", { length: 20 }), // 'noun' | 'adj' | 'verb' | 'adv'
        phonetic: varchar({ length: 100 }),
        meaning: text().notNull(),
        example: text(),
        exampleTranslation: text("example_translation"),
        difficulty: integer().default(1),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("words_word_idx").using("btree", table.word.asc().nullsLast().op("text_ops")),
        index("words_word_family_id_idx").using("btree", table.wordFamilyId.asc().nullsLast().op("text_ops")),
        unique("words_word_unique").on(table.word),
        foreignKey({
                        columns: [table.wordFamilyId],
                        foreignColumns: [wordFamilies.id],
                        name: "words_word_family_id_fkey"
                }).onDelete("set null"),
]);

export const userWordProgress = pgTable("user_word_progress", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        wordId: varchar("word_id", { length: 36 }).notNull(),
        masteryLevel: integer("mastery_level").default(0),
        reviewCount: integer("review_count").default(0),
        lastReviewAt: timestamp("last_review_at", { withTimezone: true, mode: 'string' }),
        nextReviewAt: timestamp("next_review_at", { withTimezone: true, mode: 'string' }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
        errorCount: integer("error_count").default(0),
        consecutiveCorrect: integer("consecutive_correct").default(0),
        learningSessions: integer("learning_sessions").default(0),
}, (table) => [
        foreignKey({
                        columns: [table.wordId],
                        foreignColumns: [words.id],
                        name: "user_word_progress_word_id_words_id_fk"
                }),
]);

export const userTransformationProgress = pgTable("user_transformation_progress", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        transformationId: varchar("transformation_id", { length: 36 }).notNull(),
        word: varchar({ length: 100 }).notNull(),
        masteryLevel: integer("mastery_level").default(0),
        reviewCount: integer("review_count").default(0),
        correctCount: integer("correct_count").default(0),
        wrongCount: integer("wrong_count").default(0),
        lastReviewAt: timestamp("last_review_at", { withTimezone: true, mode: 'string' }),
        nextReviewAt: timestamp("next_review_at", { withTimezone: true, mode: 'string' }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
        index("user_transformation_progress_next_review_at_idx").using("btree", table.nextReviewAt.asc().nullsLast().op("timestamptz_ops")),
        index("user_transformation_progress_transformation_id_idx").using("btree", table.transformationId.asc().nullsLast().op("text_ops")),
        index("user_transformation_progress_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const wordTransformations = pgTable("word_transformations", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        wordFamilyId: varchar("word_family_id", { length: 36 }), // 关联词族
        baseWord: varchar("base_word", { length: 100 }).notNull(),
        baseMeaning: text("base_meaning").notNull(),
        transformations: jsonb().notNull(),
        difficulty: integer().default(1),
        sourceType: varchar("source_type", { length: 20 }).default('list').notNull(), // 'list' | 'exam' | 'mistake'
        sourceInfo: varchar("source_info", { length: 200 }), // '6年级清单' | '2025年模拟卷A'
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("word_transformations_base_word_idx").using("btree", table.baseWord.asc().nullsLast().op("text_ops")),
        index("word_transformations_word_family_id_idx").using("btree", table.wordFamilyId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.wordFamilyId],
                        foreignColumns: [wordFamilies.id],
                        name: "word_transformations_word_family_id_fkey"
                }).onDelete("set null"),
]);

export const transformationMistakes = pgTable("transformation_mistakes", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        transformationId: varchar("transformation_id", { length: 36 }).notNull(),
        word: varchar({ length: 100 }).notNull(),
        type: varchar({ length: 100 }).notNull(),
        sentence: text().notNull(),
        wrongAnswer: text("wrong_answer"),
        correctAnswer: text("correct_answer").notNull(),
        mistakeType: varchar("mistake_type", { length: 50 }),
        explanation: text(),
        mastered: boolean().default(false),
        errorCount: integer("error_count").default(1),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
        index("transformation_mistakes_transformation_id_idx").using("btree", table.transformationId.asc().nullsLast().op("text_ops")),
        index("transformation_mistakes_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
        index("transformation_mistakes_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.transformationId],
                        foreignColumns: [wordTransformations.id],
                        name: "transformation_mistakes_transformation_id_fkey"
                }),
]);

export const grammarExercises = pgTable("grammar_exercises", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        grammarPointId: varchar("grammar_point_id", { length: 36 }),
        question: text().notNull(),
        type: varchar({ length: 50 }).notNull(),
        options: jsonb(),
        correctAnswer: text("correct_answer").notNull(),
        explanation: text(),
        difficulty: integer().default(1),
        source: varchar({ length: 100 }),
        questionNumber: varchar("question_number", { length: 20 }),
        category: varchar({ length: 50 }),
        subcategory: varchar({ length: 100 }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        collocationId: varchar("collocation_id", { length: 36 }),
}, (table) => [
        index("grammar_exercises_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
        index("grammar_exercises_grammar_point_id_idx").using("btree", table.grammarPointId.asc().nullsLast().op("text_ops")),
        index("grammar_exercises_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.grammarPointId],
                        foreignColumns: [grammarPoints.id],
                        name: "grammar_exercises_grammar_point_id_fkey"
                }).onDelete("set null"),
]);

export const grammarPracticeRecords = pgTable("grammar_practice_records", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        exerciseId: varchar("exercise_id", { length: 36 }).notNull(),
        userAnswer: text("user_answer").notNull(),
        isCorrect: boolean("is_correct").notNull(),
        timeSpent: integer("time_spent").default(0),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        index("grammar_practice_records_exercise_id_idx").using("btree", table.exerciseId.asc().nullsLast().op("text_ops")),
        index("grammar_practice_records_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.exerciseId],
                        foreignColumns: [grammarExercises.id],
                        name: "grammar_practice_records_exercise_id_fkey"
                }).onDelete("cascade"),
]);

export const grammarWeakPoints = pgTable("grammar_weak_points", {
        id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id", { length: 100 }).notNull(),
        grammarPointId: varchar("grammar_point_id", { length: 36 }).notNull(),
        category: varchar({ length: 50 }).notNull(),
        subcategory: varchar({ length: 100 }).notNull(),
        errorCount: integer("error_count").default(1),
        practiceCount: integer("practice_count").default(0),
        accuracy: integer().default(0),
        weakLevel: integer("weak_level").default(1),
        lastPracticeAt: timestamp("last_practice_at", { withTimezone: true, mode: 'string' }),
        mastered: boolean().default(false),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
        index("grammar_weak_points_grammar_point_id_idx").using("btree", table.grammarPointId.asc().nullsLast().op("text_ops")),
        index("grammar_weak_points_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        index("grammar_weak_points_weak_level_idx").using("btree", table.weakLevel.asc().nullsLast().op("int4_ops")),
        foreignKey({
                        columns: [table.grammarPointId],
                        foreignColumns: [grammarPoints.id],
                        name: "grammar_weak_points_grammar_point_id_fkey"
                }).onDelete("cascade"),
]);


export const users = pgTable("users", {
    id: varchar({ length: 36 }).primaryKey().notNull(),
    username: varchar({ length: 50 }).notNull(),
    email: varchar({ length: 100 }),
    passwordHash: varchar("password_hash", { length: 64 }).notNull(),
    fullName: varchar("full_name", { length: 100 }),
    role: varchar({ length: 20 }).default('student').notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    lastAnalysisDate: timestamp("last_analysis_date", { withTimezone: true, mode: 'string' }),
    hasNewMistakes: boolean("has_new_mistakes").default(false).notNull(),
    lastMistakeUpdated: timestamp("last_mistake_updated", { withTimezone: true, mode: 'string' }),
}, (table) => [
    index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
    index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("users_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
    unique("users_username_unique").on(table.username),
]);

export const userLoginLogs = pgTable("user_login_logs", {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    loginTime: timestamp("login_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    logoutTime: timestamp("logout_time", { withTimezone: true, mode: 'string' }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    status: varchar({ length: 20 }).default('success').notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    index("user_login_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    index("user_login_logs_login_time_idx").using("btree", table.loginTime.desc().nullsLast().op("timestamptz_ops")),
]);

export const userMistakeStats = pgTable("user_mistake_stats", {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    totalMistakes: integer("total_mistakes").default(0).notNull(),
    grammarMistakes: integer("grammar_mistakes").default(0).notNull(),
    vocabularyMistakes: integer("vocabulary_mistakes").default(0).notNull(),
    readingMistakes: integer("reading_mistakes").default(0).notNull(),
    transformationMistakes: integer("transformation_mistakes").default(0).notNull(),
    masteredCount: integer("mastered_count").default(0).notNull(),
    lastAnalysisDate: timestamp("last_analysis_date", { withTimezone: true, mode: 'string' }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    index("user_mistake_stats_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    index("user_mistake_stats_last_analysis_date_idx").using("btree", table.lastAnalysisDate.desc().nullsLast().op("timestamptz_ops")),
]);

// 用户词族学习进度表（新增）
export const userWordFamilyProgress = pgTable("user_word_family_progress", {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    wordFamilyId: varchar("word_family_id", { length: 36 }).notNull(),
    masteryLevel: integer("mastery_level").default(0), // 0-5
    reviewCount: integer("review_count").default(0),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true, mode: 'string' }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true, mode: 'string' }),
    errorCount: integer("error_count").default(0),
    consecutiveCorrect: integer("consecutive_correct").default(0),
    learningSessions: integer("learning_sessions").default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
    index("user_word_family_progress_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    index("user_word_family_progress_word_family_id_idx").using("btree", table.wordFamilyId.asc().nullsLast().op("text_ops")),
    index("user_word_family_progress_next_review_at_idx").using("btree", table.nextReviewAt.asc().nullsLast().op("timestamptz_ops")),
    foreignKey({
        columns: [table.wordFamilyId],
        foreignColumns: [wordFamilies.id],
        name: "user_word_family_progress_word_family_id_fkey"
    }).onDelete("cascade"),
]);

// 用户固定搭配学习进度表（新增）
export const userCollocationProgress = pgTable("user_collocation_progress", {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    collocationId: varchar("collocation_id", { length: 36 }).notNull(),
    masteryLevel: integer("mastery_level").default(0), // 0-5
    reviewCount: integer("review_count").default(0),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true, mode: 'string' }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true, mode: 'string' }),
    errorCount: integer("error_count").default(0),
    consecutiveCorrect: integer("consecutive_correct").default(0),
    learningSessions: integer("learning_sessions").default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
    index("user_collocation_progress_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    index("user_collocation_progress_collocation_id_idx").using("btree", table.collocationId.asc().nullsLast().op("text_ops")),
    index("user_collocation_progress_next_review_at_idx").using("btree", table.nextReviewAt.asc().nullsLast().op("timestamptz_ops")),
    foreignKey({
        columns: [table.collocationId],
        foreignColumns: [collocations.id],
        name: "user_collocation_progress_collocation_id_fkey"
    }).onDelete("cascade"),
]);

// 用户语法学习进度表（新增）
export const userGrammarProgress = pgTable("user_grammar_progress", {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    grammarPointId: varchar("grammar_point_id", { length: 36 }).notNull(),
    masteryLevel: integer("mastery_level").default(0), // 0-5
    reviewCount: integer("review_count").default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true, mode: 'string' }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true, mode: 'string' }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
    index("user_grammar_progress_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    index("user_grammar_progress_grammar_point_id_idx").using("btree", table.grammarPointId.asc().nullsLast().op("text_ops")),
    index("user_grammar_progress_next_review_at_idx").using("btree", table.nextReviewAt.asc().nullsLast().op("timestamptz_ops")),
    foreignKey({
        columns: [table.grammarPointId],
        foreignColumns: [grammarPoints.id],
        name: "user_grammar_progress_grammar_point_id_fkey"
    }).onDelete("cascade"),
]);

// Zod Schemas for validation

export const insertWordSchema = createInsertSchema(words)
export const selectWordSchema = createSelectSchema(words)
export type InsertWord = z.infer<typeof insertWordSchema>
export type Word = z.infer<typeof selectWordSchema>

export const insertCollocationSchema = createInsertSchema(collocations)
export const selectCollocationSchema = createSelectSchema(collocations)
export type InsertCollocation = z.infer<typeof insertCollocationSchema>
export type Collocation = z.infer<typeof selectCollocationSchema>

export const insertArticleSchema = createInsertSchema(articles)
export const selectArticleSchema = createSelectSchema(articles)
export type InsertArticle = z.infer<typeof insertArticleSchema>
// 使用 Drizzle 的类型推断，避免 jsonb 字段的兼容性问题
export type Article = typeof articles.$inferSelect

export const insertGrammarExerciseSchema = createInsertSchema(grammarExercises)
export const selectGrammarExerciseSchema = createSelectSchema(grammarExercises)
export type InsertGrammarExercise = z.infer<typeof insertGrammarExerciseSchema>
// 使用 Drizzle 的类型推断，避免 jsonb 字段的兼容性问题
export type GrammarExercise = typeof grammarExercises.$inferSelect

export const insertGrammarPracticeRecordSchema = createInsertSchema(grammarPracticeRecords)
export const selectGrammarPracticeRecordSchema = createSelectSchema(grammarPracticeRecords)
export type InsertGrammarPracticeRecord = z.infer<typeof insertGrammarPracticeRecordSchema>
export type GrammarPracticeRecord = z.infer<typeof selectGrammarPracticeRecordSchema>

// Zod schemas for validation
export const insertGrammarMistakeSchema = createInsertSchema(grammarMistakes)
export const selectGrammarMistakeSchema = createSelectSchema(grammarMistakes)
export type InsertGrammarMistake = z.infer<typeof insertGrammarMistakeSchema>

// 使用 Drizzle 的类型推断，避免 jsonb 字段的兼容性问题
export type GrammarMistake = typeof grammarMistakes.$inferSelect

export const insertGrammarPointSchema = createInsertSchema(grammarPoints)
export const selectGrammarPointSchema = createSelectSchema(grammarPoints)
export type InsertGrammarPoint = z.infer<typeof insertGrammarPointSchema>

// 使用 Drizzle 的类型推断，保持一致性
export type GrammarPoint = typeof grammarPoints.$inferSelect

// User-related tables schemas and types
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)
export type InsertUser = z.infer<typeof insertUserSchema>
export type User = typeof users.$inferSelect

export const insertUserLoginLogSchema = createInsertSchema(userLoginLogs)
export const selectUserLoginLogSchema = createSelectSchema(userLoginLogs)
export type InsertUserLoginLog = z.infer<typeof insertUserLoginLogSchema>
export type UserLoginLog = typeof userLoginLogs.$inferSelect

export const insertUserMistakeStatsSchema = createInsertSchema(userMistakeStats)
export const selectUserMistakeStatsSchema = createSelectSchema(userMistakeStats)
export type InsertUserMistakeStats = z.infer<typeof insertUserMistakeStatsSchema>
export type UserMistakeStats = typeof userMistakeStats.$inferSelect

// AI Providers table
export const aiProviders = pgTable("ai_providers", {
    id: integer().primaryKey().generatedAlwaysAsIdentity().notNull(),
    providerName: varchar("provider_name", { length: 50 }).notNull(),
    modelName: varchar("model_name", { length: 100 }).notNull(),
    apiKey: varchar("api_key", { length: 500 }).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    priority: integer().default(0).notNull(),
    config: jsonb().$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    index("ai_providers_provider_name_idx").using("btree", table.providerName.asc().nullsLast().op("text_ops")),
    index("ai_providers_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);

export const insertAIProviderSchema = createInsertSchema(aiProviders)
export const selectAIProviderSchema = createSelectSchema(aiProviders)
export type InsertAIProvider = z.infer<typeof insertAIProviderSchema>
export type AIProvider = typeof aiProviders.$inferSelect

// 词族相关schemas
export const insertWordFamilySchema = createInsertSchema(wordFamilies)
export const selectWordFamilySchema = createSelectSchema(wordFamilies)
export type InsertWordFamily = z.infer<typeof insertWordFamilySchema>
export type WordFamily = typeof wordFamilies.$inferSelect

export const insertUserWordFamilyProgressSchema = createInsertSchema(userWordFamilyProgress)
export const selectUserWordFamilyProgressSchema = createSelectSchema(userWordFamilyProgress)
export type InsertUserWordFamilyProgress = z.infer<typeof insertUserWordFamilyProgressSchema>
export type UserWordFamilyProgress = typeof userWordFamilyProgress.$inferSelect

export const insertUserCollocationProgressSchema = createInsertSchema(userCollocationProgress)
export const selectUserCollocationProgressSchema = createSelectSchema(userCollocationProgress)
export type InsertUserCollocationProgress = z.infer<typeof insertUserCollocationProgressSchema>
export type UserCollocationProgress = typeof userCollocationProgress.$inferSelect

export const insertUserGrammarProgressSchema = createInsertSchema(userGrammarProgress)
export const selectUserGrammarProgressSchema = createSelectSchema(userGrammarProgress)
export type InsertUserGrammarProgress = z.infer<typeof insertUserGrammarProgressSchema>
export type UserGrammarProgress = typeof userGrammarProgress.$inferSelect
