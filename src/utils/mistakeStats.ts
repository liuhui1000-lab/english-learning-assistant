import { getDb } from '@/utils/db';
import { sql } from 'drizzle-orm';

/**
 * 实时统计更新工具
 * 用户添加错题时自动调用，实时更新统计数据
 */

export interface MistakeData {
  id?: number;
  userId: string;
  question: string;
  knowledgePoint?: string;
  subKnowledgePoint?: string;
  difficulty?: string;
  source?: string;
  options?: string[];
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
}

/**
 * 添加错题（包含去重检查和实时统计更新）
 */
export async function addMistake(db: any, mistake: MistakeData): Promise<{
  success: boolean;
  mistakeId?: number;
  message: string;
  isDuplicate?: boolean;
  duplicateId?: number;
}> {
  try {
    // 1. 去重检查
    const duplicateCheck = await checkExactDuplicate(db, mistake.userId, mistake.question);

    if (duplicateCheck) {
      return {
        success: false,
        message: '该错题已存在',
        isDuplicate: true,
        duplicateId: duplicateCheck
      };
    }

    // 2. 插入错题
    const result = await db.execute(sql`
      INSERT INTO user_mistakes (
        user_id,
        question,
        knowledge_point,
        sub_knowledge_point,
        difficulty,
        source,
        options,
        user_answer,
        correct_answer,
        explanation,
        status
      )
      VALUES (
        ${mistake.userId},
        ${mistake.question},
        ${mistake.knowledgePoint || '未分类'},
        ${mistake.subKnowledgePoint || ''},
        ${mistake.difficulty || 'intermediate'},
        ${mistake.source || 'practice'},
        ${mistake.options ? JSON.stringify(mistake.options) : null},
        ${mistake.userAnswer || ''},
        ${mistake.correctAnswer || ''},
        ${mistake.explanation || ''},
        'unanalyzed'
      )
      RETURNING id
    `);

    const mistakeId = result.rows[0].id;

    // 3. 实时更新统计
    await updateRealTimeStats(db, mistake.userId, {
      knowledgePoint: mistake.knowledgePoint || '未分类',
      difficulty: mistake.difficulty || 'intermediate',
      source: mistake.source || 'practice'
    });

    // 4. 更新用户状态
    await db.execute(sql`
      UPDATE users
      SET 
        has_new_mistakes = true,
        last_mistake_updated = NOW()
      WHERE id = ${mistake.userId}
    `);

    return {
      success: true,
      mistakeId,
      message: '错题添加成功'
    };

  } catch (error) {
    console.error('❌ 添加错题失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加失败'
    };
  }
}

/**
 * 实时更新统计
 */
