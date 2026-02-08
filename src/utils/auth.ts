/**
 * 用户认证工具函数
 * 支持密码哈希、JWT token生成、会话管理、权限验证
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// 密码哈希相关
const SALT_ROUNDS = 10;

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成安全的随机token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成JWT token（简化版，实际项目应使用jsonwebtoken库）
 */
export function generateAuthToken(userId: string, role: string): string {
  const payload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7天过期
    iat: Math.floor(Date.now() / 1000),
  };

  // 使用 base64url 编码（URL-safe）
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * 验证JWT token
 */
export function verifyAuthToken(token: string): { userId: string; role: string } | null {
  try {
    // 先尝试 base64url 解码，如果失败再尝试 base64 解码
    const [header, body, signature] = token.split('.');

    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // 解析payload（使用 base64url）
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());

    // 检查过期时间
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 设置认证cookie（返回设置cookie的headers）
 */
export function setAuthCookie(token: string): { name: string; value: string; attributes: any } {
  // 计算过期时间（7天后）
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  return {
    name: 'auth_token',
    value: token,
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      expires, // 使用 expires 而不是 maxAge
      path: '/',
    },
  };
}

/**
 * 清除认证cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<{ userId: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    // 使用 get() 方法读取 cookie
    const authCookie = cookieStore.get('auth_token');

    if (!authCookie || !authCookie.value) {
      return null;
    }

    const token = authCookie.value;
    return verifyAuthToken(token);
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 检查是否为管理员
 */
export function isAdmin(user: { userId: string; role: string } | null): boolean {
  return user?.role === 'admin';
}

/**
 * 检查是否为普通用户
 */
export function isUser(user: { userId: string; role: string } | null): boolean {
  return user?.role === 'user';
}

/**
 * 验证用户权限（API helper）
 */
export async function checkPermission(requiredRole: 'admin' | 'user'): Promise<{
  success: boolean;
  userId?: string;
  role?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      success: false,
      error: '未登录，请先登录',
    };
  }
  
  // 管理员拥有所有权限
  if (user.role === 'admin') {
    return {
      success: true,
      userId: user.userId,
      role: user.role,
    };
  }
  
  // 普通用户只能访问 user 级别的资源
  if (requiredRole === 'user') {
    return {
      success: true,
      userId: user.userId,
      role: user.role,
    };
  }
  
  return {
    success: false,
    error: '权限不足',
  };
}

/**
 * 验证资源所有权（确保用户只能访问自己的数据）
 */
export async function checkOwnership(
  resourceUserId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      success: false,
      error: '未登录',
    };
  }
  
  // 管理员可以访问所有资源
  if (user.role === 'admin') {
    return {
      success: true,
    };
  }
  
  // 普通用户只能访问自己的资源
  if (user.userId !== resourceUserId) {
    return {
      success: false,
      error: '无权访问此资源',
    };
  }
  
  return {
    success: true,
  };
}

/**
 * 验证请求体中的用户ID（用于管理员操作）
 */
export function validateUserIdInBody(body: any, currentUserId: string, currentRole: string): {
  success: boolean;
  userId: string;
  error?: string;
} {
  // 管理员可以在请求体中指定用户ID
  if (currentRole === 'admin' && body.userId) {
    return {
      success: true,
      userId: body.userId,
    };
  }
  
  // 普通用户只能使用自己的ID
  return {
    success: true,
    userId: currentUserId,
  };
}
/**
 * 验证是否为管理员（简化的 verifyAdmin 函数）
 */
export async function verifyAdmin(): Promise<{ userId: string; role: string } | null> {
  const user = await getCurrentUser();
  if (user?.role === 'admin') {
    return user;
  }
  return null;
}

/**
 * 从 Request 获取当前用户信息（用于 API Route）
 */
export function getCurrentUserFromRequest(request: Request): { userId: string; role: string } | null {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return null;
    }

    const authCookie = cookieHeader
      .split(';')
      .find(c => c.trim().startsWith('auth_token='));

    if (!authCookie) {
      return null;
    }

    const token = authCookie.split('=')[1].trim();
    return verifyAuthToken(token);
  } catch (error) {
    console.error('从 request 获取当前用户失败:', error);
    return null;
  }
}
