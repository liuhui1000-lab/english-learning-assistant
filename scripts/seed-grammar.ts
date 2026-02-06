import { grammarManager } from '../src/storage/database/grammarManager';

async function seedGrammar() {
  console.log('开始导入语法知识点...');

  const points = [
    { name: '一般现在时', description: '表示经常性、习惯性的动作或状态。常与 always, often, usually, sometimes 等频度副词连用。', category: '时态', level: 1 },
    { name: '现在进行时', description: '表示说话时正在进行的动作。结构：be (am/is/are) + 动词-ing', category: '时态', level: 1 },
    { name: '一般过去时', description: '表示过去某个时间发生的动作或存在的状态。结构：主语 + 动词过去式', category: '时态', level: 1 },
    { name: '过去进行时', description: '表示过去某个时间正在进行的动作。结构：was/were + 动词-ing', category: '时态', level: 2 },
    { name: '一般将来时', description: '表示将来要发生的动作或存在的状态。常用 will + 动词原形 或 be going to + 动词原形。', category: '时态', level: 1 },
    { name: '现在完成时', description: '表示过去发生但对现在有影响的动作，或从过去持续到现在的状态。结构：have/has + 过去分词。常与 already, yet, ever, never, just, before 等连用。', category: '时态', level: 2 },
    { name: '过去完成时', description: '表示"过去的过去"。结构：had + 过去分词。常用于宾语从句、时间状语从句。', category: '时态', level: 3 },
    { name: '被动语态', description: '强调动作的承受者。结构：be + 过去分词。不同时态的被动语态：am/is/are done, was/were done, will be done, have/has been done。', category: '语态', level: 2 },
    { name: '情态动词', description: 'can, could, may, might, must, should, ought to, need, dare 等。后接动词原形。表示能力、许可、义务、建议等。', category: '情态动词', level: 1 },
    { name: '不定式', description: 'to + 动词原形。在句中可作主语、宾语、表语、定语、状语等。如：To learn English is important.', category: '非谓语动词', level: 2 },
    { name: '动名词', description: '动词-ing 形式，具有名词性质。在句中可作主语、宾语、表语等。如：Swimming is fun.', category: '非谓语动词', level: 2 },
    { name: '分词', description: '现在分词（-ing）和过去分词（-ed）。在句中可作定语、表语、状语、补语等。如：The interesting book interests me.', category: '非谓语动词', level: 3 },
    { name: '定语从句', description: '修饰名词或代词的从句。由关系代词（who, whom, whose, which, that）或关系副词（when, where, why）引导。', category: '从句', level: 3 },
    { name: '状语从句', description: '修饰动词、形容词、副词的从句。包括时间、地点、原因、条件、结果、目的、让步、方式、比较状语从句。', category: '从句', level: 3 },
    { name: '宾语从句', description: '在复合句中作宾语的从句。由 that, if/whether, wh- 疑问词引导。注意时态呼应和语序问题。', category: '从句', level: 2 },
    { name: '主语从句', description: '在复合句中作主语的从句。常用 it 作形式主语，真正的主语从句后置。如：It is important that you study hard.', category: '从句', level: 3 },
    { name: '名词性从句', description: '包括主语从句、宾语从句、表语从句、同位语从句。在句中起名词作用。', category: '从句', level: 3 },
    { name: '直接引语和间接引语', description: '直接引用原话用直接引语；转述别人的话用间接引语。注意人称、时态、时间地点状语的变化。', category: '句法', level: 2 },
    { name: '反意疑问句', description: '表示说话人的看法或询问对方是否同意。结构：陈述部分 + 简短问句。注意一些特殊情况，如含有 must 的反意疑问句。', category: '句法', level: 2 },
    { name: '祈使句', description: '表示命令、请求、建议等。以动词原形开头，主语通常省略。否定形式用 Don\'t。如：Don\'t be late.', category: '句法', level: 1 },
    { name: '感叹句', description: '表达强烈情感。结构：What + (a/an) + 形容词 + 名词 + 主语 + 谓语！或 How + 形容词/副词 + 主语 + 谓语！', category: '句法', level: 1 },
    { name: '主谓一致', description: '谓语动词在人称和数上必须与主语保持一致。注意集合名词、不定代词、就近原则等特殊情况。', category: '基础语法', level: 2 },
    { name: '冠词用法', description: '不定冠词 a/an 表"一个"，定冠词 the 表"特指"。注意一些固定搭配和特殊用法。', category: '基础语法', level: 1 },
    { name: '代词用法', description: '人称代词、物主代词、反身代词、指示代词、不定代词等。注意性、数、格的变化。', category: '基础语法', level: 1 },
    { name: '介词用法', description: '表示时间、地点、方向、方式等。常见介词：in, on, at, to, from, with, by, for, about 等。注意固定搭配。', category: '基础语法', level: 1 },
    { name: '连词用法', description: '连接词、短语或句子。并列连词：and, but, or, so；从属连词：because, if, when, while 等。', category: '基础语法', level: 1 },
  ];

  try {
    for (const point of points) {
      await grammarManager.createGrammarPoint(point.name, point.description, point.category, point.level);
    }
    console.log(`✓ 已导入 ${points.length} 个语法知识点`);
  } catch (error) {
    console.error('导入语法知识点失败:', error);
    process.exit(1);
  }
}

seedGrammar();
