# 词族学习系统 - 快速开始指南

## 1. 系统概述

词族学习系统采用**向下兼容**的设计原则，确保学生能够循序渐进地学习，同时持续复习之前学过的内容。

### 核心特性
- ✅ 按年级管理单词（6-9年级）
- ✅ 词族整合单词、词转、搭配
- ✅ 向下兼容：高年级学生可复习低年级内容
- ✅ 艾宾浩斯记忆曲线支持
- ✅ 智能推荐学习计划

## 2. 数据导入

### 2.1 导入单词表（按年级）

管理员需要提供4个年级的单词表：
- `grade-6-words.csv`
- `grade-7-words.csv`
- `grade-8-words.csv`
- `grade-9-words.csv`

**格式**：
```csv
word,translation,phonetic,example
apple,苹果,/ˈæpl/,I like apples.
banana,香蕉,/bəˈnænə/,This is a banana.
```

**导入命令**：
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

### 2.2 导入词转表（贯穿初中）

管理员提供词转表：
- `transformations.csv`

**格式**：
```csv
base_word,transformation,rule,example
happy,happiness,形容词变名词,Her happiness is obvious.
happy,happily,形容词变副词,He smiled happily.
```

**导入命令**：
```bash
curl -X POST http://localhost:5000/api/admin/word-families/initialize \
  -H "Content-Type: application/json"
```

### 2.3 导入搭配表（贯穿初中）

管理员提供搭配表：
- `collocations.csv`

**格式**：
```csv
phrase,translation,example
make a decision,做决定,We need to make a decision.
take a break,休息一下,Let's take a break.
```

## 3. 词族生成

### 3.1 自动生成词族

基于词转表自动生成词族：

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

**参数说明**：
- `autoLinkWords`：自动关联单词（根据词根词尾匹配）
- `autoCompleteData`：自动补全单词数据（使用 LLM）

### 3.2 查看生成的词族

```bash
curl http://localhost:5000/api/admin/word-families?limit=10
```

**响应**：
```json
{
  "success": true,
  "data": {
    "count": 10,
    "families": [
      {
        "id": "wf-happy",
        "baseWord": "happy",
        "grade": "8年级",
        "transformationsCount": 3,
        "wordsCount": 5
      }
    ]
  }
}
```

## 4. 用户学习

### 4.1 获取推荐内容（向下兼容）

```bash
curl "http://localhost:5000/api/learning/content?grade=8年级&limit=50"
```

**响应**：
```json
{
  "success": true,
  "data": {
    "userGrade": "8年级",
    "accessibleGrades": ["6年级", "7年级", "8年级"],
    "count": 50,
    "families": [
      {
        "family": {
          "id": "wf-happy",
          "baseWord": "happy",
          "grade": "8年级"
        },
        "words": [
          {
            "word": "happy",
            "translation": "快乐的",
            "grade": "8年级"
          },
          {
            "word": "happiness",
            "translation": "幸福",
            "grade": "7年级"
          }
        ],
        "transformations": [
          {
            "baseWord": "happy",
            "transformation": "happiness",
            "rule": "形容词变名词"
          }
        ],
        "collocations": [
          {
            "phrase": "make a decision",
            "translation": "做决定"
          }
        ]
      }
    ]
  },
  "message": "为 8年级 学生推荐 50 个词族"
}
```

### 4.2 查看学习统计

```bash
curl "http://localhost:5000/api/learning/stats?grade=8年级"
```

**响应**：
```json
{
  "success": true,
  "data": {
    "totalFamilies": 100,
    "completedFamilies": 30,
    "dueFamilies": 5,
    "totalWords": 500,
    "currentGradeWords": 150,
    "reviewWords": 350,
    "masteryLevel": 3
  }
}
```

### 4.3 生成学习计划

```bash
curl "http://localhost:5000/api/learning/plan?grade=8年级"
```

**响应**：
```json
{
  "success": true,
  "data": {
    "currentGrade": "8年级",
    "recommendedFamilies": ["wf1", "wf2", ...],
    "schedule": [
      {
        "phase": "复习内容",
        "grade": "6年级",
        "families": 50,
        "estimatedDays": 17
      },
      {
        "phase": "复习内容",
        "grade": "7年级",
        "families": 45,
        "estimatedDays": 15
      },
      {
        "phase": "新学内容",
        "grade": "8年级",
        "families": 40,
        "estimatedDays": 14
      }
    ]
  }
}
```

## 5. 学习流程

### 5.1 新用户注册

1. 用户注册账号
2. 选择年级（6/7/8/9年级）
3. 系统自动生成学习计划

### 5.2 每日学习

1. **获取今日学习内容**
   - 调用 `/api/learning/content?grade=8年级`
   - 查看词族列表

2. **学习词族**
   - 查看词族详情
   - 学习单词、词转、搭配
   - 记录学习进度

3. **复习旧内容**
   - 根据艾宾浩斯曲线
   - 系统自动推荐复习内容

### 5.3 进度追踪

- 查看学习统计：`/api/learning/stats`
- 查看学习计划：`/api/learning/plan`

## 6. API 快速参考

### 管理员 API

| API | 方法 | 说明 |
|-----|------|------|
| `/api/admin/words/import` | POST | 导入单词（按年级） |
| `/api/admin/word-families/initialize` | POST | 初始化词转表 |
| `/api/admin/word-families/generate` | POST | 生成词族 |
| `/api/admin/word-families` | GET | 查询词族列表 |
| `/api/admin/word-families/[id]` | GET | 查询词族详情 |
| `/api/admin/word-families/[id]/words` | POST | 关联单词 |
| `/api/admin/word-families/[id]/transformations` | POST | 关联词转 |

### 学习 API

| API | 方法 | 说明 |
|-----|------|------|
| `/api/learning/content` | GET | 获取学习内容（向下兼容） |
| `/api/learning/stats` | GET | 获取学习统计 |
| `/api/learning/plan` | GET | 生成学习计划 |
| `/api/learning/test-compatibility` | GET | 测试向下兼容（管理员） |

## 7. 常见问题

### Q1: 为什么词转表和搭配表不按年级？
A: 词转和搭配是贯穿初中的核心知识点，不按年级隔离，所有学生都可以学习。

### Q2: 如何理解"向下兼容"？
A: 高年级学生可以学习当前年级内容，同时复习所有之前年级的内容。

### Q3: 词族的年级字段是什么意思？
A: 词族的 `grade` 字段表示主要年级，但一个词族可能包含多个年级的单词。

### Q4: 如何测试向下兼容逻辑？
A: 调用 `/api/learning/test-compatibility`（需要管理员权限）。

### Q5: 学习统计中的 `reviewWords` 是什么？
A: `reviewWords` 表示可访问年级中，非当前年级的单词数，即需要复习的单词。

## 8. 相关文档

- [学习内容向下兼容设计](./learning-content-downward-compatibility.md)
- [词族生成指南](./word-family-generation-guide.md)
- [数据导入指南](./data-import-guide.md)
- [表设计说明](./table-design-explanation.md)
