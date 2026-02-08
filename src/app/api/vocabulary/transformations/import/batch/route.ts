import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getDb } from '@/utils/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

interface TransformationData {
  word: string;
  type: string;
  meaning: string;
}

interface WordGroup {
  baseWord: string;
  baseMeaning: string;
  transformations: TransformationData[];
}

export async function POST(req: NextRequest) {
  try {
    const { start = 0, count = 10 } = await req.json();

    // 读取解析的考纲数据
    const jsonPath = path.join(process.cwd(), 'assets', '词转考纲解析.json');
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const allGroups: WordGroup[] = JSON.parse(fileContent);

    // 分批处理
    const batchGroups = allGroups.slice(start, start + count);
    console.log(`Processing batch ${start}-${start + batchGroups.length} of ${allGroups.length}...`);

    const config = new Config();
    const client = new LLMClient(config);
    const db = await getDb();

    const results = [];

    for (const group of batchGroups) {
      try {
        // 使用AI生成练习句子
        const transformationsWithSentences = await generateSentences(client, group);

        // 插入数据库
        await db.execute(
          sql`INSERT INTO word_transformations (id, base_word, base_meaning, transformations, difficulty, created_at)
          VALUES (${randomUUID()}, ${group.baseWord}, ${group.baseMeaning}, ${JSON.stringify(transformationsWithSentences)}, 2, NOW())
          ON CONFLICT (id) DO NOTHING`
        );

        results.push({
          baseWord: group.baseWord,
          success: true,
          count: transformationsWithSentences.length,
        });
      } catch (error) {
        console.error(`Error processing ${group.baseWord}:`, error);
        results.push({
          baseWord: group.baseWord,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      total: allGroups.length,
      nextStart: start + batchGroups.length,
      hasMore: start + batchGroups.length < allGroups.length,
    });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function generateSentences(client: LLMClient, group: WordGroup) {
  // 构建提示词
  const transformationList = group.transformations
    .map((t) => `${t.word} (${t.type}): ${t.meaning}`)
    .join('\n');

  const prompt = `请为基础词 "${group.baseWord}" (含义: ${group.baseMeaning}) 的每个词性转换形式生成一个适合上海初二学生的英语填空练习句子。

要求：
1. 句子必须包含该转换词的正确形式
2. 句子中留一个空 "_____" 供学生填写
3. 句子难度适中，符合初二学生水平
4. 只返回JSON格式，不要其他文字

词性转换列表：
${transformationList}

请按照以下JSON格式返回（确保是有效的JSON数组）：
[
  {
    "word": "转换词",
    "type": "词性",
    "meaning": "含义",
    "sentence": "包含_____的句子"
  }
]`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: prompt }];

  const response = await client.invoke(messages, {
    temperature: 0.7,
  });

  // 解析AI返回的JSON
  try {
    // 尝试提取JSON部分
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
    const generatedSentences = JSON.parse(jsonStr);

    // 将AI生成的句子与原始数据合并
    return group.transformations.map((originalTrans) => {
      const generated = generatedSentences.find((g: any) => g.word === originalTrans.word);
      return {
        ...originalTrans,
        sentence: generated?.sentence || generateFallbackSentence(originalTrans),
      };
    });
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    // 如果解析失败，使用备用句子
    return group.transformations.map((trans) => ({
      ...trans,
      sentence: generateFallbackSentence(trans),
    }));
  }
}

function generateFallbackSentence(trans: any): string {
  // 简单的备用句子生成
  const templates = [
    `The _____ is very important in our daily life.`,
    `Please _____ this task carefully.`,
    `She showed great _____ in her work.`,
    `The _____ of this project is quite impressive.`,
    `We need to _____ our efforts to succeed.`,
  ];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate.replace('_____', trans.word);
}
