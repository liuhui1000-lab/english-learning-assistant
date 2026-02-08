import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { sql } from 'drizzle-orm';
import { analyzeMistakesBatch, safeCallGemini } from '@/utils/gemini';
import { sleep } from '@/utils/gemini';

/**
 * 每日增量分析 API
 * 每天凌晨2点运行，只分析有新错题的用户
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

  console.log('🚀 开始每日增量分析任务');
  const startTime = Date.now();

  try {
    const db = await getDb();

    // 1. 只查询有新错题的用户
    const usersResult = await db.execute(sql`
      SELECT 
        u.id,
        u.username,
        COUNT(m.id) as unanalyzed_count
      FROM users u
      INNER JOIN user_mistakes m ON u.id = m.user_id
      WHERE m.status = 'unanalyzed'
      AND m.created_at > (
        COALESCE(u.last_analysis_date, NOW() - INTERVAL '30 days')
      )
      GROUP BY u.id, u.username
      ORDER BY u.last_analysis_date ASC NULLS FIRST
    `);

    const users = usersResult.rows as any[];
    console.log(`📊 找到 ${users.length} 个有新错题的用户`);

    if (users.length === 0) {
      console.log('✅ 无需分析，所有用户错题库已更新');
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

    // 2. 逐个分析用户的未分析错题
    for (const user of users) {
      try {
        console.log(`\n👤 分析用户: ${user.username} (${user.unanalyzed_count} 道新错题)`);
        const apiCalls = await analyzeUserNewMistakes(db, user.id, user.username);
        totalApiCalls += apiCalls;
        successCount++;
        console.log(`✅ 用户 ${user.username} 分析完成，API调用: ${apiCalls} 次`);
      } catch (error) {
        console.error(`❌ 用户 ${user.username} 分析失败:`, error);
        failCount++;

        // 记录失败日志
        await db.execute(sql`
          INSERT INTO analysis_log (task_type, user_id, status, error_message)
          VALUES ('daily_incremental', ${user.id}, 'failed', ${error instanceof Error ? error.message : 'Unknown error'})
        `);
      }

      // 控制请求速率（15次/分钟）
      await sleep(4000);
    }

    const duration = Date.now() - startTime;
    console.log(`\n📈 每日分析完成:`);
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
    console.error('❌ 每日增量分析任务失败:', error);
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
 * 分析用户的新错题（只分析未分析的）
 */
async function analyzeUserNewMistakes(db: any, userId: string, username: string): Promise<number> {
  // 1. 获取该用户未分析的错题
  const mistakesResult = await db.execute(sql`
    SELECT id, question 
    FROM user_mistakes 
    WHERE user_id = ${userId} 
    AND status = 'unanalyzed'
    ORDER BY created_at DESC
    LIMIT 50  -- 最多处理50道新错题
  `);

  const mistakes = mistakesResult.rows;

  if (mistakes.length === 0) {
    console.log(`  ℹ️  用户 ${username} 无待分析错题`);
    return 0;
  }

  console.log(`  ℹ️  用户 ${username} 有 ${mistakes.length} 道待分析错题`);

  // 2. 每10题批量分析
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < mistakes.length; i += batchSize) {
    batches.push(mistakes.slice(i, i + batchSize));
  }

  let totalApiCalls = 0;
  let analyzedCount = 0;

  // 3. 记录任务开始
  const logIdResult = await db.execute(sql`
    INSERT INTO analysis_log (task_type, user_id, status)
    VALUES ('daily_incremental', ${userId}, 'running')
    RETURNING id
  `);
  const logId = logIdResult.rows[0].id;

  // 4. 逐批分析
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`  📝 分析批次 ${i + 1}/${batches.length} (${batch.length}题)`);

    try {
      // 调用 Gemini 分析
      const result = await safeCallGemini(
        `分析以下英语语法错题，提取知识点：

${batch.map((m: any, idx: number) => `[${m.id}] ${m.question}`).join('\n')}

返回JSON格式：
[
  {
    "id": 1,
    "knowledgePoint": "时态",
    "subKnowledgePoint": "一般现在时",
    "difficulty": "easy|intermediate|hard"
  }
]`
      );

      if (!result.success) {
        console.error(`  ❌ 批次 ${i + 1} 分析失败: ${result.error}`);
        continue;
      }

      // 解析结果
      const analysisResult = JSON.parse(result.result!);
      const analyzedItems = Array.isArray(analysisResult) ? analysisResult : analysisResult.questions || [];

      // 保存分析结果
      for (const item of analyzedItems) {
        await db.execute(sql`
          UPDATE user_mistakes
          SET 
            knowledge_point = ${item.knowledgePoint || '未分类'},
            sub_knowledge_point = ${item.subKnowledgePoint || ''},
            difficulty = ${item.difficulty || 'intermediate'},
            status = 'analyzed'
          WHERE id = ${item.id}
        `);

        // 实时更新统计
        await updateRealTimeStats(db, userId, item);
        analyzedCount++;
      }

      totalApiCalls++;

    } catch (error) {
      console.error(`  ❌ 批次 ${i + 1} 分析失败:`, error);
    }

    // 延迟4秒，避免请求过快（15次/分钟限制）
    await sleep(4000);
  }

  // 5. 更新用户状态
  await db.execute(sql`
    UPDATE users
    SET 
      last_analysis_date = NOW(),
      has_new_mistakes = false
    WHERE id = ${userId}
  `);

  // 6. 更新任务日志
  await db.execute(sql`
    UPDATE analysis_log
    SET 
      status = 'success',
      items_analyzed = ${analyzedCount},
      api_calls = ${totalApiCalls},
      completed_at = NOW()
    WHERE id = ${logId}
  `);

  return totalApiCalls;
}

/**
 * 实时更新统计
 */
async function updateRealTimeStats(db: any, userId: string, item: any): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO user_mistake_stats (user_id, total_count, knowledge_points, difficulties, last_updated)
      VALUES (
        ${userId},
        1,
        ${JSON.stringify({ [item.knowledgePoint || '未分类']: 1 })},
        ${JSON.stringify({ [item.difficulty || 'intermediate']: 1 })},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        total_count = user_mistake_stats.total_count + 1,
        knowledge_points = COALESCE(
          jsonb_set(
            user_mistake_stats.knowledge_points,
            ARRAY[${item.knowledgePoint || '未分类'}],
            COALESCE((user_mistake_stats.knowledge_points ->> ${item.knowledgePoint || '未分类'})::int, 0) + 1
          ),
          '{}'::jsonb
        ),
        difficulties = COALESCE(
          jsonb_set(
            user_mistake_stats.difficulties,
            ARRAY[${item.difficulty || 'intermediate'}],
            COALESCE((user_mistake_stats.difficulties ->> ${item.difficulty || 'intermediate'})::int, 0) + 1
          ),
          '{}'::jsonb
        ),
        last_updated = NOW()
    `);
  } catch (error) {
    console.error('❌ 更新统计失败:', error);
  }
}
