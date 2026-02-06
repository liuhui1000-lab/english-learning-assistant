import { wordManager } from '../src/storage/database/wordManager';

async function seedWords() {
  console.log('开始导入单词数据...');

  const words = [
    { word: 'abandon', phonetic: '/əˈbændən/', meaning: '放弃；遗弃', example: 'He decided to abandon the project.', exampleTranslation: '他决定放弃这个项目。', difficulty: 2 },
    { word: 'achieve', phonetic: '/əˈtʃiːv/', meaning: '实现；达到', example: 'You can achieve your goals with hard work.', exampleTranslation: '通过努力你可以实现目标。', difficulty: 1 },
    { word: 'admit', phonetic: '/ədˈmɪt/', meaning: '承认；准许进入', example: 'He admitted his mistake.', exampleTranslation: '他承认了自己的错误。', difficulty: 2 },
    { word: 'afford', phonetic: '/əˈfɔːrd/', meaning: '买得起；承担得起', example: 'I cannot afford a new car.', exampleTranslation: '我买不起新车。', difficulty: 2 },
    { word: 'argue', phonetic: '/ˈɑːɡjuː/', meaning: '争论；辩论', example: 'Don\'t argue with your parents.', exampleTranslation: '不要和父母争论。', difficulty: 2 },
    { word: 'avoid', phonetic: '/əˈvɔɪd/', meaning: '避免；避开', example: 'You should avoid making the same mistake.', exampleTranslation: '你应该避免犯同样的错误。', difficulty: 1 },
    { word: 'belong', phonetic: '/bɪˈlɒŋ/', meaning: '属于', example: 'This book belongs to me.', exampleTranslation: '这本书属于我。', difficulty: 1 },
    { word: 'celebrate', phonetic: '/ˈselɪbreɪt/', meaning: '庆祝', example: 'We celebrate Chinese New Year every year.', exampleTranslation: '我们每年都庆祝中国新年。', difficulty: 1 },
    { word: 'communicate', phonetic: '/kəˈmjuːnɪkeɪt/', meaning: '交流；沟通', example: 'We need to communicate better.', exampleTranslation: '我们需要更好地沟通。', difficulty: 2 },
    { word: 'develop', phonetic: '/dɪˈveləp/', meaning: '发展；培养', example: 'Reading helps develop your vocabulary.', exampleTranslation: '阅读有助于培养词汇量。', difficulty: 1 },
    { word: 'encourage', phonetic: '/ɪnˈkʌrɪdʒ/', meaning: '鼓励', example: 'Teachers should encourage students.', exampleTranslation: '老师应该鼓励学生。', difficulty: 1 },
    { word: 'expect', phonetic: '/ɪkˈspekt/', meaning: '期望；预期', example: 'I expect to finish the work soon.', exampleTranslation: '我期望很快完成这项工作。', difficulty: 1 },
    { word: 'express', phonetic: '/ɪkˈspres/', meaning: '表达', example: 'She expressed her opinion clearly.', exampleTranslation: '她清楚地表达了她的观点。', difficulty: 2 },
    { word: 'fail', phonetic: '/feɪl/', meaning: '失败；不及格', example: 'Don\'t be afraid of failure.', exampleTranslation: '不要害怕失败。', difficulty: 1 },
    { word: 'manage', phonetic: '/ˈmænɪdʒ/', meaning: '管理；设法对付', example: 'How do you manage your time?', exampleTranslation: '你如何管理你的时间？', difficulty: 2 },
    { word: 'offer', phonetic: '/ˈɒfər/', meaning: '提供；提议', example: 'He offered me a job.', exampleTranslation: '他给我提供了一份工作。', difficulty: 1 },
    { word: 'protect', phonetic: '/prəˈtekt/', meaning: '保护', example: 'We should protect the environment.', exampleTranslation: '我们应该保护环境。', difficulty: 1 },
    { word: 'realize', phonetic: '/ˈriːəlaɪz/', meaning: '意识到；实现', example: 'I realized my mistake later.', exampleTranslation: '我后来意识到了我的错误。', difficulty: 1 },
    { word: 'refuse', phonetic: '/rɪˈfjuːz/', meaning: '拒绝', example: 'She refused to help him.', exampleTranslation: '她拒绝帮助他。', difficulty: 2 },
    { word: 'suggest', phonetic: '/səˈdʒest/', meaning: '建议', example: 'I suggest you take a break.', exampleTranslation: '我建议你休息一下。', difficulty: 2 },
  ];

  try {
    for (const word of words) {
      await wordManager.createWord(word);
    }
    console.log(`✓ 已导入 ${words.length} 个单词`);
  } catch (error) {
    console.error('导入单词失败:', error);
    process.exit(1);
  }
}

seedWords();
