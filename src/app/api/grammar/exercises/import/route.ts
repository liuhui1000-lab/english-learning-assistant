import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { grammarExercises, grammarPoints, insertGrammarExerciseSchema } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { examFile } = await request.json();

    if (!examFile) {
      return NextResponse.json(
        { error: '缺少必需的参数: examFile' },
        { status: 400 }
      );
    }

    // 读取已分析的数据
    const fs = require('fs');
    const path = require('path');

    const fullPath = path.join('/tmp', examFile);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    const examData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const textLines = examData.lines || [];

    // 调用提取API
    const extractResponse = await fetch('http://localhost:5000/api/grammar/exercises/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textLines.slice(0, 800).join('\n'),
        source: examFile.replace('exam_', '').replace('.json', '')
      })
    });

    const extractResult = await extractResponse.json();

    if (!extractResult.success) {
      return NextResponse.json(
        { error: extractResult.error },
        { status: 500 }
      );
    }

    const exercises = extractResult.data.exercises || [];

    // 批量插入数据库
    const db = await getDb();
    const inserted = [];
    for (const ex of exercises) {
      // 查找或创建语法知识点
      let grammarPointId = null;

      if (ex.category && ex.subcategory) {
        const existingPoints = await db.select()
          .from(grammarPoints)
          .where(eq(grammarPoints.name, ex.subcategory));

        if (existingPoints.length > 0) {
          grammarPointId = existingPoints[0].id;
        } else {
          // 创建新的语法知识点
          const [newPoint] = await db.insert(grammarPoints)
            .values({
              name: ex.subcategory,
              category: ex.category,
              description: `上海中考语法 - ${ex.category} - ${ex.subcategory}`,
              level: '8年级'
            })
            .returning();

          grammarPointId = newPoint.id;
        }
      }

      // 插入练习题
      const validatedData = insertGrammarExerciseSchema.parse({
        grammarPointId,
        question: ex.question,
        type: ex.type,
        options: ex.options || null,
        correctAnswer: ex.correct_answer,
        explanation: ex.explanation,
        difficulty: 1,
        source: ex.source,
        questionNumber: ex.question_number,
        category: ex.category,
        subcategory: ex.subcategory
      });

      const [insertedExercise] = await db.insert(grammarExercises)
        .values(validatedData)
        .returning();

      inserted.push(insertedExercise);
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: inserted.length,
        exercises: inserted
      }
    });

  } catch (error) {
    console.error('导入失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
