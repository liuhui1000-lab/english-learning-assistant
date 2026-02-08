# 英语学习助手 - 项目快速开始

## 项目概述

这是一个基于 Next.js 的全栈英语学习助手，专为上海初二学生设计。包含单词、语法、阅读三大核心模块，支持 AI 智能错题分析。

**核心特性**：
- ✅ 多用户角色系统（admin/user）
- ✅ 题库版本管理系统
- ✅ API 配额监控
- ✅ 多 AI 服务配置
- ✅ 模拟卷智能上传
- ✅ 错题自动分类
- ✅ 词族学习系统（Word Family）
- ✅ 向下兼容学习内容
- ✅ 艾宾浩斯记忆曲线

## 快速开始

### 1. 环境准备

确保你已经安装了以下工具：
- Node.js 18+
- pnpm
- git

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
# 数据库
DATABASE_URL=your_neon_database_url

# AI 服务（至少配置一个）
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
KIMI_API_KEY=your_kimi_api_key

# 认证
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:5000
```

### 4. 运行开发服务器

```bash
coze dev
```

或者：

```bash
pnpm dev
```

访问 `http://localhost:5000` 查看应用。

## 词族系统快速开始

词族学习系统是本项目的核心功能之一，支持向下兼容和艾宾浩斯记忆曲线。

详细文档请查看：[词族系统快速开始](./word-family-quick-start.md)

### 快速测试（3步完成）

#### 第1步：导入单词数据

```bash
curl -X POST http://localhost:5000/api/admin/words/import \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "8年级",
    "words": [
      {
        "word": "happy",
        "translation": "快乐的",
        "phonetic": "/ˈhæpi/",
        "example": "I am happy today."
      }
    ]
  }'
```

#### 第2步：初始化词族系统

```bash
curl -X POST http://localhost:5000/api/admin/word-families/initialize \
  -H "Content-Type: application/json"
```

#### 第3步：生成词族

```bash
curl -X POST http://localhost:5000/api/admin/word-families/generate \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "autoLinkWords": true,
      "autoCompleteData": true
    }
  }'
```

## 向下兼容测试

### 运行测试脚本

```bash
npx ts-node src/storage/database/test-downward-compatibility.ts
```

### 通过 API 测试

```bash
# 测试向下兼容逻辑（需要管理员权限）
curl "http://localhost:5000/api/learning/test-compatibility"
```

### 测试结果

**6年级学生**：只能访问6年级的单词
**7年级学生**：可以访问6年级、7年级的单词（新学+复习）
**8年级学生**：可以访问6年级、7年级、8年级的单词（新学+复习）
**9年级学生**：可以访问6年级、7年级、8年级、9年级的单词（新学+复习）

## 核心功能模块

### 1. 用户系统
- 注册登录
- 多角色权限（admin/user）
- 年级选择（6/7/8/9年级）

### 2. 词族学习系统
- 单词按年级管理
- 词转贯穿初中
- 向下兼容学习
- 艾宾浩斯记忆曲线

### 3. 语法练习
- 语法题库管理
- 智能错题分析
- AI 生成解析

### 4. 阅读理解
- 阅读材料上传
- 难度级别划分
- 智能推荐

### 5. 错题管理
- 错题自动分类
- 智能归档
- 复习提醒

## API 快速参考

### 学习 API

| API | 方法 | 说明 |
|-----|------|------|
| `/api/learning/content` | GET | 获取学习内容（向下兼容） |
| `/api/learning/stats` | GET | 获取学习统计 |
| `/api/learning/plan` | GET | 生成学习计划 |
| `/api/learning/test-compatibility` | GET | 测试向下兼容（管理员） |

### 管理员 API

| API | 方法 | 说明 |
|-----|------|------|
| `/api/admin/words/import` | POST | 导入单词（按年级） |
| `/api/admin/word-families/initialize` | POST | 初始化词转表 |
| `/api/admin/word-families/generate` | POST | 生成词族 |
| `/api/admin/word-families` | GET | 查询词族列表 |
| `/api/admin/word-families/[id]` | GET | 查询词族详情 |

## 相关文档

- [词族系统快速开始](./word-family-quick-start.md) - 词族系统详细指南
- [向下兼容设计](./learning-content-downward-compatibility.md) - 向下兼容详细设计
- [词族生成指南](./word-family-generation-guide.md) - 词族生成流程
- [数据导入指南](./data-import-guide.md) - 数据导入步骤
- [表设计说明](./table-design-explanation.md) - 数据库表设计
- [压缩摘要](./compressed-summary.md) - 项目概览

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Drizzle ORM)
- **AI Services**: Gemini, DeepSeek, Kimi, OpenAI
- **Deployment**: Netlify + Neon

## 技术支持

如有问题，请查看项目文档或联系开发团队。
