/**
 * 学习内容向下兼容测试 API
 * GET /api/learning/test-compatibility - 测试向下兼容逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessibleGrades,
  adaptWordFamiliesForUser,
  getUserLearningStats,
  generateLearningPlan,
} from '@/storage/database/learningContentAdapter';
import { verifyAdmin } from '@/utils/authHelper';

/**
 * GET /api/learning/test-compatibility - 测试向下兼容逻辑（仅管理员）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const results: any[] = [];

    // 测试各年级的向下兼容逻辑
    const grades = ['6年级', '7年级', '8年级', '9年级'];

    for (const grade of grades) {
      const accessibleGrades = getAccessibleGrades(grade);

      // 获取词族
      const families = await adaptWordFamiliesForUser(grade, 10);

      // 统计单词
      const stats: Record<string, { count: number; words: string[] }> = {
        '6年级': { count: 0, words: [] },
        '7年级': { count: 0, words: [] },
        '8年级': { count: 0, words: [] },
        '9年级': { count: 0, words: [] },
      };

      let totalWords = 0;
      let currentGradeWords = 0;
      let reviewWords = 0;

      families.forEach(family => {
        family.words.forEach(word => {
          const wordGrade = word.grade || '8年级';
          if (stats[wordGrade]) {
            stats[wordGrade].count++;
            stats[wordGrade].words.push(word.word);
          }

          if (accessibleGrades.includes(wordGrade)) {
            totalWords++;
            if (wordGrade === grade) {
              currentGradeWords++;
            } else {
              reviewWords++;
            }
          }
        });
      });

      results.push({
        grade,
        accessibleGrades,
        totalFamilies: families.length,
        totalWords,
        currentGradeWords,
        reviewWords,
        wordsByGrade: stats,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: '向下兼容逻辑测试结果',
        results,
      },
      message: '测试完成',
    });
  } catch (error) {
    console.error('[测试向下兼容] 错误:', error);
    return NextResponse.json(
      { error: '测试失败' },
      { status: 500 }
    );
  }
}
