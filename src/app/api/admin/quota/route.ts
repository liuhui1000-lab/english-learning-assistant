/**
 * 配额查询 API
 * GET /api/admin/quota
 * - 获取当前配额使用情况
 * - 返回重置时间
 * - 返回是否可以调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/utils/auth';
import { QuotaManager } from '@/utils/quotaManager';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    // 获取配额信息
    const quota = await QuotaManager.getQuotaInfo();

    return NextResponse.json({
      success: true,
      data: quota,
    });

  } catch (error: any) {
    console.error('获取配额信息失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'QUOTA_ERROR',
          message: error.message || '获取配额信息失败',
          userMessage: '无法获取配额信息，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}
