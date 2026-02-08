/**
 * 获取当前用户信息API
 * GET /api/auth/me - 获取当前用户信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { getCurrentUserFromRequest } from '@/utils/authHelper';

/**
 * GET /api/auth/me - 获取当前用户信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户 - 支持两种方式：Cookie 或 Authorization 头
    let currentUser = getCurrentUserFromRequest(request);
    
    // 如果 Cookie 中没有 token，尝试从 Authorization 头获取
    if (!currentUser) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { verifyAuthToken } = await import('@/utils/auth');
        currentUser = verifyAuthToken(token);
      }
    }

    if (!currentUser) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 查询用户详细信息
    const result = await query(
      `SELECT
        id,
        username,
        email,
        full_name,
        role,
        is_active,
        last_login_at,
        created_at
      FROM users
      WHERE id = $1`,
      [currentUser.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // 暂时跳过查询错题统计和学习进度，因为相关表可能不存在
    // 查询错题统计
    /*
    const statsResult = await query(
      'SELECT * FROM user_mistake_stats WHERE user_id = $1',
      [currentUser.userId]
    );
    const stats = statsResult.rows[0] || null;

    // 查询学习进度
    const progressResult = await query(
      `SELECT
        (SELECT COUNT(*) FROM user_word_progress WHERE user_id = $1 AND mastered = true) AS mastered_words,
        (SELECT COUNT(*) FROM user_mistakes WHERE user_id = $1) AS total_mistakes,
        (SELECT COUNT(*) FROM user_mistakes WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days') AS mistakes_this_week`,
      [currentUser.userId]
    );
    const progress = progressResult.rows[0];
    */

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        stats: null,
        progress: null,
      },
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
