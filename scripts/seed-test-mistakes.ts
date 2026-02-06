import { getDb } from 'coze-coding-dev-sdk';
import { transformationMistakes } from '../src/storage/database/shared/schema';

async function seedTestMistakes() {
  const db = await getDb();

  // 获取词转数据
  const transformations = await db.executeSql('SELECT id, base_word FROM word_transformations LIMIT 1');
  if (transformations.rows.length === 0) {
    console.log('No transformations found');
    return;
  }

  const transformationId = transformations.rows[0].id;

  // 创建一些测试错题
  const testMistakes = [
    {
      userId: 'test-user',
      transformationId,
      word: 'actor',
      type: '名词（人）',
      sentence: 'He wants to be an _____ in the future.',
      wrongAnswer: 'acter',
      correctAnswer: 'actor',
      mistakeType: '拼写错误',
      explanation: '正确答案是 actor，这是名词，表示"演员"',
    },
    {
      userId: 'test-user',
      transformationId,
      word: 'action',
      type: '名词',
      sentence: 'The _____ movie is very exciting.',
      wrongAnswer: 'act',
      correctAnswer: 'action',
      mistakeType: '变形错误',
      explanation: '正确答案是 action，这是名词形式，表示"动作"',
    },
    {
      userId: 'test-user',
      transformationId,
      word: 'active',
      type: '形容词',
      sentence: 'She is very _____ in sports.',
      wrongAnswer: 'actived',
      correctAnswer: 'active',
      mistakeType: '变形错误',
      explanation: '正确答案是 active，这是形容词形式，表示"活跃的"',
    },
  ];

  for (const mistake of testMistakes) {
    await db.insert(transformationMistakes).values(mistake);
    console.log(`Inserted mistake for: ${mistake.word}`);
  }

  console.log('Test mistakes seeded successfully');
}

seedTestMistakes().catch(console.error);
