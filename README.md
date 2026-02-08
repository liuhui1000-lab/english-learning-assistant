# 初中英语学习助手

专为上海浦东初二学生设计的英语学习工具，涵盖单词背诵、语法错题整理与阅读理解训练。

## 功能特点

### 0. 智能识别（OCR）
- **三引擎支持**：Tesseract.js（免费） + PaddleOCR API（推荐） + 百度 OCR（国内首选）
- **图片文字识别**：自动从扫描件、截图提取文字
- **中英文混合**：支持中英文混合识别
- **手写文字**：百度 OCR 和 PaddleOCR 支持手写文字识别
- **高精度识别**：百度 OCR 支持高精度识别
- **多场景应用**：模拟卷、错题、单词表均可使用 OCR 识别
- **识别效果**：百度 OCR 和 PaddleOCR 识别准确率 > 95%

### 1. 单词背诵
- 卡片式学习界面
- 艾宾浩斯记忆曲线智能复习
- 支持发音（待集成语音合成）
- 学习进度追踪

### 2. 语法学习
- **错题库系统**：录入错题，AI 自动分析语法知识点
- **智能归类**：按语法点自动分类整理
- **薄弱点分析**：识别需要加强的知识点
- **固定搭配专项**：针对 look forward to、be good at 等高频搭配训练

### 3. 阅读理解
- 分级阅读材料（简单、中等、困难）
- 长难句智能分析（待完善）
- 阅读理解练习题
- 学习进度统计

## 技术栈

- **前端**：Next.js 16 + TypeScript + Tailwind CSS 4
- **UI组件**：shadcn/ui（基于 Radix UI）
- **数据库**：PostgreSQL（Drizzle ORM）
- **AI服务**：豆包大语言模型（错题分析）
- **部署平台**：Netlify

## 本地开发

### 环境要求
- Node.js 20+
- pnpm 包管理器

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm run dev
```

访问 http://localhost:5000

### 数据库操作

#### 同步数据库模型
```bash
coze-coding-ai db generate-models
```

#### 更新数据库结构
```bash
coze-coding-ai db upgrade
```

## 部署到 Netlify

### 方式一：通过 Git 集成

1. 将代码推送到 GitHub/GitLab
2. 在 Netlify 中创建新站点
3. 连接你的代码仓库
4. 配置构建设置（已在 `netlify.toml` 中预设）

### 方式二：手动部署

1. 构建项目
```bash
pnpm run build
```

2. 通过 Netlify CLI 部署
```bash
netlify deploy --prod
```

### 环境变量配置

在 Netlify 中设置以下环境变量：

- `PGDATABASE_URL`: PostgreSQL 数据库连接字符串
- `NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN`: 百度 OCR Access Token（推荐）
- `NEXT_PUBLIC_PADDLE_OCR_API_URL`: PaddleOCR API 地址（可选）
- `NEXT_PUBLIC_PADDLE_OCR_TOKEN`: PaddleOCR API Token（可选）
- 其他必要的环境变量（已通过 SDK 自动加载）

#### OCR 配置（可选）

项目支持三个 OCR 引擎，可以根据需求选择配置：

**推荐：百度 OCR（国内首选）**

```env
NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN=your_baidu_access_token_here
```

获取百度 OCR Access Token：
1. 访问百度智能云：https://cloud.baidu.com/product/ocr
2. 注册/登录百度账号
3. 开通 OCR 服务（有免费额度：500次/天）
4. 创建应用，获取 Access Token

详细配置说明：[百度 OCR 快速开始](./BAIDU_OCR_QUICKSTART.md)

**可选：PaddleOCR API**

```env
NEXT_PUBLIC_PADDLE_OCR_API_URL=https://your-paddleocr-api.com/api/ocr
NEXT_PUBLIC_PADDLE_OCR_TOKEN=your_paddleocr_token_here
```

获取 PaddleOCR API Token：
1. 访问 PaddleOCR 官方网站
2. 注册/登录账号
3. 申请 API Token（100万次/月免费）

详细配置说明：[PaddleOCR 快速开始](./PADDLE_OCR_QUICKSTART.md)

**可选：Tesseract.js**

无需配置，开箱即用，完全免费。

## API 接口

### 单词相关

- `GET /api/vocabulary/words` - 获取单词列表
- `POST /api/vocabulary/words` - 创建新单词
- `POST /api/vocabulary/progress` - 更新学习进度

### 语法相关

- `POST /api/grammar/analyze` - AI 分析错题
- `GET /api/grammar/mistakes` - 获取错题列表

### 固定搭配

- `GET /api/collocations` - 获取固定搭配列表
- `POST /api/collocations` - 创建固定搭配

### 阅读理解

- `GET /api/reading/articles` - 获取文章列表
- `POST /api/reading/articles` - 创建文章

## 数据库表结构

### words - 单词表
- id, word, phonetic, meaning, example, exampleTranslation, difficulty

### user_word_progress - 用户单词学习进度表
- userId, wordId, masteryLevel, reviewCount, lastReviewAt, nextReviewAt

### grammar_points - 语法知识点表
- id, name, description, category, level

### grammar_mistakes - 语法错题表
- userId, grammarPointId, question, wrongAnswer, correctAnswer, explanation, analysis

### collocations - 固定搭配表
- id, phrase, meaning, example, exampleTranslation, category, difficulty

### articles - 阅读文章表
- id, title, content, level, wordCount, readTime, category, questions

### user_reading_progress - 用户阅读进度表
- userId, articleId, score, completed, timeSpent

## 使用说明

### 学生端
1. 访问应用首页
2. 选择学习模块（单词/语法/阅读）
3. 按照提示完成学习任务

### 家长端
1. 查看学习数据统计（首页显示）
2. 了解孩子的学习进度和薄弱环节
3. 根据报告提供针对性的辅导

## 待完善功能

- [ ] 语音合成（单词发音）
- [ ] 图片上传功能（错题录入）
- [ ] 长难句智能分析（阅读理解）
- [ ] 学习提醒功能
- [ ] 家长端独立页面
- [ ] 学习报告导出（PDF）
- [ ] 更多词汇和阅读材料

## 注意事项

1. 本应用需要配置 PostgreSQL 数据库
2. AI 分析功能需要网络连接
3. 建议定期备份数据库数据
4. 学生使用时建议有家长陪同

## 技术支持

如有问题，请查看：
- Next.js 文档：https://nextjs.org/docs
- Drizzle ORM 文档：https://orm.drizzle.team
- shadcn/ui 文档：https://ui.shadcn.com

## 许可证

MIT License
