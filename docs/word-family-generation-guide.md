# 词族生成完整流程

## 数据来源

### 1. 单词表（按年级分开）
```
6年级单词表: help, happy, play, ...
7年级单词表: helpful, happily, successful, ...
8年级单词表: helpfully, successfully, careless, ...
9年级单词表: carefully, carelessly, ...
```

**特点**：
- 按年级分开上传
- 同一词族的单词分散在不同年级
- 每个单词只有基础信息（单词、词义）

### 2. 初中词转表（网上整理）
```
[
  {
    "baseWord": "help",
    "transformations": [
      {"word": "helpful", "type": "suffix: -ful"},
      {"word": "helpfully", "type": "suffix: -ful + -ly"}
    ]
  },
  {
    "baseWord": "success",
    "transformations": [
      {"word": "succeed", "type": "verb"},
      {"word": "successful", "type": "suffix: -ful"},
      {"word": "successfully", "type": "suffix: -ful + -ly"}
    ]
  }
]
```

**特点**：
- 包含所有中考词转知识
- 不按年级
- 已经整理好了词族关系
- 是词族生成的**主要数据源**

---

## 完整流程（4步）

### 第1步：导入词转表

```bash
POST /api/admin/word-transformations/import
```

**请求示例**：
```json
{
  "transformations": [
    {
      "baseWord": "help",
      "baseMeaning": "帮助",
      "transformations": [
        {
          "word": "helpful",
          "type": "suffix: -ful",
          "meaning": "有帮助的"
        },
        {
          "word": "helpfully",
          "type": "suffix: -ful + -ly",
          "meaning": "有帮助地"
        }
      ],
      "difficulty": 2
    }
  ]
}
```

**预期结果**：导入所有词转数据到 `word_transformations` 表

---

### 第2步：导入单词表（分年级）

```bash
# 导入6年级单词
POST /api/admin/words/import
{
  "words": [
    {"word": "help", "meaning": "帮助", "grade": "6年级"},
    {"word": "happy", "meaning": "快乐的", "grade": "6年级"}
  ]
}

# 导入7年级单词
POST /api/admin/words/import
{
  "words": [
    {"word": "helpful", "meaning": "有帮助的", "grade": "7年级"},
    {"word": "successful", "meaning": "成功的", "grade": "7年级"}
  ]
}

# 导入8年级单词
POST /api/admin/words/import
{
  "words": [
    {"word": "helpfully", "meaning": "有帮助地", "grade": "8年级"},
    {"word": "careless", "meaning": "粗心的", "grade": "8年级"}
  ]
}

# 导入9年级单词
POST /api/admin/words/import
{
  "words": [
    {"word": "carefully", "meaning": "小心地", "grade": "9年级"}
  ]
}
```

**预期结果**：
- 所有单词导入到 `words` 表
- 每个单词标注了年级（6/7/8/9年级）
- 单词暂时未关联到词族

---

### 第3步：从词转表生成词族

```bash
POST /api/admin/word-families/generate
```

**请求示例**：
```json
{
  "skipExisting": true
}
```

**工作流程**：
1. 查询所有词转记录
2. 按基础词（baseWord）分组
3. 为每个基础词创建一个词族
4. 查询相关单词确定主要年级（取最早出现的年级）
5. 创建词族并关联词转
6. 关联单词到词族

**预期结果**：
```json
{
  "success": true,
  "data": {
    "total": 8,
    "created": 8,
    "skipped": 0,
    "families": [
      {
        "baseWord": "help",
        "familyId": "uuid-1",
        "wordCount": 3,
        "transformationCount": 1,
        "created": true
      },
      {
        "baseWord": "success",
        "familyId": "uuid-2",
        "wordCount": 4,
        "transformationCount": 1,
        "created": true
      }
    ]
  },
  "message": "词族生成完成：创建 8 个词族，跳过 0 个"
}
```

**生成的词族示例**：
```
help 词族（主要年级：6年级）
├── 单词：
│   ├── help (6年级)
│   ├── helpful (7年级)
│   └── helpfully (8年级)
└── 词转：
    └── help → helpful → helpfully
```

---

### 第4步：为用户推荐词族

```bash
GET /api/admin/word-families/generate?userGrade=8年级
```

**工作流程**：
1. 查询所有词族
2. 筛选主要年级 ≤ 用户年级的词族
3. 检查每个词族是否有该年级及之前的单词
4. 返回推荐列表

