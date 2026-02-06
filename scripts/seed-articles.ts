import { readingManager } from '../src/storage/database/readingManager';

async function seedArticles() {
  console.log('开始导入阅读文章...');

  const articles = [
    {
      title: 'A Wonderful Trip to Shanghai',
      content: `Shanghai is one of the largest cities in China. Last summer, I visited Shanghai with my parents. It was an unforgettable experience.

We arrived in Shanghai on a sunny morning. The weather was perfect—neither too hot nor too cold. We were excited to start our journey.

Our first stop was the Bund. It's a famous waterfront area with beautiful buildings on both sides. Some buildings are old and traditional, while others are modern and tall. We took many photos there. The view was amazing, especially when the lights came on in the evening.

The next day, we went to Yu Garden. It's a traditional Chinese garden with a history of over 400 years. We walked through the zigzag bridges and admired the beautiful pavilions. My mother bought some traditional snacks there, and they were delicious.

On the third day, we visited Shanghai Disneyland. It was my favorite part of the trip! I went on many exciting rides, like the Seven Dwarfs Mine Train and Peter Pan's Flight. We also watched the fireworks show at night. It was spectacular!

During the trip, we also tried some famous Shanghai food, such as xiaolongbao and hairy crabs. They were very tasty.

Time flew quickly. Three days passed before we knew it. We had to say goodbye to Shanghai. I felt sad to leave, but I was happy because I had such a wonderful time.

This trip taught me a lot. I learned about Shanghai's history and culture. I also learned that traveling can help us understand the world better. I hope to visit Shanghai again in the future and explore more of this beautiful city.`,
      level: '中等',
      wordCount: 248,
      readTime: 5,
      category: '城市介绍',
      questions: [
        { question: 'When did the writer visit Shanghai?', type: 'choice', options: ['Last spring', 'Last summer', 'Last autumn', 'Last winter'], answer: 'Last summer' },
        { question: 'What is the Bund?', type: 'choice', options: ['A traditional garden', 'A theme park', 'A waterfront area', 'A shopping mall'], answer: 'A waterfront area' },
        { question: 'How long is the history of Yu Garden?', type: 'choice', options: ['Over 300 years', 'Over 400 years', 'Over 500 years', 'Over 600 years'], answer: 'Over 400 years' },
      ],
    },
    {
      title: 'My Best Friend',
      content: `Everyone needs friends. I am lucky to have a best friend named Li Ming. We have been friends for five years.

Li Ming is a 14-year-old boy. He is tall and strong, with short black hair and a pair of bright eyes. He always wears a smile on his face, which makes him look friendly and kind-hearted.

We are in the same class at school. Li Ming is an excellent student. He is good at all subjects, especially English and math. When I have problems with my homework, he always helps me patiently. He explains things clearly, and I can understand him easily.

Li Ming is also very active. He enjoys playing basketball and often invites me to play with him after school. Sometimes we lose, but he never gets angry. Instead, he encourages us to practice more and do better next time.

What I admire most about Li Ming is his honesty. One day, I saw him return a wallet to our teacher. He had found it in the classroom. He didn't keep the money inside, even though no one was watching. His honesty touched me deeply.

Besides, Li Ming is very helpful to others. Last week, when our classmate Tom was sick and couldn't come to school, Li Ming visited him after school and helped him with his lessons. Tom was very grateful.

I feel lucky to have such a good friend. We share happiness and sadness together. I hope our friendship will last forever. I believe that true friendship is one of the most precious things in life.

Friends play an important role in our lives. A good friend can help us become better people. Li Ming is such a friend. I will cherish our friendship and try to be a good friend to him too.`,
      level: '简单',
      wordCount: 276,
      readTime: 4,
      category: '人物故事',
      questions: [
        { question: 'How long have the writer and Li Ming been friends?', type: 'choice', options: ['Three years', 'Four years', 'Five years', 'Six years'], answer: 'Five years' },
        { question: 'What subjects is Li Ming good at?', type: 'choice', options: ['English and Chinese', 'Math and science', 'English and math', 'History and geography'], answer: 'English and math' },
        { question: 'Why did the writer admire Li Ming?', type: 'choice', options: ['Because he is tall', 'Because he is rich', 'Because he is honest', 'Because he is famous'], answer: 'Because he is honest' },
      ],
    },
  ];

  try {
    for (const article of articles) {
      await readingManager.createArticle(article);
    }
    console.log(`✓ 已导入 ${articles.length} 篇阅读文章`);
  } catch (error) {
    console.error('导入阅读文章失败:', error);
    process.exit(1);
  }
}

seedArticles();
