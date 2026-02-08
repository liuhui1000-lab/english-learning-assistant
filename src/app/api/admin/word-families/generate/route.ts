/**
 * 基于词转表生成词族 API
 * POST /api/admin/word-families/generate - 从词转表生成词族
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  batchGenerateWordFamilies,
  getRecommendedFamiliesForUser,
  generateWordFamiliesFromTransformations,
} from '@/storage/database/wordFamilyGenerator';
import { checkPermission } from '@/utils/auth';
import { z } from 'zod';

const generateSchema = z.object({
  skipExisting: z.boolean().default(true),
  dryRun: z.boolean().default(false), // 是否只预览不创建
});

const getRecommendedSchema = z.object({
  userGrade: z.enum(['6年级', '7年级', '8年级', '9年级']),
});

/**
 * POST /api/admin/word-families/generate - 从词转表生成词族
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
    const validatedData = generateSchema.parse(body);

    // 预览模式：只返回将要创建的词族列表
    if (validatedData.dryRun) {
      const families = await generateWordFamiliesFromTransformations();

      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          previewCount: families.length,
          families: families.slice(0, 20), // 只显示前20个预览
        },
        message: `预览模式：检测到 ${families.length} 个潜在词族`,
      });
    }

    // 实际创建词族
    const result = await batchGenerateWordFamilies(validatedData.skipExisting);

    return NextResponse.json({
      success: true,
      data: result,
      message: `词族生成完成：创建 ${result.created} 个词族，跳过 ${result.skipped} 个`,
    });
  } catch (error) {
    console.error('[词族生成] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '词族生成失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/word-families/generate?userGrade=8年级 - 获取用户推荐的词族
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
    const userGrade = searchParams.get('userGrade');

    if (!userGrade) {
      return NextResponse.json(
        { error: '请提供 userGrade 参数' },
        { status: 400 }
      );
    }

    const validatedData = getRecommendedSchema.parse({ userGrade });
    const families = await getRecommendedFamiliesForUser(validatedData.userGrade);

    return NextResponse.json({
      success: true,
      data: {
        userGrade: validatedData.userGrade,
        count: families.length,
        families,
      },
      message: `为 ${validatedData.userGrade} 学生推荐 ${families.length} 个词族`,
    });
  } catch (error) {
    console.error('[获取推荐词族] 错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取推荐词族失败' },
      { status: 500 }
    );
  }
}
