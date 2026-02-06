/**
 * 获取当前用户信息（在 API Route 中使用）
 */

import { verifyAuthToken } from './auth';

export function getCurrentUserFromRequest(request: NextRequest): { userId: string; role: string } | null {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    return verifyAuthToken(token);
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

import { NextRequest } from 'next/server';
