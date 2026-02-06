import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是上海中考英语语法专家。请从试卷文本中提取语法练习题。

重点提取以下类型的题目：
1. 语法选择题（单项选择）
2. 用所给词的适当形式填空（词转题）
3. 句型转换题

忽略：
- 听力题目
- 阅读理解选择题
- 完形填空题

请按以下JSON格式返回：
{
  "exercises": [
    {
      "question_number": "21",
      "type": "语法选择题",
      "question": "题干完整内容",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "correct_answer": "C",
      "explanation": "简要解析为什么选择这个答案",
      "category": "时态",
      "subcategory": "一般过去时"
    }
  ]
}

要求：
1. 只返回JSON，无其他文字
2. question_number是试卷中的原始题号
3. type必须是：语法选择题、词转题、句型转换题
4. options只有选择题才有
5. category和subcategory要准确反映语法知识点
6. explanation要简明扼要说明解题思路
7. 使用标准ASCII字符避免编码问题
`;

export async function POST(request: NextRequest) {
  try {
    const { text, source } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '缺少必需的参数: text' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    // 限制文本长度
    const maxLength = 10000;
    const truncatedText = text.length > maxLength
      ? text.slice(0, maxLength)
      : text;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `请从以下试卷文本中提取语法练习题：\n\n${truncatedText}`
      }
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.2
    });

    // 解析JSON
    let jsonContent = response.content;

    // 提取JSON部分
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    // 修复常见的JSON错误
    jsonContent = jsonContent
      .replace(/,\s*]/g, ']')
      .replace(/,\s*}/g, '}');

    const result = JSON.parse(jsonContent);

    // 添加来源信息
    if (result.exercises && Array.isArray(result.exercises)) {
      result.exercises.forEach((ex: any) => {
        ex.source = source || '未知来源';
      });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('练习题提取失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
