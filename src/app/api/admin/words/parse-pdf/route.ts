/**
 * PDF 文件解析 API
 * 用于支持大文件模式下上传 PDF 文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/utils/fileParser';
import { checkPermission } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件格式
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: '仅支持 PDF 文件' },
        { status: 400 }
      );
    }

    // 解析 PDF 文件
    console.log(`[PDF解析] 开始解析文件: ${file.name}`);
    const parseResult = await parseFile(file);

    console.log(`[PDF解析] 解析完成，文本长度: ${parseResult.text.length}`);

    return NextResponse.json({
      success: true,
      data: {
        text: parseResult.text,
        format: parseResult.format,
        warnings: parseResult.warnings,
      },
    });

  } catch (error) {
    console.error('[PDF解析] 解析失败:', error);
    console.error('[PDF解析] 错误详情:', {
      message: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'PDF 解析失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
