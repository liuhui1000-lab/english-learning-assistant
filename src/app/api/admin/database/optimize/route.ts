import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { sql } from 'drizzle-orm';

/**
 * 获取数据库大小监控数据
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 获取数据库大小监控数据
    const sizeMonitor = await db.execute(sql`SELECT * FROM database_size_monitor`);

    // 获取用户数据统计
    const userStats = await db.execute(sql`SELECT * FROM user_data_statistics`);

    // 获取数据库总大小
    const totalSize = await db.execute(sql`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) AS total_size
    `);

    return NextResponse.json({
      success: true,
      data: {
        sizeMonitor: sizeMonitor.rows,
        userStats: userStats.rows[0],
        totalSize: totalSize.rows[0],
      },
    });
  } catch (error) {
    console.error('获取数据库监控数据失败:', error);

    // 如果视图不存在，返回基本信息
    return NextResponse.json({
      success: true,
      data: {
        sizeMonitor: [],
        userStats: null,
        totalSize: null,
        message: '数据库监控视图未初始化，请先运行优化脚本',
      },
    });
  }
}

/**
 * 执行数据库优化任务
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    const db = await getDb();

    let result: any = {};

    switch (action) {
      case 'archive':
        // 归档旧记录
        await db.execute(sql`SELECT archive_old_practice_records()`);
        result = { message: '旧记录已归档', action: 'archive' };
        break;

      case 'limit-mistakes':
        // 限制错题数量
        await db.execute(sql`SELECT limit_all_user_mistakes()`);
        result = { message: '错题记录已限制', action: 'limit-mistakes' };
        break;

      case 'aggregate':
        // 聚合统计数据
        await db.execute(sql`SELECT aggregate_daily_stats()`);
        result = { message: '统计数据已聚合', action: 'aggregate' };
        break;

      case 'cleanup':
        // 清理旧统计数据
        await db.execute(sql`SELECT cleanup_old_daily_stats()`);
        result = { message: '旧统计数据已清理', action: 'cleanup' };
        break;

      case 'optimize-all':
        // 执行所有优化任务
        const optimizeResult = await db.execute(sql`SELECT * FROM optimize_database()`);
        result = {
          message: '所有优化任务已完成',
          action: 'optimize-all',
          details: optimizeResult.rows[0],
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: '未知的操作类型' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('执行数据库优化失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '优化失败，请确保已运行数据库优化脚本',
      },
      { status: 500 }
    );
  }
}
