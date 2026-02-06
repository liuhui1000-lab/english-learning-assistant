# Next.js API Routes 迁移到 Express 指南

## 🎯 目标
将 Next.js API Routes（`app/api/*/route.ts`）迁移到 Express 路由，以便在阿里云函数计算中运行。

---

## 📋 迁移清单

| API 路径 | 状态 | 优先级 |
|---------|------|--------|
| `/api/ai/chat` | ✅ 已有代码 | 高 |
| `/api/transformation/grade` | ✅ 已有代码 | 高 |
| `/api/grammar/practice/batch` | ✅ 已有代码 | 高 |
| `/api/admin/database/optimize` | ✅ 已有代码 | 低 |

---

## 🔄 迁移步骤

### 1. 创建 Express API 项目结构

```
api-server/
├── index.js              # Express 主文件
├── s.yaml                # Serverless 配置
├── package.json
├── .env
└── routes/
    ├── ai.js             # AI 相关路由
    ├── transformation.js # 词转练习路由
    ├── grammar.js        # 语法练习路由
    └── admin.js          # 管理员路由
```

---

### 2. 创建主 Express 应用

编辑 `api-server/index.js`：

```javascript
const express = require('express');
const cors = require('cors');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

// 导入路由
const aiRoutes = require('./routes/ai');
const transformationRoutes = require('./routes/transformation');
const grammarRoutes = require('./routes/grammar');
const adminRoutes = require('./routes/admin');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

// 将 db 挂载到 app 上，供路由使用
app.set('db', db);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册路由
app.use('/api/ai', aiRoutes);
app.use('/api/transformation', transformationRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
```

---

### 3. 迁移 AI Chat API

创建 `api-server/routes/ai.js`：

```javascript
const express = require('express');
const { cozeChat } = require('../../src/utils/aiChat'); // 复用现有代码
const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await cozeChat({
      message,
      conversationId,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
```

---

### 4. 迁移词转练习批改 API

创建 `api-server/routes/transformation.js`：

```javascript
const express = require('express');
const router = express.Router();

router.post('/grade', async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;

    const db = req.app.get('db');

    // 获取题目
    const question = await db.execute(
      'SELECT * FROM transformation_questions WHERE id = $1',
      [questionId]
    );

    if (!question.rows[0]) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // 调用 AI 批改
    const result = await cozeChat({
      message: `请批改这道词转题：

题目：${question.rows[0].sentence}
提示词：${question.rows[0].hint}
用户答案：${userAnswer}

请判断答案是否正确，并给出详细解释。`,
    });

    res.json({
      success: true,
      data: {
        isCorrect: result.isCorrect,
        explanation: result.explanation,
        correctAnswer: question.rows[0].answer,
      },
    });
  } catch (error) {
    console.error('Grade error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

### 5. 迁移语法练习批量批改 API

创建 `api-server/routes/grammar.js`：

```javascript
const express = require('express');
const router = express.Router();

router.post('/practice/batch', async (req, res) => {
  try {
    const { questions, answers } = req.body;

    const db = req.app.get('db');

    // 批量批改
    const results = await Promise.all(
      questions.map(async (question, index) => {
        const userAnswer = answers[index];

        // 调用 AI 批改
        const result = await cozeChat({
          message: `请批改这道语法题：

题目：${question.question}
选项：${JSON.stringify(question.options)}
用户答案：${userAnswer}
正确答案：${question.correctAnswer}

请给出详细解释。`,
        });

        return {
          questionId: question.id,
          isCorrect: userAnswer === question.correctAnswer,
          userAnswer,
          correctAnswer: question.correctAnswer,
          explanation: result.explanation,
        };
      })
    );

    // 计算得分
    const correctCount = results.filter(r => r.isCorrect).length;
    const score = (correctCount / results.length) * 100;

    res.json({
      success: true,
      data: {
        results,
        score,
        total: results.length,
        correct: correctCount,
      },
    });
  } catch (error) {
    console.error('Batch grade error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

### 6. 迁移数据库优化 API

创建 `api-server/routes/admin.js`：

```javascript
const express = require('express');
const router = express.Router();

router.get('/database/optimize', async (req, res) => {
  try {
    const db = req.app.get('db');

    // 获取数据库大小
    const sizeResult = await db.execute(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS total_size
    `);

    res.json({
      success: true,
      data: {
        totalSize: sizeResult.rows[0].total_size,
      },
    });
  } catch (error) {
    console.error('Get database size error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/database/optimize', async (req, res) => {
  try {
    const { action } = req.body;

    const db = req.app.get('db');

    let result;

    switch (action) {
      case 'archive':
        await db.execute('SELECT archive_old_practice_records()');
        result = { message: '旧记录已归档' };
        break;

      case 'limit-mistakes':
        await db.execute('SELECT limit_all_user_mistakes()');
        result = { message: '错题记录已限制' };
        break;

      default:
        return res.status(400).json({ error: '未知操作' });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Optimize error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

### 7. 创建 package.json

编辑 `api-server/package.json`：

```json
{
  "name": "english-learning-api",
  "version": "1.0.0",
  "description": "English Learning API Server",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.28.6",
    "coze-coding-dev-sdk": "^1.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

### 8. 安装依赖

```bash
cd api-server
npm install
```

---

### 9. 本地测试

```bash
# 启动开发服务器
npm run dev

# 测试健康检查
curl http://localhost:3000/health

# 测试 API
curl -X POST http://localhost:3000/api/transformation/grade \
  -H "Content-Type: application/json" \
  -d '{"questionId": 1, "userAnswer": "goes"}'
```

---

### 10. 部署到阿里云函数计算

```bash
# 构建
npm install --production

# 部署
cd ..
s deploy
```

---

## 📝 注意事项

### 1. 环境变量

在阿里云函数计算中配置环境变量：
- `DATABASE_URL`
- `DOUBAO_API_KEY`

### 2. 数据库连接池

函数计算是无状态的，每次请求会创建新的连接。为了优化性能，可以配置连接池：

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时
});
```

### 3. 错误处理

确保所有 API 都有适当的错误处理：

```javascript
try {
  // 业务逻辑
} catch (error) {
  console.error('API error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
  });
}
```

### 4. 日志记录

阿里云函数计算的日志会自动收集到日志服务，可以通过以下方式查看：

```javascript
console.log('Request:', req.body); // 普通日志
console.error('Error:', error); // 错误日志
```

---

## ✅ 验证清单

- [ ] 创建 Express 项目结构
- [ ] 迁移所有 API 路由
- [ ] 本地测试所有 API
- [ ] 配置环境变量
- [ ] 部署到阿里云函数计算
- [ ] 测试生产环境 API
- [ ] 验证数据库连接
- [ ] 验证 AI 调用

---

## 🆘 常见问题

### Q1: 函数计算连接数据库超时？

**A:** 检查数据库白名单，确保包含阿里云函数计算的 IP 段。

### Q2: AI 调用失败？

**A:** 检查：
1. `DOUBAO_API_KEY` 是否正确
2. API 调用次数是否超限
3. 网络是否通畅

### Q3: 跨域问题？

**A:** 确保使用了 `cors` 中间件：

```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true,
}));
```

---

迁移完成！🎉
