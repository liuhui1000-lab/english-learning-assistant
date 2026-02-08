# 数据导入和词族初始化指南

## 概述

本指南介绍如何使用数据导入和词族初始化功能来快速搭建词族系统。

## 数据导入流程

### 第一步：导入单词数据

使用单词批量导入 API 上传单词数据。

#### API 端点
```
POST /api/admin/words/import
```

#### 请求示例
```json
{
  "words": [
    {
      "word": "help",
      "wordType": "verb",
      "phonetic": "/help/",
      "meaning": "帮助",
      "example": "Can you help me?",
      "exampleTranslation": "你能帮我吗？",
      "grade": "6年级",
      "difficulty": 1
    },
    {
      "word": "helpful",
      "wordType": "adj",
      "phonetic": "/ˈhelpfl/",
      "meaning": "有帮助的",
      "example": "She is very helpful.",
      "exampleTranslation": "她非常有帮助。",
      "grade": "7年级",
      "difficulty": 2
    }
  ],
  "skipDuplicates": true
}
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "total": 2,
    "success": 2,
    "skipped": 0,
    "failed": 0,
    "errors": []
  },
  "message": "成功导入 2 个单词，跳过 0 个，失败 0 个"
}
```

### 第二步：初始化词族系统

使用词族初始化 API 自动识别词族并建立关联。

#### API 端点
```
POST /api/admin/word-families/initialize
```

#### 请求示例
```json
{
  "grade": "8年级",
  "autoCreate": true,
  "autoLink": true,
  "skipExisting": true
}
```

#### 参数说明
- `grade`: 可选，指定年级。如果不指定，处理所有年级的单词
- `autoCreate`: 是否自动创建词族（默认 true）
- `autoLink`: 是否自动关联单词到词族（默认 true）
- `skipExisting`: 是否跳过已存在的词族（默认 true）

#### 响应示例
```json
{
  "success": true,
  "data": {
    "totalWords": 25,
    "recognizedFamilies": 8,
    "createdFamilies": 8,
    "linkedWords": 25,
    "skippedFamilies": 0,
    "failedWords": [],
    "families": [
      {
        "baseWord": "help",
        "familyId": "uuid-1",
        "wordCount": 3,
        "created": true
      },
      {
        "baseWord": "success",
        "familyId": "uuid-2",
        "wordCount": 4,
        "created": true
      }
    ],
    "unrecognizedCount": 2,
    "unrecognizedWords": ["example1", "example2"]
  },
  "message": "词族初始化完成：创建 8 个词族，关联 25 个单词"
}
```

## 使用示例数据

项目提供了一个示例数据文件 `data/sample-words.json`，包含25个测试单词。

### 导入示例数据

```bash
# 1. 读取示例数据
cat data/sample-words.json

# 2. 使用 curl 导入
curl -X POST http://localhost:5000/api/admin/words/import \
  -H "Content-Type: application/json" \
  -d @data/sample-words.json

# 3. 初始化词族
curl -X POST http://localhost:5000/api/admin/word-families/initialize \
  -H "Content-Type: application/json" \
  -d '{"autoCreate": true, "autoLink": true}'
```

## 验证数据

### 1. 查看所有词族
```bash
curl http://localhost:5000/api/admin/word-families
```

### 2. 查看词族详情
```bash
curl http://localhost:5000/api/admin/word-families/{familyId}
```

### 3. 查看词族中的单词
```bash
curl http://localhost:5000/api/admin/word-families/{familyId}
```

## 词族智能识别说明

### 识别方法

系统使用以下方法智能识别词族：

1. **前缀匹配**：识别常见前缀（un-, dis-, re-, pre- 等）
2. **后缀匹配**：识别常见后缀（-er, -ful, -ly, -ness, -ment 等）
3. **不规则词族**：手动维护的常见词族映射

### 识别示例

| 单词 | 识别结果 | 置信度 | 相关单词 |
|------|---------|--------|---------|
| helpful | help 词族 | 0.95 | help, helpful, helpfully |
| successful | success 词族 | 0.95 | succeed, success, successful |
| unhappy | happy 词族 | 0.95 | happy, unhappy, happily, happiness |
| agree | agree 词族 | 0.75 | agree, agreeable, agreement |

### 未识别的单词

以下类型的单词可能无法识别：
- 没有词根词缀变化的基础词汇
- 不规则变化（已经手动处理部分）
- 特殊词汇

这些单词会保留在数据库中，但不会关联到任何词族。

## 常见问题

### Q: 重复导入会怎样？
A: 默认 `skipDuplicates: true`，会跳过已存在的单词。

### Q: 可以只导入特定年级的单词吗？
A: 可以，在初始化时指定 `grade` 参数。

### Q: 词族创建后可以修改吗？
A: 可以，使用词族管理 API 进行修改。

### Q: 如何手动关联单词到词族？
A: 使用 `POST /api/admin/word-families/:id/words` API。

## 下一步

1. **导入更多数据**：准备完整的单词数据并导入
2. **开发前端界面**：创建词族管理页面
3. **实现学习功能**：基于词族的学习和复习功能
