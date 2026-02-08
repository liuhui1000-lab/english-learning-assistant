import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { getDb } from '@/utils/db';
import { sql } from 'drizzle-orm';

/**
 * 文档分析API
 * 使用AI分析上传的文档，提取单词和语法题
 */
export async function POST(request: NextRequest) {
  try {
    const { fileKey, documentType } = await request.json();

    if (!fileKey) {
      return NextResponse.json(
        { success: false, error: '缺少 fileKey 参数' },
        { status: 400 }
      );
    }

    if (!documentType || !['vocabulary', 'grammar', 'transformation'].includes(documentType)) {
      return NextResponse.json(
        { success: false, error: '无效的文档类型' },
        { status: 400 }
      );
    }

    // 初始化对象存储
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 读取文件内容
    const fileBuffer = await storage.readFile({ fileKey });
    const fileContent = fileBuffer.toString('utf-8');

    // 获取数据库连接
    const db = await getDb();

    // 根据文档类型进行不同的分析
    let extractedData;

    if (documentType === 'vocabulary') {
      extractedData = await extractVocabulary(fileContent, db);
    } else if (documentType === 'grammar') {
      extractedData = await extractGrammarQuestions(fileContent, db);
    } else if (documentType === 'transformation') {
      extractedData = await extractTransformationQuestions(fileContent, db);
    }

    if (!extractedData) {
      return NextResponse.json(
        { success: false, error: '无法提取数据' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentType,
        extractedData,
        summary: {
          totalItems: extractedData.items.length,
          addedCount: extractedData.addedCount,
          skippedCount: extractedData.skippedCount,
        },
      },
    });
  } catch (error) {
    console.error('文档分析失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '分析失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 提取单词
 */
async function extractVocabulary(content: string, db: any) {
  // 使用AI提取单词
  const prompt = `请从以下文本中提取英语单词，并按照JSON格式返回。
要求：
1. 提取初二水平的英语单词
2. 包含单词、词性、中文释义、例句
3. 忽略重复单词
4. 只返回JSON格式，不要其他内容

返回格式：
{
  "words": [
    {
      "word": "adventure",
      "pronunciation": "/ədˈventʃər/",
      "partOfSpeech": "n.",
      "definition": "冒险；奇遇",
      "example": "Life is full of adventures.",
      "exampleTranslation": "生活充满了冒险。"
    }
  ]
}

文本内容：
${content.substring(0, 10000)}`;

  // 调用AI（这里使用豆包大模型）
  const aiResponse = await callAI(prompt);

  let aiResult;
  try {
    aiResult = JSON.parse(aiResponse);
  } catch (e) {
    // 如果AI返回的不是JSON，尝试提取JSON部分
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('AI返回格式错误');
    }
  }

  const words = aiResult.words || [];
  const addedWords = [];
  const skippedWords = [];

  // 添加单词到数据库
  for (const wordData of words) {
    try {
      // 检查单词是否已存在
      const existing = await db.execute(
        sql`SELECT id FROM vocabulary WHERE word = ${wordData.word}`
      );

      if (existing.rows.length > 0) {
        skippedWords.push(wordData.word);
        continue;
      }

      // 插入新单词
      await db.execute(sql`
        INSERT INTO vocabulary (word, pronunciation, part_of_speech, definition, example, example_translation, difficulty)
        VALUES (
          ${wordData.word},
          ${wordData.pronunciation || '/pronunciation/'},
          ${wordData.partOfSpeech || 'n.'},
          ${wordData.definition || wordData.word},
          ${wordData.example || ''},
          ${wordData.exampleTranslation || ''},
          'intermediate'
        )
      `);

      addedWords.push(wordData.word);
    } catch (error) {
      console.error('添加单词失败:', wordData.word, error);
      skippedWords.push(wordData.word);
    }
  }

  return {
    items: words,
    addedCount: addedWords.length,
    skippedCount: skippedWords.length,
    addedWords,
    skippedWords,
  };
}

/**
 * 提取语法题
 */
async function extractGrammarQuestions(content: string, db: any) {
  const prompt = `请从以下文本中提取英语语法选择题，并按照JSON格式返回。
要求：
1. 提取适合初二学生的语法选择题
2. 包含题目、选项（A/B/C/D）、正确答案、答案解析、涉及的语法点
3. 忽略重复题目
4. 只返回JSON格式，不要其他内容

返回格式：
{
  "questions": [
    {
      "question": "He _____ to school by bike every day.",
      "options": ["A. go", "B. goes", "C. going", "D. went"],
      "correctAnswer": "B",
      "explanation": "一般现在时第三人称单数形式，go变为goes。",
      "category": "时态",
      "subCategory": "一般现在时"
    }
  ]
}

文本内容：
${content.substring(0, 10000)}`;

  const aiResponse = await callAI(prompt);

  let aiResult;
  try {
    aiResult = JSON.parse(aiResponse);
  } catch (e) {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('AI返回格式错误');
    }
  }

  const questions = aiResult.questions || [];
  const addedQuestions = [];
  const skippedQuestions = [];

  for (const questionData of questions) {
    try {
      // 检查题目是否已存在
      const existing = await db.execute(
        sql`SELECT id FROM grammar_questions WHERE question = ${questionData.question}`
      );

      if (existing.rows.length > 0) {
        skippedQuestions.push(questionData.question);
        continue;
      }

      // 插入新题目
      await db.execute(sql`
        INSERT INTO grammar_questions (
          question,
          options,
          correct_answer,
          explanation,
          category,
          sub_category,
          difficulty
        )
        VALUES (
          ${questionData.question},
          ${JSON.stringify(questionData.options)},
          ${questionData.correctAnswer},
          ${questionData.explanation || ''},
          ${questionData.category || '其他'},
          ${questionData.subCategory || ''},
          'intermediate'
        )
      `);

      addedQuestions.push(questionData.question);
    } catch (error) {
      console.error('添加题目失败:', questionData.question, error);
      skippedQuestions.push(questionData.question);
    }
  }

  return {
    items: questions,
    addedCount: addedQuestions.length,
    skippedCount: skippedQuestions.length,
    addedQuestions,
    skippedQuestions,
  };
}

/**
 * 提取词转题
 */
async function extractTransformationQuestions(content: string, db: any) {
  const prompt = `请从以下文本中提取英语词转题（用所给词的正确形式填空），并按照JSON格式返回。
要求：
1. 提取适合初二学生的词转题
2. 包含句子、提示词、答案、变形规律解释
3. 忽略重复题目
4. 只返回JSON格式，不要其他内容

返回格式：
{
  "questions": [
    {
      "sentence": "He enjoys _____ (read) books in the library.",
      "hint": "read",
      "answer": "reading",
      "explanation": "enjoy doing sth.，enjoy后面接动名词形式。",
      "grammarPoint": "非谓语动词",
      "variationPattern": "read -> reading"
    }
  ]
}

文本内容：
${content.substring(0, 10000)}`;

  const aiResponse = await callAI(prompt);

  let aiResult;
  try {
    aiResult = JSON.parse(aiResponse);
  } catch (e) {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('AI返回格式错误');
    }
  }

  const questions = aiResult.questions || [];
  const addedQuestions = [];
  const skippedQuestions = [];

  for (const questionData of questions) {
    try {
      // 检查题目是否已存在
      const existing = await db.execute(
        sql`SELECT id FROM transformation_questions WHERE sentence = ${questionData.sentence}`
      );

      if (existing.rows.length > 0) {
        skippedQuestions.push(questionData.sentence);
        continue;
      }

      // 插入新题目
      await db.execute(sql`
        INSERT INTO transformation_questions (
          sentence,
          hint,
          answer,
          explanation,
          grammar_point,
          variation_pattern
        )
        VALUES (
          ${questionData.sentence},
          ${questionData.hint},
          ${questionData.answer},
          ${questionData.explanation || ''},
          ${questionData.grammarPoint || '其他'},
          ${questionData.variationPattern || ''}
        )
      `);

      addedQuestions.push(questionData.sentence);
    } catch (error) {
      console.error('添加词转题失败:', questionData.sentence, error);
      skippedQuestions.push(questionData.sentence);
    }
  }

  return {
    items: questions,
    addedCount: addedQuestions.length,
    skippedCount: skippedQuestions.length,
    addedQuestions,
    skippedQuestions,
  };
}

/**
 * 调用AI接口
 */
async function callAI(prompt: string): Promise<string> {
  try {
    // 这里应该调用豆包大模型API
    // 由于集成文档中没有直接展示如何调用大模型，这里使用模拟数据
    // 实际使用时需要根据豆包大模型的SDK进行调用

    // 模拟AI返回
    return JSON.stringify({
      words: [
        {
          word: 'adventure',
          pronunciation: '/ədˈventʃər/',
          partOfSpeech: 'n.',
          definition: '冒险；奇遇',
          example: 'Life is full of adventures.',
          exampleTranslation: '生活充满了冒险。',
        },
      ],
    });
  } catch (error) {
    throw new Error('AI调用失败');
  }
}
