/**
 * 词族初始化 API
 * POST /api/admin/word-families/initialize - 初始化词族系统
 * 自动识别所有单词的词族，创建词族并关联单词
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordFamilyManager } from '@/storage/database/wordFamilyManager';
import { recognizeWordFamilies, suggestFamilyName } from '@/utils/wordFamilyRecognizer';
import { checkPermission } from '@/utils/auth';
import { getDb } from '@/utils/db';
import { words } from '@/storage/database/shared/schema';
import { z } from 'zod';

const initializeSchema = z.object({
  grade: z.enum(['6年级', '7年级', '8年级', '9年级']).optional(),
  autoCreate: z.boolean().default(true),
  autoLink: z.boolean().default(true),
  skipExisting: z.boolean().default(true),
});

/**
 * POST /api/admin/word-families/initialize - 初始化词族系统
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
    const validatedData = initializeSchema.parse(body);

    const manager = new WordFamilyManager();
    const db = await getDb();

    // 1. 获取所有单词
    let allWords = await db.select().from(words);

    // 按年级筛选
    if (validatedData.grade) {
      allWords = allWords.filter(w => w.grade === validatedData.grade);
    }

    console.log(`[词族初始化] 开始处理 ${allWords.length} 个单词`);

    // 2. 智能识别词族
    const wordTexts = allWords.map(w => w.word);
    const familyMap = recognizeWordFamilies(wordTexts);

    console.log(`[词族初始化] 识别出 ${familyMap.size} 个潜在词族`);

    // 3. 处理每个词族
    const results = {
      totalWords: allWords.length,
      recognizedFamilies: familyMap.size,
      createdFamilies: 0,
      linkedWords: 0,
      skippedFamilies: 0,
      failedWords: [] as Array<{ word: string; error: string }>,
      families: [] as Array<{
        baseWord: string;
        familyId?: string;
        wordCount: number;
        created: boolean;
      }>,
    };

    for (const [baseWord, match] of familyMap.entries()) {
      try {
        // 检查词族是否已存在
        const existingFamily = await manager.getWordFamilyByBaseWord(baseWord);

        let familyId: string | undefined;

        if (existingFamily) {
          if (validatedData.skipExisting) {
            results.skippedFamilies++;
            results.families.push({
              baseWord,
              familyId: existingFamily.id,
              wordCount: match.relatedWords.length,
              created: false,
            });
            familyId = existingFamily.id;
          } else {
            // 跳过已存在的词族
            results.skippedFamilies++;
            continue;
          }
        } else if (validatedData.autoCreate) {
          // 创建新词族
          const newFamily = await manager.createWordFamily({
            baseWord,
            familyName: suggestFamilyName(baseWord),
            grade: validatedData.grade || '8年级',
            sourceType: 'list',
            sourceInfo: '智能识别自动创建',
            difficulty: 1,
          });

          familyId = newFamily.id;
          results.createdFamilies++;
          results.families.push({
            baseWord,
            familyId,
            wordCount: match.relatedWords.length,
            created: true,
          });
        }

        // 4. 关联单词到词族
        if (familyId && validatedData.autoLink) {
          for (const relatedWord of match.relatedWords) {
            try {
              await manager.addWordToFamilyByText(relatedWord, familyId);
              results.linkedWords++;
            } catch (error) {
              results.failedWords.push({
                word: relatedWord,
                error: '关联失败',
              });
            }
          }
        }
      } catch (error: any) {
        console.error(`[词族初始化] 处理词族 ${baseWord} 失败:`, error);
        results.failedWords.push({
          word: baseWord,
          error: error.message,
        });
      }
    }

    // 5. 统计未识别的单词
    const recognizedWords = new Set<string>();
    familyMap.forEach((_, baseWord) => {
      recognizedWords.add(baseWord.toLowerCase());
    });

    const unrecognizedWords = allWords
      .filter(w => !recognizedWords.has(w.word.toLowerCase()))
      .map(w => w.word);

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        unrecognizedCount: unrecognizedWords.length,
        unrecognizedWords: unrecognizedWords.slice(0, 50), // 最多显示50个
      },
      message: `词族初始化完成：创建 ${results.createdFamilies} 个词族，关联 ${results.linkedWords} 个单词`,
    });
  } catch (error) {
    console.error('[词族初始化] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '词族初始化失败' },
      { status: 500 }
    );
  }
}
