/**
 * 用户统计API
 * 获取用户的学习统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { getDb, query } from '@/utils/db';
import { userWordProgress, grammarMistakes, transformationMistakes } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    console.log('[用户统计] 当前用户:', currentUser);

    // 使用原生 SQL 查询（更可靠）
    const db = await getDb();

    // 统计单词进度
    let vocabularyCount = 0;
    try {
      const vocabResult = await query(
        'SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = $1',
        [currentUser.userId]
      );
      vocabularyCount = parseInt(vocabResult.rows[0]?.count || '0');
      console.log('[用户统计] 单词进度:', vocabularyCount);
    } catch (error) {
      console.error('[用户统计] 查询单词进度失败:', error);
    }

    // 统计语法错题
    let grammarCount = 0;
    try {
      const grammarResult = await query(
        'SELECT COUNT(*) as count FROM grammar_mistakes WHERE user_id = $1',
        [currentUser.userId]
      );
      grammarCount = parseInt(grammarResult.rows[0]?.count || '0');
      console.log('[用户统计] 语法错题:', grammarCount);
    } catch (error) {
      console.error('[用户统计] 查询语法错题失败:', error);
    }

    // 统计词转错题
    let transformationCount = 0;
    try {
      const transResult = await query(
        'SELECT COUNT(*) as count FROM transformation_mistakes WHERE user_id = $1',
        [currentUser.userId]
      );
      transformationCount = parseInt(transResult.rows[0]?.count || '0');
      console.log('[用户统计] 词转错题:', transformationCount);
    } catch (error) {
      console.error('[用户统计] 查询词转错题失败:', error);
    }

    // 统计总错题数
    const totalMistakes = grammarCount + transformationCount;

    // 统计阅读文章（简化处理，返回0）
    const readingCount = 0;

    return NextResponse.json({
      success: true,
      data: {
        vocabulary: vocabularyCount,
        grammar: grammarCount,
        reading: readingCount,
        mistakes: totalMistakes,
      },
    });
  } catch (error) {
    console.error('[用户统计] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取统计数据失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
