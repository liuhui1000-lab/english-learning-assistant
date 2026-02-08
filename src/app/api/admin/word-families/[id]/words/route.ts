/**
 * 词族关联单词 API
 * POST /api/admin/word-families/:id/words - 添加单词到词族
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordFamilyManager } from '@/storage/database/wordFamilyManager';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

const addWordSchema = z.object({
  wordId: z.string().optional(),
  wordText: z.string().optional(),
});

/**
 * POST /api/admin/word-families/:id/words - 添加单词到词族
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
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '添加单词失败' },
      { status: 500 }
    );
  }
}
