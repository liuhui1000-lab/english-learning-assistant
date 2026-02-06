import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { v4 as uuidv4 } from 'uuid';

/**
 * 上传文档API
 * 支持的文件类型：
 * - PDF文档 (.pdf)
 * - Word文档 (.doc, .docx)
 * - 图片 (.jpg, .jpeg, .png)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未选择文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型，仅支持 PDF、Word 和图片' },
        { status: 400 }
      );
    }

    // 验证文件大小（20MB限制）
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过20MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 生成文件名（带UUID前缀）
    const originalName = file.name;
    const ext = originalName.split('.').pop() || '';
    const fileName = `documents/${Date.now()}_${uuidv4()}.${ext}`;

    // 初始化对象存储
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 上传文件到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type,
    });

    // 生成签名URL（24小时有效）
    const fileUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400 * 3, // 3天
    });

    return NextResponse.json({
      success: true,
      data: {
        fileKey,
        fileName: originalName,
        fileUrl,
        fileSize: file.size,
        fileType: file.type,
      },
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上传失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取文档上传状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey');

    if (!fileKey) {
      return NextResponse.json(
        { success: false, error: '缺少 fileKey 参数' },
        { status: 400 }
      );
    }

    // 初始化对象存储
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 检查文件是否存在
    const exists = await storage.fileExists({ fileKey });

    if (!exists) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      );
    }

    // 生成签名URL
    const fileUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400 * 3, // 3天
    });

    return NextResponse.json({
      success: true,
      data: {
        fileKey,
        fileUrl,
      },
    });
  } catch (error) {
    console.error('获取文件失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
      },
      { status: 500 }
    );
  }
}
