/**
 * 数据库迁移 API
 * POST /api/admin/migrate - 执行数据库迁移
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '@/utils/db';
import { verifyAdmin } from '@/utils/authHelper';

/**
 * POST /api/admin/migrate - 执行数据库迁移
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminCheck = verifyAdmin(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { migrationName } = body;

    if (!migrationName) {
      return NextResponse.json(
        { error: '请指定迁移名称' },
        { status: 400 }
      );
    }

    // 读取迁移文件
    const migrationPath = join(process.cwd(), 'migrations', `${migrationName}.sql`);
    let sql: string;
    
    try {
      sql = readFileSync(migrationPath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: '迁移文件不存在' },
        { status: 404 }
      );
    }

    // 分割 SQL 语句（按分号分隔）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results = [];
    
    for (const statement of statements) {
      try {
        await query(statement);
        results.push({ success: true, statement: statement.substring(0, 50) + '...' });
      } catch (error: any) {
        // 忽略"已存在"错误
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key')
        )) {
          results.push({ success: true, skipped: true, statement: statement.substring(0, 50) + '...' });
        } else {
          results.push({ 
            success: false, 
            error: error.message,
            statement: statement.substring(0, 100) 
          });
        }
      }
    }

    const failedCount = results.filter(r => !r.success && !r.skipped).length;

    return NextResponse.json({
      success: true,
      data: {
        migration: migrationName,
        totalStatements: statements.length,
        successCount: results.filter(r => r.success).length,
        skippedCount: results.filter(r => r.skipped).length,
        failedCount,
        results,
      },
    });
  } catch (error: any) {
    console.error('迁移失败:', error);
    return NextResponse.json(
      { error: '迁移失败', details: error.message },
      { status: 500 }
    );
  }
}
