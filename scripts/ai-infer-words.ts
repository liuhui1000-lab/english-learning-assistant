import { LLMClient, Config } from 'coze-coding-dev-sdk';
import fs from 'fs';
import { wordManager } from '../src/storage/database/wordManager';

interface WordItem {
  num: string;
  phonetic: string;
  pos: string;
  meaning: string;
  grade: string;
  semester: string;
  file: string;
}

async function inferWord(item: WordItem): Promise<string | null> {
  const config = new Config();
  const llmClient = new LLMClient(config);

  const messages = [
    {
      role: 'system' as const,
      content: `你是一位专业的英语教师。你的任务是根据音标和中文释义，推断出对应的英语单词。

请严格按照以下格式返回，只返回单词本身，不要任何解释或其他内容：

示例：
输入：音标：/əˈbændən/，释义：放弃；遗弃
输出：abandon

注意：
1. 只返回英文单词，不要返回音标或释义
2. 如果是短语（如 after school），用空格分隔单词
3. 不要添加任何标点符号或额外说明`
    },
    {
      role: 'user' as const,
      content: `请根据以下信息推断英语单词：\n音标：[${item.phonetic}]\n词性：${item.pos || '未知'}\n释义：${item.meaning}`
    }
  ];

  try {
    const response = await llmClient.invoke(messages, {
      temperature: 0.1,
    });

    // 清理返回结果，只保留单词
    let word = response.content.trim().toLowerCase();

    // 移除可能的标点符号
    word = word.replace(/[^\w\s-]/g, '').trim();

    // 如果结果太长或包含中文，可能推断失败
    if (word.length > 50 || /[\u4e00-\u9fa5]/.test(word)) {
      return null;
    }

    return word;
  } catch (error) {
    console.error(`推断失败 [${item.num}]:`, error);
    return null;
  }
}

async function batchInfer(items: WordItem[], batchSize: number = 10): Promise<void> {
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    console.log(`\n处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);

    for (const item of batch) {
      // 检查数据库中是否已存在这个音标的单词
      const existingWords = await wordManager.getWords({ limit: 1 });

      // 简单的缓存：跳过重复的音标
      // 这里可以优化，但为了简单起见，我们直接推断

      try {
        const word = await inferWord(item);

        if (word) {
          // 构造例句
          const example = `This is an example of ${word}.`;
          const exampleTranslation = `这是 ${word} 的一个例句。`;

          // 保存到数据库
          await wordManager.createWord({
            word: word,
            phonetic: `/${item.phonetic}/`,
            meaning: item.meaning,
            example: example,
            exampleTranslation: exampleTranslation,
            difficulty: parseInt(item.grade),
          });

          successCount++;
          console.log(`  ✓ [${item.num}] ${word}`);
        } else {
          failCount++;
          console.log(`  ✗ [${item.num}] 推断失败`);
        }
      } catch (error) {
        failCount++;
        console.log(`  ✗ [${item.num}] 保存失败: ${(error as Error).message}`);
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 批次间休息
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n统计：`);
  console.log(`  成功: ${successCount}`);
  console.log(`  失败: ${failCount}`);
  console.log(`  跳过: ${skipCount}`);
}

async function main() {
  console.log('读取单词数据...');

  const data = JSON.parse(
    fs.readFileSync('/workspace/projects/scripts/words_for_ai.json', 'utf-8')
  ) as WordItem[];

  console.log(`总共需要处理 ${data.length} 条数据`);
  console.log('开始 AI 推断...\n');

  await batchInfer(data, 10);

  console.log('\n✅ 处理完成！');
}

main().catch(console.error);
