/**
 * 学习内容向下兼容测试 API（支持学期）
 * GET /api/learning/test-compatibility - 测试向下兼容逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessibleGradeSemesters,
  adaptWordFamiliesForUser,
  getUserLearningStats,
  parseGradeSemester,
  combineGradeSemester,
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

    // 测试各年级学期的向下兼容逻辑
    const gradeSemesters = [
      '6年级上学期',
      '6年级下学期',
      '7年级上学期',
      '7年级下学期',
      '8年级上学期',
      '8年级下学期',
      '9年级上学期',
      '9年级下学期',
    ];

    for (const gradeSemester of gradeSemesters) {
      const accessibleGradeSemesters = getAccessibleGradeSemesters(gradeSemester);

      // 获取词族
      const families = await adaptWordFamiliesForUser(gradeSemester, 10);

      // 统计单词
      const stats: Record<string, { count: number; words: string[] }> = {
        '6年级上学期': { count: 0, words: [] },
        '6年级下学期': { count: 0, words: [] },
        '7年级上学期': { count: 0, words: [] },
        '7年级下学期': { count: 0, words: [] },
        '8年级上学期': { count: 0, words: [] },
        '8年级下学期': { count: 0, words: [] },
        '9年级上学期': { count: 0, words: [] },
        '9年级下学期': { count: 0, words: [] },
      };

      let totalWords = 0;
      let currentSemesterWords = 0;
      let reviewWords = 0;

      families.forEach(family => {
        family.words.forEach((word: any) => {
          const wordGrade = word.grade || '8年级';
          const wordSemester = word.semester || '下学期';
          const wordGradeSemester = combineGradeSemester(wordGrade, wordSemester);

          if (stats[wordGradeSemester]) {
            stats[wordGradeSemester].count++;
            stats[wordGradeSemester].words.push(word.word);
          }

          if (accessibleGradeSemesters.includes(wordGradeSemester)) {
            totalWords++;
            if (wordGradeSemester === gradeSemester) {
              currentSemesterWords++;
            } else {
              reviewWords++;
            }
          }
        });
      });

      results.push({
        gradeSemester,
        accessibleGradeSemesters,
        totalFamilies: families.length,
        totalWords,
        currentSemesterWords,
        reviewWords,
        wordsByGradeSemester: stats,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: '向下兼容逻辑测试结果（支持学期）',
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