**预期结果（8年级学生）**：
```json
{
  "success": true,
  "data": {
    "userGrade": "8年级",
    "count": 6,
    "families": [
      {
        "id": "uuid-1",
        "baseWord": "help",
        "familyName": "help 词族",
        "grade": "6年级"
      },
      {
        "id": "uuid-2",
        "baseWord": "success",
        "familyName": "success 词族",
        "grade": "7年级"
      }
    ]
  },
  "message": "为 8年级 学生推荐 6 个词族"
}
```

**推荐逻辑**：
- 6年级学生：主要年级 = 6年级 的词族
- 7年级学生：主要年级 = 6年级 或 7年级 的词族
- 8年级学生：主要年级 = 6/7/8年级 的词族
- 9年级学生：所有词族

---

## 词族详情查询

```bash
GET /api/admin/word-families/{familyId}
```

**预期结果（help 词族）**：
```json
{
  "success": true,
  "data": {
    "family": {
      "id": "uuid-1",
      "baseWord": "help",
      "familyName": "help 词族",
      "grade": "6年级"
    },
    "words": [
      {
        "word": "help",
        "wordType": "verb",
        "meaning": "帮助",
        "grade": "6年级"
      },
      {
        "word": "helpful",
        "wordType": "adj",
        "meaning": "有帮助的",
        "grade": "7年级"
      },
      {
        "word": "helpfully",
        "wordType": "adv",
        "meaning": "有帮助地",
        "grade": "8年级"
      }
    ],
    "transformations": [
      {
        "baseWord": "help",
        "transformations": [
          {"word": "helpful", "type": "suffix: -ful"},
          {"word": "helpfully", "type": "suffix: -ful + -ly"}
        ]
      }
    ],
    "collocations": [
      {
        "phrase": "help sb. with sth.",
        "meaning": "帮助某人做某事"
      }
    ]
  }
}
```

---

## 预览功能（不创建，只预览）

```bash
POST /api/admin/word-families/generate
{
  "dryRun": true
}
```

**预期结果**：
```json
{
  "success": true,
  "data": {
    "dryRun": true,
    "previewCount": 8,
    "families": [
      {
        "baseWord": "help",
        "familyName": "help 词族",
        "transformations": ["helpful", "helpfully"],
        "grade": "6年级",
        "sourceCount": 3
      }
    ]
  },
  "message": "预览模式：检测到 8 个潜在词族"
}
```

---

## 智能补全（可选）

如果单词数据不完整，可以使用自动补全：

```bash
POST /api/admin/words/complete
```

**补全内容**：
- 发音（phonetic）
- 词性（wordType）
- 例句（example）
- 例句翻译（exampleTranslation）
- 难度等级（difficulty）

---

## 总结

### 词族生成的核心逻辑

1. **主要数据源**：词转表（word_transformations）
   - 词转表已经整理好了词族关系
   - 基于基础词（baseWord）分组
   - 每个基础词 = 一个词族

2. **辅助数据**：单词表（words）
   - 按年级标注单词
   - 确定词族的主要年级（取最早出现的）
   - 关联单词到词族

3. **用户适配**：根据用户年级推荐
   - 6年级 → 6年级词族
   - 7年级 → 6-7年级词族
   - 8年级 → 6-8年级词族
   - 9年级 → 所有词族

### 完整流程图

```
词转表 (主要数据源)
    ↓
按基础词分组
    ↓
创建词族
    ↓
关联词转到词族
    ↓
查询单词表
    ↓
确定主要年级
    ↓
关联单词到词族
    ↓
根据用户年级推荐
```

### API 总览

| 功能 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 导入词转 | POST | `/api/admin/word-transformations/import` | 导入词转数据 |
| 导入单词 | POST | `/api/admin/words/import` | 导入单词数据 |
| 补全单词 | POST | `/api/admin/words/complete` | 自动补全缺失信息 |
| 生成词族 | POST | `/api/admin/word-families/generate` | 从词转表生成词族 |
| 预览词族 | POST | `/api/admin/word-families/generate?dryRun=true` | 预览将要创建的词族 |
| 推荐词族 | GET | `/api/admin/word-families/generate?userGrade=8年级` | 为用户推荐词族 |
| 查询词族 | GET | `/api/admin/word-families/:id` | 查询词族详情 |
