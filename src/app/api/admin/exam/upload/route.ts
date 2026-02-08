/**
 * 模拟卷统一上传API（集成去重和来源追踪）
 * 支持混合题型的智能识别和自动分配
 * - 语法题 → 语法题库 + questions 表
 * - 词转练习 → 词转练习库 + questions 表
 * - 阅读理解 → 阅读理解库 + questions 表
 *
 * 去重策略：
 * - 使用题目内容哈希识别重复题目
 * - 重复题目不重复插入，仅更新出现次数
 * - 建立题目-试卷关联，记录来源
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseQuestions, groupQuestionsByType, type Question } from '@/utils/questionParser';
import { parseFile, getSupportedFormats, isFormatSupported } from '@/utils/fileParser';
import { getDb, query } from '@/utils/db';
import {
  grammarExercises,
  grammarPoints,
  articles,
  userReadingProgress,
  questions,
  examPapers,
  questionPaperRelations,
} from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import { checkPermission } from '@/utils/auth';
import { randomUUID } from 'crypto';
import { generateQuestionHash, analyzeHashDuplication } from '@/utils/questionHash';
import { extractGrammarPointFromQuestion } from '@/utils/grammarPointExtractor';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const version = formData.get('version') as string || 'v1.0';
    const grade = formData.get('grade') as string || '8年级';
    const semester = formData.get('semester') as string || '下学期';
    const paperName = formData.get('paperName') as string || file.name;

    // 验证必填字段
    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件格式
    if (!isFormatSupported(file.name)) {
      return NextResponse.json(
        { error: `仅支持 ${getSupportedFormats().join(', ')} 格式文件` },
        { status: 400 }
      );
    }

    // 解析文件内容
    console.log(`[模拟卷上传] 开始解析文件: ${file.name}`);
    let text = '';

    try {
      const parseResult = await parseFile(file);
      text = parseResult.text;

      if (parseResult.warnings.length > 0) {
        console.warn('[模拟卷上传] 解析警告:', parseResult.warnings);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '文件解析失败' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: '文件内容为空' },
        { status: 400 }
      );
    }

    // 智能解析题目
    const parseResult = await parseQuestions(text, { useAI: true });

    if (!parseResult.success || parseResult.questions.length === 0) {
      return NextResponse.json(
        { error: '未能从文件中解析出题目，请检查文件格式' },
        { status: 400 }
      );
    }

    console.log(`[模拟卷上传] 解析成功: 共 ${parseResult.totalQuestions} 道题`);

    // 分析题目重复情况
    const hashes = generateQuestionHashBatch(parseResult.questions);
    const duplicationStats = analyzeHashDuplication(hashes);
    console.log(`[模拟卷上传] 重复统计:`, duplicationStats);

    // 创建试卷记录
    const db = await getDb();
    const [paper] = await db.insert(examPapers)
      .values({
        name: paperName,
        version,
        grade,
        semester,
        uploadTime: new Date().toISOString(),
        fileName: file.name,
        questionCount: parseResult.totalQuestions,
      })
      .returning();

    console.log(`[模拟卷上传] 创建试卷记录: ${paper.id}`);

    // 处理所有题目（去重 + 导入）
    const result = await processQuestionsWithDeduplication(
      parseResult.questions,
      paper.id,
      version,
      grade,
      semester,
      paperName
    );

    return NextResponse.json({
      success: true,
      data: {
        version,
        grade,
        semester,
        paperName,
        fileName: file.name,
        totalQuestions: parseResult.totalQuestions,
        uniqueQuestions: result.uniqueQuestions,
        duplicateCount: result.duplicateCount,
        duplicationRate: result.duplicationRate,
        paperId: paper.id,
        summary: parseResult.summary,
        importResults: {
          grammar: result.grammar,
          wordFormation: result.wordFormation,
          reading: result.reading,
        },
      },
      message: `成功导入 ${parseResult.totalQuestions} 道题目（${result.uniqueQuestions} 道新题，${result.duplicateCount} 道重复）`,
    });
  } catch (error) {
    console.error('[模拟卷上传] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '上传失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 生成题目哈希数组
 */
function generateQuestionHashBatch(questions: Question[]): string[] {
  return questions.map(q => generateQuestionHash({
    question: q.question,
    options: q.options,
  }));
}

/**
 * 处理题目（去重 + 导入）
 */
