# 初中英语学习助手 - 数据导入说明

## 已导入的学习资源

### 1. 单词数据（20个）
- **来源**：基于上海初二英语教学大纲的核心词汇
- **内容**：包括动词、形容词、名词等不同词性
- **特点**：每个单词包含音标、释义、英文例句和中文翻译
- **难度**：1-3级，适合初二学生

**导入脚本**：`scripts/seed-words.ts`

### 2. 语法知识点（26个）
- **来源**：上海初中英语语法教学大纲
- **分类**：
  - 时态（7个）：一般现在时、现在进行时、一般过去时等
  - 语态（1个）：被动语态
  - 情态动词（1个）
  - 非谓语动词（3个）：不定式、动名词、分词
  - 从句（5个）：定语从句、状语从句、宾语从句等
  - 句法（5个）：直接引语和间接引语、反意疑问句等
  - 基础语法（4个）：主谓一致、冠词用法、代词用法、介词用法、连词用法

**导入脚本**：`scripts/seed-grammar.ts`

### 3. 固定搭配（20个）
- **来源**：上海中考常见固定搭配
- **分类**：
  - 动词+介词：look forward to, be good at, be interested in 等
  - 动词短语：give up, look after, take part in 等
- **特点**：每个搭配包含释义、英文例句和中文翻译

**导入脚本**：`scripts/seed-collocations.ts`

### 4. 阅读文章（2篇）
- **来源**：适合上海初二水平的阅读材料
- **内容**：
  1. 《A Wonderful Trip to Shanghai》- 上海旅游记（中等难度，248词）
  2. 《My Best Friend》- 我最好的朋友（简单难度，276词）
- **特点**：每篇文章包含阅读理解题

**导入脚本**：`scripts/seed-articles.ts`

## 数据导入方法

### 重新导入数据

如果需要重新导入数据，可以运行以下命令：

```bash
# 导入单词
npx tsx scripts/seed-words.ts

# 导入语法知识点
npx tsx scripts/seed-grammar.ts

# 导入固定搭配
npx tsx scripts/seed-collocations.ts

# 导入阅读文章
npx tsx scripts/seed-articles.ts
```

### 添加更多数据

您可以通过以下方式添加更多学习数据：

#### 方法1：编辑导入脚本
1. 打开对应的脚本文件（如 `scripts/seed-words.ts`）
2. 在数据数组中添加新的条目
3. 运行脚本导入数据

#### 方法2：通过API接口
使用提供的 API 接口添加数据：

```bash
# 添加单词
curl -X POST http://localhost:5000/api/vocabulary/words \
  -H "Content-Type: application/json" \
  -d '{
    "word": "example",
    "phonetic": "/ɪɡˈzɑːmpl/",
    "meaning": "例子",
    "example": "This is an example.",
    "exampleTranslation": "这是一个例子。",
    "difficulty": 1
  }'
```

## 数据验证

### 验证单词数据
```bash
curl http://localhost:5000/api/vocabulary/words
```

### 验证固定搭配
```bash
curl http://localhost:5000/api/collocations
```

### 验证阅读文章
```bash
curl http://localhost:5000/api/reading/articles
```

## 注意事项

1. **版权说明**：
   - 当前导入的数据为示例数据
   - 部分内容来自公开教育资源
   - 建议根据孩子实际使用的教材内容进行调整

2. **数据补充**：
   - 目前单词数量较少（20个），建议增加到300-500个
   - 语法知识点已覆盖主要考点，可根据需要细化
   - 固定搭配建议扩展到50-100个
   - 阅读文章建议增加到20-30篇

3. **上海特色**：
   - 示例数据尽量贴合上海教材
   - 包含上海地名（如：The Bund, Yu Garden, Shanghai Disneyland）
   - 符合上海中考考点

4. **后续维护**：
   - 定期更新错题库
   - 根据学习进度调整难度
   - 添加新的阅读材料

## 自定义数据建议

如果您想添加更多数据，建议优先考虑以下内容：

### 优先级1：核心词汇（300-500个）
- 上海牛津英语八年级词汇表
- 中考高频词汇
- 常见同义词、反义词

### 优先级2：固定搭配（50-100个）
- be + 形容词 + 介词
- 动词 + 介词/副词
- 名词 + 介词

### 优先级3：阅读材料（20-30篇）
- 上海文化相关文章
- 人物故事
- 科普文章
- 说明文

### 优先级4：语法错题（从实际学习中收集）
- 孩子平时的作业错题
- 模拟考试错题
- 典型题型

## 技术支持

如有问题或需要帮助，请查看：
- 项目 README.md
- API 接口文档
- 数据库 schema 定义：`src/storage/database/shared/schema.ts`