export async function updateRealTimeStats(
  db: any,
  userId: string,
  item: {
    knowledgePoint: string;
    difficulty: string;
    source: string;
  }
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO user_mistake_stats (user_id, total_count, knowledge_points, difficulties, sources, last_updated)
      VALUES (
        ${userId},
        1,
        ${JSON.stringify({ [item.knowledgePoint]: 1 })},
        ${JSON.stringify({ [item.difficulty]: 1 })},
        ${JSON.stringify({ [item.source]: 1 })},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        total_count = user_mistake_stats.total_count + 1,
        knowledge_points = COALESCE(
          jsonb_set(
            user_mistake_stats.knowledge_points,
            ARRAY[item.knowledgePoint],
            COALESCE((user_mistake_stats.knowledge_points ->> ${item.knowledgePoint})::int, 0) + 1
          ),
          '{}'::jsonb
        ),
        difficulties = COALESCE(
          jsonb_set(
            user_mistake_stats.difficulties,
            ARRAY[item.difficulty],
            COALESCE((user_mistake_stats.difficulties ->> ${item.difficulty})::int, 0) + 1
          ),
          '{}'::jsonb
        ),
        sources = COALESCE(
          jsonb_set(
            user_mistake_stats.sources,
            ARRAY[item.source],
            COALESCE((user_mistake_stats.sources ->> ${item.source})::int, 0) + 1
          ),
          '{}'::jsonb
        ),
        last_updated = NOW()
    `);
  } catch (error) {
    console.error('❌ 更新统计失败:', error);
  }
}

/**
 * 获取用户实时统计
 */
export async function getUserStats(db: any, userId: string): Promise<{
  totalCount: number;
  knowledgePoints: Record<string, number>;
  difficulties: Record<string, number>;
  sources: Record<string, number>;
  lastUpdated: Date | null;
} | null> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM user_mistake_stats
      WHERE user_id = ${userId}
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const stats = result.rows[0];

    return {
      totalCount: stats.total_count || 0,
      knowledgePoints: stats.knowledge_points || {},
      difficulties: stats.difficulties || {},
      sources: stats.sources || {},
      lastUpdated: stats.last_updated
    };

  } catch (error) {
    console.error('❌ 获取用户统计失败:', error);
    return null;
  }
}

/**
 * 获取用户深度分析报告
 */
export async function getUserDeepAnalysis(db: any, userId: string): Promise<{
  weakPoints: Array<{
    knowledgePoint: string;
    count: number;
    percentage: number;
  }>;
  learningTrend: any;
  reviewSuggestion: string;
  priorityPoints: string[];
  lastAnalysisDate: Date | null;
} | null> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM user_mistake_analysis
      WHERE user_id = ${userId}
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const analysis = result.rows[0];

    return {
      weakPoints: analysis.weak_points || [],
      learningTrend: analysis.learning_trend || {},
      reviewSuggestion: analysis.review_suggestion || '',
      priorityPoints: analysis.priority_points || [],
      lastAnalysisDate: analysis.last_analysis_date
    };

  } catch (error) {
    console.error('❌ 获取用户深度分析失败:', error);
    return null;
  }
}

/**
 * 批量添加错题（支持批量上传）
 */
export async function batchAddMistakes(
  db: any,
  mistakes: MistakeData[]
): Promise<{
  success: boolean;
  addedCount: number;
  duplicateCount: number;
  results: Array<{
    index: number;
    success: boolean;
    mistakeId?: number;
    message: string;
  }>;
}> {
  const results = [];
  let addedCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < mistakes.length; i++) {
    const result = await addMistake(db, mistakes[i]);
    results.push({
      index: i,
      success: result.success,
      mistakeId: result.mistakeId,
      message: result.message
    });

    if (result.success) {
      addedCount++;
    } else if (result.isDuplicate) {
      duplicateCount++;
    }
  }

  return {
    success: true,
    addedCount,
    duplicateCount,
    results
  };
}

/**
 * 检查精确重复（辅助函数）
 */
async function checkExactDuplicate(
  db: any,
  userId: string,
  question: string
): Promise<number | null> {
  try {
    const result = await db.execute(sql`
      SELECT id FROM user_mistakes 
      WHERE user_id = $1 AND question = $2 
      LIMIT 1
    `, [userId, question]);

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    return null;
  } catch (error) {
    console.error('❌ 精确去重检查失败:', error);
    return null;
  }
}

/**
 * 删除错题（软删除，更新统计）
 */
export async function deleteMistake(db: any, userId: string, mistakeId: number): Promise<boolean> {
  try {
    // 1. 获取错题信息（用于更新统计）
    const mistakeResult = await db.execute(sql`
      SELECT knowledge_point, difficulty, source
      FROM user_mistakes
      WHERE id = $1 AND user_id = $2
    `, [mistakeId, userId]);

    if (mistakeResult.rows.length === 0) {
      return false;
    }

    const mistake = mistakeResult.rows[0];

    // 2. 删除错题
    await db.execute(sql`
      DELETE FROM user_mistakes
      WHERE id = $1 AND user_id = $2
    `, [mistakeId, userId]);

    // 3. 更新统计
    await decrementStats(db, userId, mistake);

    return true;

  } catch (error) {
    console.error('❌ 删除错题失败:', error);
    return false;
  }
}

/**
 * 递减统计（删除错题时使用）
 */
async function decrementStats(
  db: any,
  userId: string,
  item: {
    knowledge_point: string;
    difficulty: string;
    source: string;
  }
): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE user_mistake_stats
      SET
        total_count = GREATEST(total_count - 1, 0),
        knowledge_points = CASE
          WHEN (knowledge_points ->> ${item.knowledge_point})::int > 1
          THEN jsonb_set(knowledge_points, ARRAY[${item.knowledge_point}], ((knowledge_points ->> ${item.knowledge_point})::int - 1)::text::jsonb)
          ELSE knowledge_points - ${item.knowledge_point}
        END,
        difficulties = CASE
          WHEN (difficulties ->> ${item.difficulty})::int > 1
          THEN jsonb_set(difficulties, ARRAY[${item.difficulty}], ((difficulties ->> ${item.difficulty})::int - 1)::text::jsonb)
          ELSE difficulties - ${item.difficulty}
        END,
        sources = CASE
          WHEN (sources ->> ${item.source})::int > 1
          THEN jsonb_set(sources, ARRAY[${item.source}], ((sources ->> ${item.source})::int - 1)::text::jsonb)
          ELSE sources - ${item.source}
        END,
        last_updated = NOW()
      WHERE user_id = ${userId}
    `);
  } catch (error) {
    console.error('❌ 递减统计失败:', error);
  }
}