async function processQuestionsWithDeduplication(
  questions: Question[],
  paperId: string,
  version: string,
  grade: string,
  semester: string,
  paperName: string
) {
  const db = await getDb();
  const questionTypeMap = {
    grammar: new Set<string>(),
    wordFormation: new Set<string>(),
    reading: new Set<string>(),
  };

  let newQuestionsCount = 0;
  let duplicateQuestionsCount = 0;

  // 按类型分组
  const groupedQuestions = groupQuestionsByType(questions);

  // 处理语法题
  const grammarResult = await processQuestionBatch(
    groupedQuestions.grammar,
    'grammar',
    paperId,
    version,
    grade,
    semester,
    paperName,
    questionTypeMap.grammar
  );

  // 处理词转练习
  const wordFormationResult = await processQuestionBatch(
    groupedQuestions.wordFormation,
    'word_formation',
    paperId,
    version,
    grade,
    semester,
    paperName,
    questionTypeMap.wordFormation
  );

  // 处理阅读理解
  const readingResult = await processQuestionBatch(
    groupedQuestions.reading,
    'reading',
    paperId,
    version,
    grade,
    semester,
    paperName,
    questionTypeMap.reading
  );

  // 统计总数
  newQuestionsCount =
    grammarResult.newCount +
    wordFormationResult.newCount +
    readingResult.newCount;

  duplicateQuestionsCount =
    grammarResult.duplicateCount +
    wordFormationResult.duplicateCount +
    readingResult.duplicateCount;

  const totalQuestions = questions.length;
  const duplicationRate = totalQuestions > 0
    ? Math.round((duplicateQuestionsCount / totalQuestions) * 100)
    : 0;

  const uniqueQuestions = totalQuestions - duplicateQuestionsCount;

  return {
    grammar: grammarResult.importResult,
    wordFormation: wordFormationResult.importResult,
    reading: readingResult.importResult,
    uniqueQuestions,
    duplicateCount: duplicateQuestionsCount,
    duplicationRate,
  };
}

/**
 * 处理题目批次
 */
