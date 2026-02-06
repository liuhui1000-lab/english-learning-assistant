import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是上海中考英语语法专家。分析试卷，提取语法知识点。

请按以下JSON格式返回：
{
  "grammar_points": [
    {"category": "时态", "subcategory": "一般过去时", "description": "描述"}
  ]
}

要求：
1. 只返回JSON，无其他文字
2. 使用标准ASCII字符避免编码问题
3. 语法知识点包括：时态、语态、从句、非谓语动词、介词、连词、冠词、代词、情态动词、形容词/副词、主谓一致
4. 数组元素之间用逗号分隔
5. 不要在JSON中包含原始试卷文本`

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '缺少必需的参数: text' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    // 限制文本长度，避免超时
    const maxLength = 15000;
    const truncatedText = text.length > maxLength
      ? text.slice(0, maxLength) + '...'
      : text;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `请分析以下试卷文本内容：\n\n${truncatedText}`
      }
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.3
    });

    // 尝试解析JSON
    let jsonContent = response.content;

    // 尝试提取JSON部分（移除可能的markdown代码块标记）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    // 尝试修复常见的JSON错误
    try {
      // 替换常见的错误模式
      jsonContent = jsonContent
        .replace(/,\s*]/g, ']')  // 移除数组末尾多余的逗号
        .replace(/,\s*}/g, '}')  // 移除对象末尾多余的逗号
        .replace(/}\s*{/g, '},{');  // 修复连续对象

      const analysis = JSON.parse(jsonContent);

      // 验证数据结构
      if (!analysis.grammar_points) {
        throw new Error('返回数据缺少grammar_points字段');
      }

      return NextResponse.json({
        success: true,
        data: {
          grammar_points: analysis.grammar_points,
          exercises: []  // 简化：暂时不提取习题
        }
      });
    } catch (parseError) {
      console.error('JSON解析失败，尝试使用LLM重新生成...');
      console.error('错误:', parseError);

      // 如果解析失败，尝试让AI重新生成一个更简单的版本
      try {
        const retryResponse = await client.invoke([
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `请重新分析以下试卷文本，确保返回严格有效的JSON格式：\n\n${truncatedText}`
          }
        ], {
          model: 'doubao-seed-1-6-251015',
          temperature: 0.1  // 更低的温度以获得更稳定的结果
        });

        let retryContent = retryResponse.content;
        const retryMatch = retryContent.match(/\{[\s\S]*\}/);
        if (retryMatch) {
          retryContent = retryMatch[0];
        }

        retryContent = retryContent
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}');

        const analysis = JSON.parse(retryContent);

        return NextResponse.json({
          success: true,
          data: {
            grammar_points: analysis.grammar_points,
            exercises: []
          }
        });
      } catch (retryError) {
        console.error('重试也失败了:', retryError);
        throw new Error(`AI返回的JSON格式错误: ${parseError}`);
      }
    }

  } catch (error) {
    console.error('AI分析失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
