import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

const transformationData = [
  {
    baseWord: "act",
    baseMeaning: "行动；表演",
    transformations: [
      { word: "act", meaning: "行动；表演", type: "原形（动词）", sentence: "Please _____ quickly to save the situation." },
      { word: "actor", meaning: "演员（男）", type: "名词（人）", sentence: "My dream is to become a famous _____ in Hollywood." },
      { word: "actress", meaning: "演员（女）", type: "名词（人）", sentence: "She is a talented _____ who has won many awards." },
      { word: "action", meaning: "行动；活动", type: "名词（物）", sentence: "We need to take immediate _____ to solve this problem." },
      { word: "active", meaning: "活跃的；积极的", type: "形容词", sentence: "He is very _____ in sports and takes part in many competitions." },
      { word: "activity", meaning: "活动", type: "名词", sentence: "Our school organizes various _____ for students every week." },
    ],
  },
  {
    baseWord: "complete",
    baseMeaning: "完成；完整的",
    transformations: [
      { word: "complete", meaning: "完成；完整的", type: "原形（动词/形容词）", sentence: "The workers will _____ the project next month." },
      { word: "completion", meaning: "完成", type: "名词", sentence: "The _____ of the new building is scheduled for next year." },
      { word: "completely", meaning: "完全地；彻底地", type: "副词", sentence: "I _____ forgot about the meeting yesterday." },
      { word: "incomplete", meaning: "不完全的", type: "形容词", sentence: "The report was _____ and needed more information." },
    ],
  },
  {
    baseWord: "succeed",
    baseMeaning: "成功；继承",
    transformations: [
      { word: "succeed", meaning: "成功；继承", type: "原形（动词）", sentence: "If you work hard, you will _____ in your career." },
      { word: "success", meaning: "成功", type: "名词", sentence: "Hard work and determination are the keys to _____." },
      { word: "successful", meaning: "成功的", type: "形容词", sentence: "The _____ launch of the new product made the company very happy." },
      { word: "successfully", meaning: "成功地", type: "副词", sentence: "She _____ completed the difficult task on time." },
    ],
  },
  {
    baseWord: "create",
    baseMeaning: "创造；创作",
    transformations: [
      { word: "create", meaning: "创造；创作", type: "原形（动词）", sentence: "Artists _____ beautiful works that inspire people." },
      { word: "creator", meaning: "创造者；创作者", type: "名词（人）", sentence: "Steve Jobs was the _____ of Apple Inc." },
      { word: "creation", meaning: "创造；创作", type: "名词（物）", sentence: "The _____ of this software took many years of hard work." },
      { word: "creative", meaning: "有创造力的", type: "形容词", sentence: "She has a _____ mind and always comes up with new ideas." },
      { word: "creatively", meaning: "有创造力地", type: "副词", sentence: "Students should learn to think _____ to solve problems." },
    ],
  },
  {
    baseWord: "decide",
    baseMeaning: "决定",
    transformations: [
      { word: "decide", meaning: "决定", type: "原形（动词）", sentence: "We need to _____ where to go for our holiday." },
      { word: "decision", meaning: "决定", type: "名词", sentence: "Making an important _____ requires careful consideration." },
      { word: "decisive", meaning: "决定性的；果断的", type: "形容词", sentence: "The _____ moment in the game came in the last minute." },
      { word: "decisively", meaning: "果断地", type: "副词", sentence: "The team _____ responded to the emergency situation." },
    ],
  },
  {
    baseWord: "develop",
    baseMeaning: "发展；开发",
    transformations: [
      { word: "develop", meaning: "发展；开发", type: "原形（动词）", sentence: "The city plans to _____ a new business district next year." },
      { word: "development", meaning: "发展；开发", type: "名词", sentence: "The rapid _____ of technology has changed our lives." },
      { word: "developer", meaning: "开发者", type: "名词（人）", sentence: "He is a software _____ who creates mobile applications." },
      { word: "developing", meaning: "发展中的", type: "形容词", sentence: "China is a _____ country with great potential." },
      { word: "developed", meaning: "发达的", type: "形容词", sentence: "The United States is a highly _____ country." },
    ],
  },
  {
    baseWord: "educate",
    baseMeaning: "教育；培养",
    transformations: [
      { word: "educate", meaning: "教育；培养", type: "原形（动词）", sentence: "Parents should _____ their children about the importance of honesty." },
      { word: "education", meaning: "教育", type: "名词", sentence: "Receiving a good _____ is important for everyone's future." },
      { word: "educator", meaning: "教育家；教师", type: "名词（人）", sentence: "She is a respected _____ who has taught for 30 years." },
      { word: "educational", meaning: "教育的", type: "形容词", sentence: "The museum offers many _____ programs for school children." },
    ],
  },
  {
    baseWord: "enjoy",
    baseMeaning: "享受；喜爱",
    transformations: [
      { word: "enjoy", meaning: "享受；喜爱", type: "原形（动词）", sentence: "I _____ reading books in my free time." },
      { word: "enjoyment", meaning: "享受；乐趣", type: "名词", sentence: "Music brings great _____ to people of all ages." },
      { word: "enjoyable", meaning: "令人愉快的", type: "形容词", sentence: "The trip was very _____ and we had a great time." },
    ],
  },
  {
    baseWord: "happy",
    baseMeaning: "快乐的",
    transformations: [
      { word: "happy", meaning: "快乐的", type: "原形（形容词）", sentence: "She felt very _____ when she heard the good news." },
      { word: "happiness", meaning: "幸福；快乐", type: "名词", sentence: "Money can't buy _____, but it can make life easier." },
      { word: "happily", meaning: "快乐地", type: "副词", sentence: "The children played _____ in the park all afternoon." },
      { word: "unhappy", meaning: "不快乐的", type: "形容词", sentence: "He was _____ because he failed the exam." },
    ],
  },
  {
    baseWord: "help",
    baseMeaning: "帮助",
    transformations: [
      { word: "help", meaning: "帮助", type: "原形（动词/名词）", sentence: "Can you _____ me with my homework?" },
      { word: "helper", meaning: "助手；帮手", type: "名词（人）", sentence: "She is always a _____ to her friends in need." },
      { word: "helpful", meaning: "有帮助的", type: "形容词", sentence: "His advice was very _____ and solved my problem." },
      { word: "helpfully", meaning: "有帮助地", type: "副词", sentence: "The teacher _____ explained the difficult concept." },
      { word: "helpless", meaning: "无助的", type: "形容词", sentence: "The injured bird looked _____ on the ground." },
    ],
  },
  {
    baseWord: "invent",
    baseMeaning: "发明",
    transformations: [
      { word: "invent", meaning: "发明", type: "原形（动词）", sentence: "Thomas Edison _____ the light bulb." },
      { word: "invention", meaning: "发明", type: "名词（物）", sentence: "The smartphone is one of the greatest _____ of modern times." },
      { word: "inventor", meaning: "发明家", type: "名词（人）", sentence: "Alexander Graham Bell was the _____ of the telephone." },
      { word: "inventive", meaning: "有发明才能的", type: "形容词", sentence: "The _____ child built a robot from old toys." },
    ],
  },
  {
    baseWord: "invite",
    baseMeaning: "邀请",
    transformations: [
      { word: "invite", meaning: "邀请", type: "原形（动词）", sentence: "They _____ all their friends to the birthday party." },
      { word: "invitation", meaning: "邀请", type: "名词", sentence: "She received an _____ to attend the conference." },
      { word: "inviting", meaning: "诱人的；吸引人的", type: "形容词", sentence: "The warm sunshine made the beach very _____." },
    ],
  },
  {
    baseWord: "please",
    baseMeaning: "使高兴；请",
    transformations: [
      { word: "please", meaning: "使高兴；请", type: "原形（动词）", sentence: "The movie _____ everyone in the audience." },
      { word: "pleasure", meaning: "愉快；快乐", type: "名词", sentence: "It's a _____ to meet you." },
      { word: "pleasant", meaning: "令人愉快的", type: "形容词", sentence: "We had a _____ conversation over dinner." },
      { word: "pleasantly", meaning: "愉快地", type: "副词", sentence: "She _____ surprised me with a gift." },
    ],
  },
  {
    baseWord: "protect",
    baseMeaning: "保护",
    transformations: [
      { word: "protect", meaning: "保护", type: "原形（动词）", sentence: "We must _____ the environment from pollution." },
      { word: "protection", meaning: "保护", type: "名词", sentence: "The _____ of wildlife is very important." },
      { word: "protector", meaning: "保护者", type: "名词（人）", sentence: "The superhero is the _____ of the city." },
      { word: "protective", meaning: "保护的", type: "形容词", sentence: "She is very _____ of her younger brother." },
    ],
  },
  {
    baseWord: "relax",
    baseMeaning: "放松",
    transformations: [
      { word: "relax", meaning: "放松", type: "原形（动词）", sentence: "I usually _____ by listening to music after work." },
      { word: "relaxation", meaning: "放松", type: "名词", sentence: "Yoga is a good form of _____ and exercise." },
      { word: "relaxed", meaning: "放松的；轻松的", type: "形容词", sentence: "The _____ atmosphere in the cafe made me feel comfortable." },
      { word: "relaxing", meaning: "令人放松的", type: "形容词", sentence: "A hot bath is very _____ after a long day." },
    ],
  },
  {
    baseWord: "solve",
    baseMeaning: "解决",
    transformations: [
      { word: "solve", meaning: "解决", type: "原形（动词）", sentence: "We need to find a way to _____ this problem." },
      { word: "solution", meaning: "解决；解答", type: "名词", sentence: "There is no simple _____ to this complex issue." },
      { word: "solver", meaning: "解决者", type: "名词（人）", sentence: "He is a natural problem _____." },
      { word: "solvable", meaning: "可解决的", type: "形容词", sentence: "This puzzle is _____ with enough time and effort." },
    ],
  },
  {
    baseWord: "use",
    baseMeaning: "使用；用途",
    transformations: [
      { word: "use", meaning: "使用；用途", type: "原形（动词/名词）", sentence: "Can I _____ your phone for a moment?" },
      { word: "user", meaning: "用户", type: "名词（人）", sentence: "The app has millions of _____ around the world." },
      { word: "useful", meaning: "有用的", type: "形容词", sentence: "This book is very _____ for learning English." },
      { word: "usefully", meaning: "有用地", type: "副词", sentence: "She _____ organized all the files." },
      { word: "useless", meaning: "无用的", type: "形容词", sentence: "Without batteries, the toy becomes _____." },
    ],
  },
  {
    baseWord: "visit",
    baseMeaning: "参观；访问",
    transformations: [
      { word: "visit", meaning: "参观；访问", type: "原形（动词）", sentence: "We plan to _____ the museum next weekend." },
      { word: "visitor", meaning: "参观者；访客", type: "名词（人）", sentence: "The _____ were impressed by the beautiful gardens." },
      { word: "visiting", meaning: "访问的", type: "形容词", sentence: "Our _____ professor from Japan will give a lecture." },
    ],
  },
  {
    baseWord: "wonder",
    baseMeaning: "想知道；奇迹",
    transformations: [
      { word: "wonder", meaning: "想知道；奇迹", type: "原形（动词/名词）", sentence: "I _____ what time the meeting starts." },
      { word: "wonderful", meaning: "精彩的；奇妙的", type: "形容词", sentence: "The performance was _____ and received a standing ovation." },
      { word: "wonderfully", meaning: "精彩地", type: "副词", sentence: "She played the piano _____ at the concert." },
    ],
  },
  {
    baseWord: "work",
    baseMeaning: "工作；著作",
    transformations: [
      { word: "work", meaning: "工作；著作", type: "原形（动词/名词）", sentence: "She _____ as a teacher in a primary school." },
      { word: "worker", meaning: "工人", type: "名词（人）", sentence: "The factory _____ went on strike for better wages." },
      { word: "working", meaning: "工作的", type: "形容词", sentence: "The _____ hours are from 9 am to 5 pm." },
      { word: "hardworking", meaning: "勤奋的", type: "形容词", sentence: "He is a _____ student who always does his homework." },
    ],
  },
];

async function seedWordTransformations() {
  try {
    console.log("开始导入词转数据（句子填空形式）...");

    const db = await getDb();

    // 删除现有数据
    await db.execute(sql`DELETE FROM word_transformations`);
    console.log("✓ 已清空现有数据");

    // 插入新数据
    let insertedCount = 0;
    for (const item of transformationData) {
      await db.execute(
        sql`INSERT INTO word_transformations (base_word, base_meaning, transformations, difficulty)
           VALUES (${item.baseWord}, ${item.baseMeaning}, ${JSON.stringify(item.transformations)}, 2)`
      );
      insertedCount++;
    }

    console.log(`✓ 成功插入 ${insertedCount} 个词转组`);
    console.log("\n导入完成！");
    console.log("注意：现在每个变形词都包含句子填空练习");
  } catch (error) {
    console.error("导入失败:", error);
    process.exit(1);
  }
}

seedWordTransformations();
