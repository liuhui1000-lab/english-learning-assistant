import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';
import { deepAnalyzeMistakes, safeCallGemini } from '@/utils/gemini';
import { sleep } from '@/utils/gemini';

/**
 * 每周全量分析 API
 * 每周日凌晨3点运行，只分析错题库有更新的用户
 */
export async function GET(request: NextRequest) {
  // 验证请求来源（仅允许定时任务调用）
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('🔄 开始每周全量分析任务');
  const startTime = Date.now();

  try {
    const db = await getDb();

    // 1. 只查询错题库有更新的用户
    const usersResult = await db.execute(sql`
      SELECT 
        u.id,
        u.username,
        u.last_mistake_updated,
        a.last_analysis_date as last_weekly_analysis
      FROM users u
      LEFT JOIN user_mistake_analysis a ON u.id = a.user_id
      WHERE 
        -- 错题库有更新（过去7天内有新错题）
        u.last_mistake_updated > NOW() - INTERVAL '7 days'
        -- 或者从未做过全量分析
        OR a.last_analysis_date IS NULL
        -- 或者上次全量分析后又有新错题
        OR (u.last_mistake_updated > a.last_analysis_date)
      ORDER BY u.last_mistake_updated DESC
    `);

    const users = usersResult.rows as any[];
    console.log(`📊 找到 ${users.length} 个错题库有更新的用户`);

    if (users.length === 0) {
      console.log('✅ 无需全量分析，所有用户错题库未更新');
      return NextResponse.json({
        success: true,
        message: '无需分析',
        analyzedUsers: 0,
        apiCalls: 0,
        duration: Date.now() - startTime
      });
    }

    let totalApiCalls = 0;
    let successCount = 0;
    let failCount = 0;

    // 2. 逐个用户进行深度分析
    for (const user of users) {
      try {
        console.log(`\n👤 深度分析用户: ${user.username}`);
        const calls = await deepAnalyzeUserMistakes(db, user.id, user.username);
        totalApiCalls += calls;
        successCount++;
        console.log(`✅ 用户 ${user.username} 深度分析完成，API调用: ${calls} 次`);
      } catch (error) {
        console.error(`❌ 用户 ${user.username} 深度分析失败:`, error);
        failCount++;

        // 记录失败日志
        await db.execute(sql`
          INSERT INTO analysis_log (task_type, user_id, status, error_message)
          VALUES ('weekly_full', ${user.id}, 'failed', ${error instanceof Error ? error.message : 'Unknown error'})
        `);
      }

      await sleep(4000);
    }

    const duration = Date.now() - startTime;
    console.log(`\n📈 每周全量分析完成:`);
    console.log(`   - 分析用户: ${successCount}/${users.length}`);
    console.log(`   - 失败用户: ${failCount}`);
    console.log(`   - API调用: ${totalApiCalls} 次`);
    console.log(`   - 耗时: ${(duration / 1000).toFixed(2)} 秒`);

    return NextResponse.json({
      success: true,
      analyzedUsers: users.length,
      successCount,
      failCount,
      apiCalls: totalApiCalls,
      duration
    });

  } catch (error) {
    console.error('❌ 每周全量分析任务失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '分析失败',
        duration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * 深度分析用户的错题
 */
async function deepAnalyzeUserMistakes(db: any, userId: string, username: string): Promise<number> {
  // 1. 获取该用户的所有错题
  const mistakesResult = await db.execute(sql`
    SELECT 
      question, 
      knowledge_point, 
      created_at,
      COUNT(*) OVER () as total_count
    FROM user_mistakes
    WHERE user_id = ${userId}
    AND status = 'analyzed'
    ORDER BY created_at DESC
  `);

  const mistakes = mistakesResult.rows;

  if (mistakes.length === 0) {
    console.log(`  ℹ️  用户 ${username} 无已分析错题`);
    return 0;
  }

  console.log(`  ℹ️  用户 ${username} 有 ${mistakes.length} 道错题`);

  // 2. 每20题批量进行深度分析
  const batchSize = 20;
  const batches = [];
  for (let i = 0; i < mistakes.length; i += batchSize) {
    batches.push(mistakes.slice(i, i + batchSize));
  }

  let totalApiCalls = 0;
  let allInsights: any[] = [];

  // 3. 记录任务开始
  const logIdResult = await db.execute(sql`
    INSERT INTO analysis_log (task_type, user_id, status)
    VALUES ('weekly_full', ${userId}, 'running')
    RETURNING id
  `);
  const logId = logIdResult.rows[0].id;

  // 4. 逐批深度分析
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`  📊 深度分析批次 ${i + 1}/${batches.length}`);

    try {
      const prompt = `分析以下英语错题，识别学习模式和薄弱点：

题目列表：
${batch.map((m: any, idx: number) => `${idx + 1}. [${m.knowledge_point || '未分类'}] ${m.question}`).join('\n')}

请分析并返回JSON：
{
  "insights": [
    {
      "knowledgePoint": "时态",
      "weakness": "经常混淆一般现在时和一般过去时",
      "suggestion": "重点练习时态对比题"
    }
  ],
  "trend": "学习趋势描述",
  "priority": ["优先级1", "优先级2", "优先级3"]
}`;

      const result = await safeCallGemini(prompt, {
        temperature: 0.2,
        maxOutputTokens: 2048
      });

      if (!result.success) {
        console.error(`  ❌ 批次 ${i + 1} 深度分析失败: ${result.error}`);
        continue;
      }

      const analysisResult = JSON.parse(result.result!);
      allInsights.push(...(analysisResult.insights || []));
      totalApiCalls++;

    } catch (error) {
      console.error(`  ❌ 批次 ${i + 1} 深度分析失败:`, error);
    }

    await sleep(4000);
  }

  // 5. 生成深度分析报告
  const report = generateDeepAnalysisReport(allInsights, mistakes);

  // 6. 保存深度分析结果
  await db.execute(sql`
    INSERT INTO user_mistake_analysis (
      user_id, weak_points, learning_trend, review_suggestion, priority_points, last_analysis_date
    )
    VALUES (
      ${userId},
      ${JSON.stringify(report.weakPoints)},
      ${JSON.stringify(report.learningTrend)},
      ${report.suggestion},
      ${JSON.stringify(report.priorityPoints)},
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      weak_points = ${JSON.stringify(report.weakPoints)},
      learning_trend = ${JSON.stringify(report.learningTrend)},
      review_suggestion = ${report.suggestion},
      priority_points = ${JSON.stringify(report.priorityPoints)},
      last_analysis_date = NOW()
  `);

  // 7. 更新任务日志
  await db.execute(sql`
    UPDATE analysis_log
    SET 
      status = 'success',
      items_analyzed = ${mistakes.length},
      api_calls = ${totalApiCalls},
      completed_at = NOW()
    WHERE id = ${logId}
  `);

  return totalApiCalls;
}

/**
 * 生成深度分析报告
 */
function generateDeepAnalysisReport(insights: any[], mistakes: any[]): {
  weakPoints: Array<{
    knowledgePoint: string;
    count: number;
    percentage: number;
  }>;
  learningTrend: any;
  suggestion: string;
  priorityPoints: string[];
} {
  // 统计知识点频率
  const knowledgePointCount: Record<string, number> = {};

  for (const insight of insights) {
    const point = insight.knowledgePoint || '未分类';
    knowledgePointCount[point] = (knowledgePointCount[point] || 0) + 1;
  }

  // 找出薄弱点（出现最多的前5个）
  const weakPoints = Object.entries(knowledgePointCount)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([point, count]) => ({
      knowledgePoint: point,
      count: count as number,
      percentage: Math.round(((count as number) / Math.max(insights.length, 1)) * 100)
    }));

  // 提取学习趋势
  const trends = insights
    .filter((i: any) => i.trend)
    .map((i: any) => i.trend);

  // 提取优先知识点
  const priorityMap: Record<string, number> = {};
  for (const insight of insights) {
    if (insight.priority) {
      for (const point of insight.priority) {
        priorityMap[point] = (priorityMap[point] || 0) + 1;
      }
    }
  }

  const priorityPoints = Object.entries(priorityMap)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([point]) => point);

  // 提取建议
  const suggestions = insights
    .filter((i: any) => i.suggestion)
    .map((i: any) => i.suggestion);

  return {
    weakPoints,
    learningTrend: {
      trend: trends[0] || '暂无明显趋势',
      totalInsights: insights.length,
      recentGrowth: insights.length > 5 ? '持续增长' : '稳定'
    },
    suggestion: suggestions[0] || '继续坚持练习，重点关注薄弱知识点',
    priorityPoints
  };
}
