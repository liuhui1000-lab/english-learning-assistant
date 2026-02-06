import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    const config = new Config();
    const client = new SearchClient(config);

    const response = await client.webSearch(query, 5, true);

    return NextResponse.json({
      success: true,
      results: response.web_items,
      summary: response.summary,
    });
  } catch (error) {
    console.error('搜索失败:', error);
    return NextResponse.json(
      { error: '搜索失败，请稍后重试' },
      { status: 500 }
    );
  }
}
