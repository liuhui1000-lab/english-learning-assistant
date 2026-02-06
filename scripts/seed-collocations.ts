import { collocationManager } from '../src/storage/database/collocationManager';

async function seedCollocations() {
  console.log('开始导入固定搭配...');

  const collocations = [
    // 动词短语
    { phrase: 'look forward to', meaning: '期待；盼望', example: 'I look forward to seeing you again.', exampleTranslation: '我期待再次见到你。', category: '动词+介词', difficulty: 2 },
    { phrase: 'be good at', meaning: '擅长', example: 'She is good at English.', exampleTranslation: '她擅长英语。', difficulty: 1 },
    { phrase: 'be interested in', meaning: '对...感兴趣', example: 'I am interested in science.', exampleTranslation: '我对科学感兴趣。', difficulty: 1 },
    { phrase: 'be afraid of', meaning: '害怕', example: 'Don\'t be afraid of difficulties.', exampleTranslation: '不要害怕困难。', difficulty: 1 },
    { phrase: 'be proud of', meaning: '为...感到自豪', example: 'I am proud of my country.', exampleTranslation: '我为我的国家感到自豪。', difficulty: 1 },
    { phrase: 'be famous for', meaning: '因...而著名', example: 'Shanghai is famous for its modern buildings.', exampleTranslation: '上海以现代化的建筑而闻名。', difficulty: 1 },
    { phrase: 'be strict with', meaning: '对...要求严格', example: 'Our teacher is strict with us.', exampleTranslation: '我们的老师对我们要求严格。', difficulty: 2 },
    { phrase: 'be responsible for', meaning: '对...负责', example: 'You are responsible for your safety.', exampleTranslation: '你要对自己的安全负责。', difficulty: 2 },
    { phrase: 'depend on', meaning: '取决于；依靠', example: 'Success depends on hard work.', exampleTranslation: '成功取决于努力工作。', difficulty: 2 },
    { phrase: 'give up', meaning: '放弃', example: 'Never give up your dreams.', exampleTranslation: '永远不要放弃你的梦想。', difficulty: 1 },
    { phrase: 'look after', meaning: '照顾', example: 'Please look after my cat.', exampleTranslation: '请照顾我的猫。', difficulty: 1 },
    { phrase: 'look for', meaning: '寻找', example: 'I am looking for my pen.', exampleTranslation: '我在找我的钢笔。', difficulty: 1 },
    { phrase: 'get on/along (well) with', meaning: '与...相处融洽', example: 'I get on well with my classmates.', exampleTranslation: '我和同学相处融洽。', difficulty: 2 },
    { phrase: 'get used to', meaning: '习惯于', example: 'I am getting used to the weather here.', exampleTranslation: '我正在习惯这里的天气。', difficulty: 2 },
    { phrase: 'go on', meaning: '继续', example: 'Go on with your story.', exampleTranslation: '继续你的故事。', difficulty: 1 },
    { phrase: 'put on', meaning: '穿上', example: 'Put on your coat.', exampleTranslation: '穿上你的外套。', difficulty: 1 },
    { phrase: 'take off', meaning: '脱下；（飞机）起飞', example: 'Take off your shoes.', exampleTranslation: '脱下你的鞋子。', difficulty: 1 },
    { phrase: 'take part in', meaning: '参加', example: 'Take part in the activity.', exampleTranslation: '参加这个活动。', difficulty: 1 },
    { phrase: 'take care of', meaning: '照顾；处理', example: 'Take care of yourself.', exampleTranslation: '照顾好自己。', difficulty: 1 },
    { phrase: 'worry about', meaning: '担心', example: 'Don\'t worry about me.', exampleTranslation: '别担心我。', difficulty: 1 },
  ];

  try {
    for (const collocation of collocations) {
      await collocationManager.createCollocation(collocation);
    }
    console.log(`✓ 已导入 ${collocations.length} 个固定搭配`);
  } catch (error) {
    console.error('导入固定搭配失败:', error);
    process.exit(1);
  }
}

seedCollocations();
