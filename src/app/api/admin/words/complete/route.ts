/**
 * 单词数据补全 API
 * POST /api/admin/words/complete - 使用 LLM 自动补全单词的缺失信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

// 单词补全请求 schema
const completeWordsSchema = z.object({
  words: z.array(z.object({
    word: z.string().min(1).max(100),
    meaning: z.string().min(1),
    // 可选字段，如果提供则不补全
    phonetic: z.string().optional(),
    wordType: z.enum(['noun', 'verb', 'adj', 'adv']).optional(),
    example: z.string().optional(),
    exampleTranslation: z.string().optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
    grade: z.enum(['6年级', '7年级', '8年级', '9年级']).optional(),
  })).min(1).max(50), // 限制每次最多50个，避免 token 过大
  useAI: z.boolean().default(true), // 是否使用 AI 补全
  defaultGrade: z.enum(['6年级', '7年级', '8年级', '9年级']).default('8年级'),
});

/**
 * LLM 补全单个单词
 */
async function completeWordWithLLM(word: string, meaning: string): Promise<{
  phonetic?: string;
  wordType?: string;
  example?: string;
  exampleTranslation?: string;
  difficulty?: number;
}> {
  // TODO: 集成实际的 LLM 服务（DeepSeek、Kimi 等）
  // 这里先返回模拟数据

  // 模拟 API 调用延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  // 根据单词长度和词性判断难度
  const difficulty = word.length <= 5 ? 1 : word.length <= 7 ? 2 : word.length <= 9 ? 3 : 4;

  // 模拟返回
  return {
    phonetic: `/${word}/`, // 简化的音标
    wordType: inferWordType(word, meaning),
    example: `This is an example of ${word}.`,
    exampleTranslation: `这是 ${word} 的例句。`,
    difficulty,
  };
}

/**
 * 推断词性（基于词尾和词义）
 */
function inferWordType(word: string, meaning: string): 'noun' | 'verb' | 'adj' | 'adv' {
  const lowerWord = word.toLowerCase();
  const lowerMeaning = meaning.toLowerCase();

  // 基于词尾判断
  if (lowerWord.endsWith('tion') || lowerWord.endsWith('ness') ||
      lowerWord.endsWith('ment') || lowerWord.endsWith('ity')) {
    return 'noun';
  }
  if (lowerWord.endsWith('ful') || lowerWord.endsWith('ous') ||
      lowerWord.endsWith('able') || lowerWord.endsWith('ive') ||
      lowerWord.endsWith('ent') || lowerWord.endsWith('ant')) {
    return 'adj';
  }
  if (lowerWord.endsWith('ly')) {
    return 'adv';
  }
  if (lowerWord.endsWith('ate') || lowerWord.endsWith('ize') ||
      lowerWord.endsWith('ify')) {
    return 'verb';
  }

  // 基于词义判断
  if (lowerMeaning.includes('是') || lowerMeaning.includes('有') ||
      lowerMeaning.includes('can') || lowerMeaning.includes('will')) {
    return 'verb';
  }
  if (lowerMeaning.includes('的') || lowerMeaning.includes('一') ||
      lowerMeaning.includes('很') || lowerMeaning.includes('非常')) {
    return 'adj';
  }
  if (lowerMeaning.includes('地')) {
    return 'adv';
  }

  // 默认为名词
  return 'noun';
}

/**
 * POST /api/admin/words/complete - 批量补全单词数据
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
    const validatedData = completeWordsSchema.parse(body);

    const results = [];
    const stats = {
      total: validatedData.words.length,
      completed: 0,
      alreadyComplete: 0,
      skipped: 0,
      errors: 0,
    };

    for (const wordData of validatedData.words) {
      try {
        // 检查是否已完整
        const isComplete = !!(
          wordData.phonetic &&
          wordData.wordType &&
          wordData.example &&
          wordData.exampleTranslation
        );

        if (isComplete) {
          stats.alreadyComplete++;
          results.push({
            word: wordData.word,
            status: 'already_complete',
            data: wordData,
          });
          continue;
        }

        if (!validatedData.useAI) {
          stats.skipped++;
          results.push({
            word: wordData.word,
            status: 'skipped',
            reason: 'AI disabled',
            data: wordData,
          });
          continue;
        }

        // 使用 LLM 补全
        const completed = await completeWordWithLLM(wordData.word, wordData.meaning);

        // 合并数据
        const resultData = {
          word: wordData.word,
          wordType: wordData.wordType || completed.wordType,
          phonetic: wordData.phonetic || completed.phonetic,
          meaning: wordData.meaning,
          example: wordData.example || completed.example,
          exampleTranslation: wordData.exampleTranslation || completed.exampleTranslation,
          difficulty: wordData.difficulty || completed.difficulty,
          grade: wordData.grade || validatedData.defaultGrade,
        };

        stats.completed++;
        results.push({
          word: wordData.word,
          status: 'completed',
          data: resultData,
        });
      } catch (error: any) {
        stats.errors++;
        results.push({
          word: wordData.word,
          status: 'error',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        results,
      },
      message: `补全完成：${stats.completed} 个单词已补全，${stats.alreadyComplete} 个已完整`,
    });
  } catch (error) {
    console.error('[单词数据补全] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '单词数据补全失败' },
      { status: 500 }
    );
  }
}
