import { relations } from "drizzle-orm/relations";
import { grammarPoints, grammarMistakes, articles, userReadingProgress, words, userWordProgress, wordTransformations, transformationMistakes, grammarExercises, grammarPracticeRecords, grammarWeakPoints, users, userLoginLogs, userMistakeStats } from "./schema";

export const grammarMistakesRelations = relations(grammarMistakes, ({one}) => ({
        grammarPoint: one(grammarPoints, {
                fields: [grammarMistakes.grammarPointId],
                references: [grammarPoints.id]
        }),
}));

export const grammarPointsRelations = relations(grammarPoints, ({many}) => ({
        grammarMistakes: many(grammarMistakes),
        grammarExercises: many(grammarExercises),
        grammarWeakPoints: many(grammarWeakPoints),
}));

export const userReadingProgressRelations = relations(userReadingProgress, ({one}) => ({
        article: one(articles, {
                fields: [userReadingProgress.articleId],
                references: [articles.id]
        }),
}));

export const articlesRelations = relations(articles, ({many}) => ({
        userReadingProgresses: many(userReadingProgress),
}));

export const userWordProgressRelations = relations(userWordProgress, ({one}) => ({
        word: one(words, {
                fields: [userWordProgress.wordId],
                references: [words.id]
        }),
}));

export const wordsRelations = relations(words, ({many}) => ({
        userWordProgresses: many(userWordProgress),
}));

export const transformationMistakesRelations = relations(transformationMistakes, ({one}) => ({
        wordTransformation: one(wordTransformations, {
                fields: [transformationMistakes.transformationId],
                references: [wordTransformations.id]
        }),
}));

export const wordTransformationsRelations = relations(wordTransformations, ({many}) => ({
        transformationMistakes: many(transformationMistakes),
}));

export const grammarExercisesRelations = relations(grammarExercises, ({one, many}) => ({
        grammarPoint: one(grammarPoints, {
                fields: [grammarExercises.grammarPointId],
                references: [grammarPoints.id]
        }),
        grammarPracticeRecords: many(grammarPracticeRecords),
}));

export const grammarPracticeRecordsRelations = relations(grammarPracticeRecords, ({one}) => ({
        grammarExercise: one(grammarExercises, {
                fields: [grammarPracticeRecords.exerciseId],
                references: [grammarExercises.id]
        }),
}));

export const grammarWeakPointsRelations = relations(grammarWeakPoints, ({one}) => ({
        grammarPoint: one(grammarPoints, {
                fields: [grammarWeakPoints.grammarPointId],
                references: [grammarPoints.id]
        }),
}));

// User-related relations
export const usersRelations = relations(users, ({many}) => ({
        userLoginLogs: many(userLoginLogs),
        userMistakeStats: many(userMistakeStats),
}));

export const userLoginLogsRelations = relations(userLoginLogs, ({one}) => ({
        user: one(users, {
                fields: [userLoginLogs.userId],
                references: [users.id]
        }),
}));

export const userMistakeStatsRelations = relations(userMistakeStats, ({one}) => ({
        user: one(users, {
                fields: [userMistakeStats.userId],
                references: [users.id]
        }),
}));