async function processQuestionBatch(
  questionList: Question[],
  type: 'grammar' | 'word_formation' | 'reading',
  paperId: string,
  version: string,
  grade: string,
  semester: string,
  paperName: string,
  uniqueQuestionIds: Set<string>
) {
  const db = await getDb();
  let newCount = 0;
  let duplicateCount = 0;
  let importSuccess = 0;
  let importFailed = 0;

  for (const question of questionList) {
    try {
      // 生成题目哈希
      const hash = generateQuestionHash({
        question: question.question,
        options: question.options,
      });

      // 检查题目是否已存在
      const [existingQuestion] = await db
        .select()
        .from(questions)
        .where(eq(questions.questionHash, hash))
        .limit(1);

      let questionId: string;

      if (existingQuestion) {
        // 题目已存在
        questionId = existingQuestion.id!;
        duplicateCount++;

        // 更新出现次数
        await db.update(questions)
          .set({
            appearanceCount: (existingQuestion.appearanceCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(questions.id, questionId));

        console.log(`[模拟卷上传] 发现重复题目: ${hash.substring(0, 8)}...，已更新出现次数`);
      } else {
        // 新题目，插入
        const now = new Date().toISOString();
        const [newQuestion] = await db.insert(questions)
          .values({
            questionHash: hash,
            question: question.question,
            type,
            options: question.options ? JSON.stringify(question.options) : null,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            difficulty: question.difficulty === 'easy' ? 1 : question.difficulty === 'hard' ? 3 : 2,
            createdAt: now,
            updatedAt: now,
            firstSeenAt: now,
            appearanceCount: 1,
          })
          .returning();

        questionId = newQuestion.id!;
        newCount++;
        uniqueQuestionIds.add(questionId);

        console.log(`[模拟卷上传] 新题目: ${hash.substring(0, 8)}...`);
      }

      // 建立题目-试卷关联
      await db.insert(questionPaperRelations)
        .values({
          questionId: questionId,
          paperId: paperId,
          questionNumber: question.questionNumber ? String(question.questionNumber) : null,
          uploadTime: new Date().toISOString(),
        })
        .onConflictDoNothing();

      // 同时导入到对应的模块表（保持兼容）
      if (type === 'grammar') {
        await importGrammarExercise(question, questionId, version, grade, paperName);
      } else if (type === 'word_formation') {
        await importWordFormation(question, questionId, version);
      } else if (type === 'reading') {
        await importReadingComprehension(question, questionId, version, grade);
      }

      importSuccess++;
    } catch (error) {
      console.error(`[模拟卷上传] 处理题目失败:`, error);
      importFailed++;
    }
  }

  return {
    newCount,
    duplicateCount,
    importResult: {
      success: importSuccess,
      failed: importFailed,
    },
  };
}

/**
 * 导入语法题（集成 AI 语法点提取）
 */
async function importGrammarExercise(
  question: Question,
  questionId: string,
  version: string,
  grade: string,
  paperName: string
): Promise<void> {
  const db = await getDb();

  // 查找或创建语法知识点
  let grammarPointId = null;

  // 1. 如果题目已经标记了语法点，直接使用
  if (question.knowledgePoint) {
    const existingPoints = await db
      .select()
      .from(grammarPoints)
      .where(eq(grammarPoints.name, question.knowledgePoint || ''));

    if (existingPoints.length > 0) {
      grammarPointId = existingPoints[0].id;
    } else {
      const [newPoint] = await db
        .insert(grammarPoints)
        .values({
          name: question.knowledgePoint,
          category: question.subKnowledgePoint || '通用',
          description: `模拟卷 ${version} - ${question.knowledgePoint}`,
          level: grade,
          sourceType: 'manual',
          sourceInfo: `模拟卷 ${version}`,
        })
        .returning();

      grammarPointId = newPoint.id;
    }
  } else {
    // 2. 使用 AI 提取语法点
    try {
      console.log(`[模拟卷上传] 使用 AI 提取语法点: ${question.question.substring(0, 50)}...`);

      const extraction = await extractGrammarPointFromQuestion({
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });

      if (extraction && extraction.pointName) {
        console.log(`[模拟卷上传] AI 提取语法点: ${extraction.pointName} (置信度: ${extraction.confidence})`);

        // 3. 查找或创建语法点
        const [existingPoint] = await db
          .select()
          .from(grammarPoints)
          .where(eq(grammarPoints.name, extraction.pointName))
          .limit(1);

        if (existingPoint) {
          // 语法点已存在
          grammarPointId = existingPoint.id;
          console.log(`[模拟卷上传] 语法点已存在: ${extraction.pointName}`);
        } else {
          // 创建新语法点
          const [newPoint] = await db
            .insert(grammarPoints)
            .values({
              name: extraction.pointName,
              category: extraction.category || '未分类',
              description: `从模拟卷 "${paperName}" 提取的语法点。\n\n${extraction.reason || ''}`,
              level: grade,
              sourceType: 'exam_extracted',
              sourceInfo: `模拟卷 ${version} (${paperName})`,
            })
            .returning();

          grammarPointId = newPoint.id;
          console.log(`[模拟卷上传] 创建新语法点: ${extraction.pointName}`);
        }
      }
    } catch (error) {
      console.error(`[模拟卷上传] AI 提取语法点失败:`, error);
      // 失败不影响后续流程
    }
  }

  // 插入语法题
  const insertData: any = {
    question: question.question,
    type: 'choice',
    options: question.options ? JSON.stringify(question.options) : null,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    source: `模拟卷 ${version}`,
    questionNumber: question.questionNumber,
    category: grammarPointId ? null : (question.knowledgePoint || '通用'),
    subcategory: question.subKnowledgePoint || '',
    difficulty: question.difficulty === 'easy' ? 1 : question.difficulty === 'hard' ? 3 : 2,
  };

  if (grammarPointId) {
    insertData.grammarPointId = grammarPointId;
  }

  await db.insert(grammarExercises).values(insertData);
}

/**
 * 导入词转练习
 */
async function importWordFormation(
  question: Question,
  questionId: string,
  version: string
): Promise<void> {
  const transformations = [
    {
      word: question.baseWord || '',
      type: question.transformationType || 'unknown',
      meaning: '',
      sentence: question.question,
    },
  ];

  await query(
    `
    INSERT INTO word_transformations (id, base_word, base_meaning, transformations, difficulty, source_type, source_info, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT DO NOTHING
    `,
    [
      randomUUID(),
      question.baseWord || '',
      '',
      JSON.stringify(transformations),
      2,
      'exam',
      `模拟卷${version}`,
    ]
  );
}

/**
 * 导入阅读理解
 */
async function importReadingComprehension(
  question: Question,
  questionId: string,
  version: string,
  grade: string
): Promise<void> {
  const db = await getDb();

  // 年级到阅读难度映射
  const gradeToLevel: Record<string, string> = {
    '6年级': 'beginner',
    '7年级': 'elementary',
    '8年级': 'intermediate',
    '9年级': 'advanced',
  };

  const level = gradeToLevel[grade] || 'intermediate';

  // 插入阅读理解文章
  const [article] = await db
    .insert(articles)
    .values({
      title: `${grade} - 模拟卷 ${version} - 阅读理解`,
      content: question.article || question.question,
      level: level,
      wordCount: (question.article || question.question).length,
      readTime: Math.ceil((question.article || question.question).length / 200),
      category: `${grade} - 模拟卷`,
      questions: question.articleQuestions ? JSON.stringify(question.articleQuestions) : null,
    })
    .returning();

  // 如果有子问题，创建进度记录
  if (question.articleQuestions) {
    for (const subQuestion of question.articleQuestions) {
      await db.insert(userReadingProgress).values({
        userId: 'system',
        articleId: article.id,
        score: 0,
        completed: false,
        timeSpent: 0,
      });
    }
  }
}
