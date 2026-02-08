/**
 * 词族智能识别 API
 * POST /api/admin/word-families/recognize - 智能识别单词的词族
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordFamilyManager } from '@/storage/database/wordFamilyManager';
import { recognizeWordFamilies, recognizeWordFamily, suggestFamilyName } from '@/utils/wordFamilyRecognizer';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

const recognizeSchema = z.object({
  words: z.array(z.string()).min(1).max(100),
  autoCreate: z.boolean().default(false), // 是否自动创建词族
  grade: z.enum(['6年级', '7年级', '8年级', '9年级']).default('8年级'),
});

const recognizeSingleSchema = z.object({
  word: z.string().min(1).max(100),
});

/**
 * POST /api/admin/word-families/recognize - 批量识别单词的词族
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
    const validatedData = recognizeSchema.parse(body);

    const manager = new WordFamilyManager();

    // 智能识别词族
    const familyMap = recognizeWordFamilies(validatedData.words);

    const results = [];
    const createdFamilies = [];

    for (const [baseWord, match] of familyMap.entries()) {
      // 检查词族是否已存在
      const existingFamily = await manager.getWordFamilyByBaseWord(baseWord);

      const result: any = {
        baseWord,
        familyName: suggestFamilyName(baseWord),
        confidence: match.confidence,
        relatedWords: match.relatedWords,
        method: match.method,
        exists: !!existingFamily,
      };

      if (existingFamily) {
        result.familyId = existingFamily.id;
      }

      results.push(result);

      // 自动创建词族
      if (validatedData.autoCreate && !existingFamily) {
        const newFamily = await manager.createWordFamily({
          baseWord,
          familyName: suggestFamilyName(baseWord),
          grade: validatedData.grade,
          sourceType: 'list',
          sourceInfo: '智能识别自动创建',
          difficulty: 1,
        });
        createdFamilies.push(newFamily);
        result.familyId = newFamily.id;
        result.created = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalWords: validatedData.words.length,
        recognizedFamilies: results.length,
        families: results,
        createdCount: createdFamilies.length,
      },
    });
  } catch (error) {
    console.error('[词族智能识别] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '词族识别失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/word-families/recognize?word=xxx - 识别单个单词的词族
 */
export async function GET(request: NextRequest) {
  try {
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');

    if (!word) {
      return NextResponse.json(
        { error: '请提供 word 参数' },
        { status: 400 }
      );
    }

    const match = recognizeWordFamily(word);

    if (!match) {
      return NextResponse.json({
        success: true,
        data: {
          word,
          recognized: false,
          message: '无法识别该单词的词族',
        },
      });
    }

    const manager = new WordFamilyManager();
    const existingFamily = await manager.getWordFamilyByBaseWord(match.baseWord);

    return NextResponse.json({
      success: true,
      data: {
        word,
        recognized: true,
        baseWord: match.baseWord,
        familyName: suggestFamilyName(match.baseWord),
        confidence: match.confidence,
        relatedWords: match.relatedWords,
        method: match.method,
        exists: !!existingFamily,
        familyId: existingFamily?.id || null,
      },
    });
  } catch (error) {
    console.error('[词族识别] 错误:', error);
    return NextResponse.json(
      { error: '词族识别失败' },
      { status: 500 }
    );
  }
}
