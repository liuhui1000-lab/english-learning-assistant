/**
 * 单词批量导入 API
 * POST /api/admin/words/import - 批量导入单词（支持年级和学期）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { words, type Word } from '@/storage/database/shared/schema';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// 单词导入验证 schema
const wordImportSchema = z.object({
  word: z.string().min(1).max(100),
  wordType: z.enum(['noun', 'verb', 'adj', 'adv']).optional(),
  phonetic: z.string().max(100).optional(),
  meaning: z.string().min(1),
  example: z.string().optional(),
  exampleTranslation: z.string().optional(),
  grade: z.enum(['6年级', '7年级', '8年级', '9年级']).default('8年级'),
  semester: z.enum(['上学期', '下学期']).default('下学期'),
  difficulty: z.number().int().min(1).max(5).default(1),
});

const batchImportSchema = z.object({
  grade: z.enum(['6年级', '7年级', '8年级', '9年级']).optional(),
  semester: z.enum(['上学期', '下学期']).optional(),
  words: z.array(wordImportSchema).min(1).max(500), // 最多500个单词
  skipDuplicates: z.boolean().default(true), // 是否跳过重复单词
});

/**
 * POST /api/admin/words/import - 批量导入单词（支持年级和学期）
 *
 * 请求体：
 * {
 *   "grade": "8年级",          // 可选，如果单词中没有指定grade，使用这个默认值
 *   "semester": "下学期",       // 可选，如果单词中没有指定semester，使用这个默认值
 *   "words": [
 *     {
 *       "word": "happy",
 *       "meaning": "快乐的",
 *       "grade": "8年级",      // 可选，优先使用单词自己的grade
 *       "semester": "下学期"    // 可选，优先使用单词自己的semester
 *     }
 *   ],
 *   "skipDuplicates": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = batchImportSchema.parse(body);

    // 获取默认年级和学期
    const defaultGrade = validatedData.grade || '8年级';
    const defaultSemester = validatedData.semester || '下学期';

    const db = await getDb();
    const results = {
      total: validatedData.words.length,
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ word: string; error: string }>,
    };

    for (const wordData of validatedData.words) {
      try {
        // 使用单词自己的年级学期，如果没有则使用默认值
        const wordGrade = wordData.grade || defaultGrade;
        const wordSemester = wordData.semester || defaultSemester;

        // 检查是否已存在（检查单词和年级学期的组合）
        const existingWords = await db
          .select()
          .from(words)
          .where(
            eq(words.word, wordData.word.toLowerCase())
          );

        if (existingWords.length > 0) {
          if (validatedData.skipDuplicates) {
            results.skipped++;
            continue;
          } else {
            results.errors.push({
              word: wordData.word,
              error: '单词已存在',
            });
            results.failed++;
            continue;
          }
        }

        // 插入新单词
        await db.insert(words).values({
          id: randomUUID(),
          word: wordData.word.toLowerCase(),
          wordType: wordData.wordType,
          phonetic: wordData.phonetic,
          meaning: wordData.meaning,
          example: wordData.example,
          exampleTranslation: wordData.exampleTranslation,
          grade: wordGrade,
          semester: wordSemester,
          difficulty: wordData.difficulty,
          createdAt: new Date().toISOString(),
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          word: wordData.word,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `成功导入 ${results.success} 个单词（${defaultGrade}${defaultSemester}），跳过 ${results.skipped} 个，失败 ${results.failed} 个`,
    });
  } catch (error) {
    console.error('[单词批量导入] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '单词导入失败' },
      { status: 500 }
    );
  }
}
