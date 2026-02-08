/**
 * 词族关联词转 API
 * POST /api/admin/word-families/:id/transformations - 添加词转到词族
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordFamilyManager } from '@/storage/database/wordFamilyManager';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

const addTransformationSchema = z.object({
  transformationId: z.string().optional(),
  baseWord: z.string().optional(),
});

/**
 * POST /api/admin/word-families/:id/transformations - 添加词转到词族
 */
export async function POST(
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
