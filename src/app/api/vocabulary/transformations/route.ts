import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const transformations = await db.execute(
      sql`SELECT * FROM word_transformations ORDER BY base_word`
    );

    return NextResponse.json({
      success: true,
      transformations: transformations.rows,
      total: transformations.rows.length,
    });
  } catch (error) {
    console.error('获取词转数据失败:', error);
    return NextResponse.json(
      { error: '获取失败，请稍后重试' },
      { status: 500 }
    );
  }
}
