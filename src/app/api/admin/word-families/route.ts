/**
 * 词族管理 API
 * POST /api/admin/word-families - 创建词族
 * GET /api/admin/word-families - 获取所有词族
 * GET /api/admin/word-families/:id - 获取词族详情（包含关联内容）
 * POST /api/admin/word-families/:id/words - 添加单词到词族
 * POST /api/admin/word-families/:id/transformations - 添加词转到词族
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordFamilyManager } from '@/storage/database/wordFamilyManager';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

// 验证 schema
const createWordFamilySchema = z.object({
  baseWord: z.string().min(1).max(100),
  familyName: z.string().min(1).max(100),
  grade: z.enum(['6年级', '7年级', '8年级', '9年级']).optional(),
  sourceType: z.enum(['list', 'exam', 'mistake']).optional(),
  sourceInfo: z.string().max(200).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

const addWordSchema = z.object({
  wordId: z.string().optional(),
  wordText: z.string().optional(),
});

const addTransformationSchema = z.object({
  transformationId: z.string().optional(),
  baseWord: z.string().optional(),
});

/**
 * GET /api/admin/word-families - 获取所有词族
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
    const grade = searchParams.get('grade');

    const manager = new WordFamilyManager();
    const families = grade
      ? await manager.getWordFamiliesByGrade(grade)
      : await manager.getAllWordFamilies();

    return NextResponse.json({
      success: true,
      data: families,
    });
  } catch (error) {
    console.error('[词族列表] 错误:', error);
    return NextResponse.json(
      { error: '获取词族列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/word-families - 创建词族
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
    const validatedData = createWordFamilySchema.parse(body);

    const manager = new WordFamilyManager();
    const family = await manager.createWordFamily(validatedData);

    return NextResponse.json({
      success: true,
      data: family,
      message: '词族创建成功',
    });
  } catch (error) {
    console.error('[创建词族] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建词族失败' },
      { status: 500 }
    );
  }
}
