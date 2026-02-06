import { collocationManager } from '../src/storage/database/collocationManager';

async function seedCollocations() {
  console.log('开始更新固定搭配数据（完整形式 + 易混淆对比）...');

  // 完整形式的固定搭配
  const collocations = [
    // 动词短语（完整形式）
    { phrase: 'look forward to doing sth.', meaning: '期待做某事', example: 'I look forward to seeing you again.', exampleTranslation: '我期待再次见到你。', category: '动词短语', difficulty: 2 },
    { phrase: 'be interested in doing sth./sth.', meaning: '对做某事/某事感兴趣', example: 'I am interested in learning English.', exampleTranslation: '我对学习英语感兴趣。', difficulty: 1 },
    { phrase: 'be afraid of doing sth./sth.', meaning: '害怕做某事/某事', example: 'Don\'t be afraid of making mistakes.', exampleTranslation: '不要害怕犯错。', difficulty: 1 },
    { phrase: 'be good at doing sth./sth.', meaning: '擅长做某事/某事', example: 'She is good at playing the piano.', exampleTranslation: '她擅长弹钢琴。', difficulty: 1 },
    { phrase: 'be proud of doing sth./sth.', meaning: '为做某事/某事感到自豪', example: 'I am proud of my achievements.', exampleTranslation: '我为我的成就感到自豪。', difficulty: 1 },
    { phrase: 'be famous for doing sth./sth.', meaning: '因做某事/某事而著名', example: 'Shanghai is famous for its modern buildings.', exampleTranslation: '上海以现代化的建筑而闻名。', difficulty: 1 },
    { phrase: 'be responsible for doing sth./sth.', meaning: '对做某事/某事负责', example: 'You are responsible for your homework.', exampleTranslation: '你要对你的作业负责。', difficulty: 2 },
    { phrase: 'be used to doing sth.', meaning: '习惯于做某事', example: 'I am used to getting up early.', exampleTranslation: '我习惯了早起。', difficulty: 2 },
    { phrase: 'be strict with sb.', meaning: '对某人严格', example: 'Our teacher is strict with us.', exampleTranslation: '我们的老师对我们要求严格。', difficulty: 2 },
    { phrase: 'depend on/upon sth./sb.', meaning: '取决于某事/依靠某人', example: 'Success depends on hard work.', exampleTranslation: '成功取决于努力工作。', difficulty: 2 },
    { phrase: 'give up doing sth.', meaning: '放弃做某事', example: 'Never give up your dreams.', exampleTranslation: '永远不要放弃你的梦想。', difficulty: 1 },
    { phrase: 'look after sb./sth.', meaning: '照顾某人/某物', example: 'Please look after my cat.', exampleTranslation: '请照顾我的猫。', difficulty: 1 },
    { phrase: 'look for sth./sb.', meaning: '寻找某物/某人', example: 'I am looking for my pen.', exampleTranslation: '我在找我的钢笔。', difficulty: 1 },
    { phrase: 'get on/along (well) with sb.', meaning: '与某人相处融洽', example: 'I get on well with my classmates.', exampleTranslation: '我和同学相处融洽。', difficulty: 2 },
    { phrase: 'put on sth.', meaning: '穿上某物', example: 'Put on your coat.', exampleTranslation: '穿上你的外套。', difficulty: 1 },
    { phrase: 'take off sth.', meaning: '脱下某物；（飞机）起飞', example: 'Take off your shoes.', exampleTranslation: '脱下你的鞋子。', difficulty: 1 },
    { phrase: 'take part in sth./doing sth.', meaning: '参加某事/做某事', example: 'Take part in the activity.', exampleTranslation: '参加这个活动。', difficulty: 1 },
    { phrase: 'take care of sb./sth.', meaning: '照顾某人/某物', example: 'Take care of yourself.', exampleTranslation: '照顾好自己。', difficulty: 1 },
    { phrase: 'worry about sb./sth./doing sth.', meaning: '担心某人/某事/做某事', example: 'Don\'t worry about me.', exampleTranslation: '别担心我。', difficulty: 1 },
    { phrase: 'be busy doing sth./with sth.', meaning: '忙于做某事/某事', example: 'She is busy with her homework.', exampleTranslation: '她正忙着做作业。', difficulty: 1 },

    // 易混淆搭配对比
    { phrase: 'arrive at + 小地点', meaning: '到达小地点（如车站、学校、机场）', example: 'We arrived at the station at 8 o\'clock.', exampleTranslation: '我们8点到达了车站。', category: '易混淆对比', difficulty: 2, note: 'arrive at + 小地点（火车站、机场、学校等）' },
    { phrase: 'arrive in + 大地点', meaning: '到达大地点（如城市、国家）', example: 'We arrived in Shanghai yesterday.', exampleTranslation: '我们昨天到达了上海。', category: '易混淆对比', difficulty: 2, note: 'arrive in + 大地点（城市、国家）' },
    { phrase: 'reach + 地点', meaning: '到达某地（不带介词）', example: 'We reached the hotel safely.', exampleTranslation: '我们安全到达了酒店。', category: '易混淆对比', difficulty: 2, note: 'reach + 地点（直接接地点，不需要介词）' },
    { phrase: 'get to + 地点', meaning: '到达某地（最常用）', example: 'How do I get to the library?', exampleTranslation: '我如何到达图书馆？', category: '易混淆对比', difficulty: 2, note: 'get to + 地点（最常用的说法）' },

    { phrase: 'spend time/money (in) doing sth.', meaning: '花费时间/金钱做某事', example: 'He spends much time (in) reading.', exampleTranslation: '他在阅读上花费很多时间。', category: '易混淆对比', difficulty: 2, note: 'spend + 时间/钱 + (in) doing sth.' },
    { phrase: 'spend time/money on sth.', meaning: '在某事上花费时间/金钱', example: 'He spends much money on books.', exampleTranslation: '他在书上花费很多钱。', category: '易混淆对比', difficulty: 2, note: 'spend + 时间/钱 + on + sth.' },
    { phrase: 'take sb. some time to do sth.', meaning: '花费某人时间做某事', example: 'It took me two hours to finish the work.', exampleTranslation: '我花了两个小时完成这项工作。', category: '易混淆对比', difficulty: 2, note: 'It takes/took/will take sb. some time to do sth.' },
    { phrase: 'It takes sb. some time to do sth.', meaning: '花费某人时间做某事（固定句型）', example: 'It takes time to learn a language.', exampleTranslation: '学习一门语言需要时间。', category: '易混淆对比', difficulty: 2, note: '固定句型：It takes sb. some time to do sth.' },

    { phrase: 'say to sb.', meaning: '对某人说', example: 'He said to me, "Hello!"', exampleTranslation: '他对我说："你好！"', category: '易混淆对比', difficulty: 1, note: 'say to sb. = 对某人说' },
    { phrase: 'talk to/with sb. about sth.', meaning: '和某人谈论某事', example: 'I talked to him about the plan.', exampleTranslation: '我和他谈论了这个计划。', category: '易混淆对比', difficulty: 1, note: 'talk to/with sb. about sth. = 谈论某事' },
    { phrase: 'tell sb. sth./tell sb. to do sth.', meaning: '告诉某人某事/告诉某人做某事', example: 'She told me the truth.', exampleTranslation: '她告诉了我真相。', category: '易混淆对比', difficulty: 1, note: 'tell + 双宾语 或 tell sb. to do sth.' },
    { phrase: 'speak to sb. in + 语言', meaning: '用某种语言和某人说话', example: 'Can you speak to him in English?', exampleTranslation: '你能用英语和他说话吗？', category: '易混淆对比', difficulty: 1, note: 'speak + 语言 或 speak to sb.' },

    { phrase: 'listen to sb./sth.', meaning: '听某人/某物（主动听）', example: 'Please listen to the teacher.', exampleTranslation: '请听老师讲课。', category: '易混淆对比', difficulty: 1, note: 'listen to = 主动听' },
    { phrase: 'hear sb./sth.', meaning: '听到某人/某物（被动听到）', example: 'I heard a strange sound.', exampleTranslation: '我听到一个奇怪的声音。', category: '易混淆对比', difficulty: 1, note: 'hear = 被动听到，不一定有意去听' },

    { phrase: 'look at sth.', meaning: '看某物（主动看）', example: 'Look at the blackboard.', exampleTranslation: '看黑板。', category: '易混淆对比', difficulty: 1, note: 'look at = 主动看' },
    { phrase: 'see sb./sth.', meaning: '看到某人/某物（被动看到）', example: 'I saw him in the park.', exampleTranslation: '我在公园里看到了他。', category: '易混淆对比', difficulty: 1, note: 'see = 被动看到，不一定有意去看' },
    { phrase: 'watch sth.', meaning: '观看（动态的、持续的动作）', example: 'We watch TV every evening.', exampleTranslation: '我们每天晚上看电视。', category: '易混淆对比', difficulty: 1, note: 'watch = 观看比赛、电视等' },

    { phrase: 'borrow sth. from sb.', meaning: '从某人那里借某物', example: 'Can I borrow a book from you?', exampleTranslation: '我能从你那里借本书吗？', category: '易混淆对比', difficulty: 1, note: 'borrow sth. from sb. = 借进来' },
    { phrase: 'lend sth. to sb.', meaning: '把某物借给某人', example: 'I lent my pen to him.', exampleTranslation: '我把钢笔借给了他。', category: '易混淆对比', difficulty: 1, note: 'lend sth. to sb. = 借出去' },

    { phrase: 'bring sth. (to here)', meaning: '带来某物（朝向说话者）', example: 'Bring your book to school.', exampleTranslation: '把你的书带到学校来。', category: '易混淆对比', difficulty: 1, note: 'bring = 带来（向这）' },
    { phrase: 'take sth. (from here)', meaning: '带走某物（远离说话者）', example: 'Take your umbrella with you.', exampleTranslation: '带上你的雨伞。', category: '易混淆对比', difficulty: 1, note: 'take = 带走（离这）' },
    { phrase: 'fetch sth.', meaning: '去取来某物（往返）', example: 'Please fetch some water.', exampleTranslation: '请去取点水。', category: '易混淆对比', difficulty: 1, note: 'fetch = 去取来（去 + 来）' },
  ];

  try {
    for (const collocation of collocations) {
      await collocationManager.createCollocation(collocation);
    }
    console.log(`✓ 已更新 ${collocations.length} 个固定搭配（含完整形式和易混淆对比）`);
  } catch (error) {
    console.error('更新固定搭配失败:', error);
    process.exit(1);
  }
}

seedCollocations();
