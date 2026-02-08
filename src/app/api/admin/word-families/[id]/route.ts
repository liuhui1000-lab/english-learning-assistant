/**
 * 词族详情和管理 API
 * GET /api/admin/word-families/:id - 获取词族详情（包含关联内容）
 * POST /api/admin/word-families/:id/words - 添加单词到词族
 * POST /api/admin/word-families/:id/transformations - 添加词转到词族
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordFamilyManager } from '@/storage/database/wordFamilyManager';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

const addWordSchema = z.object({
  wordId: z.string().optional(),
  wordText: z.string().optional(),
});

const addTransformationSchema = z.object({
  transformationId: z.string().optional(),
  baseWord: z.string().optional(),
});

/**
 * GET /api/admin/word-families/:id - 获取词族详情（包含关联内容）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const manager = new WordFamilyManager();
    const familyWithRelations = await manager.getWordFamilyWithRelations(id);

    if (!familyWithRelations) {
      return NextResponse.json(
        { error: '词族不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: familyWithRelations,
    });
  } catch (error) {
    console.error('[词族详情] 错误:', error);
    return NextResponse.json(
      { error: '获取词族详情失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/word-families/:id/words - 添加单词到词族
 */
export async function POST_WORDS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = addWordSchema.parse(body);

    const manager = new WordFamilyManager();

    if (validatedData.wordId) {
      await manager.addWordToFamily(validatedData.wordId, id);
    } else if (validatedData.wordText) {
      await manager.addWordToFamilyByText(validatedData.wordText, id);
    } else {
      return NextResponse.json(
        { error: '请提供 wordId 或 wordText' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '单词已添加到词族',
    });
  } catch (error) {
    console.error('[添加单词到词族] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '添加单词失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/word-families/:id/transformations - 添加词转到词族
 */
export async function POST_TRANSFORMATIONS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = addTransformationSchema.parse(body);

    const manager = new WordFamilyManager();

    if (validatedData.transformationId) {
      await manager.addTransformationToFamily(validatedData.transformationId, id);
    } else if (validatedData.baseWord) {
      await manager.addTransformationToFamilyByBaseWord(validatedData.baseWord, id);
    } else {
      return NextResponse.json(
        { error: '请提供 transformationId 或 baseWord' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '词转已添加到词族',
    });
  } catch (error) {
    console.error('[添加词转到词族] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '添加词转失败' },
      { status: 500 }
    );
  }
}
