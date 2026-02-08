# 词族系统年级学期支持设计文档

## 核心原则

### 1. 单词：严格按年级和学期
- `words` 表的 `grade` 字段表示该单词主要在哪个年级学习
- `words` 表的 `semester` 字段表示该单词主要在哪个学期学习
- 例如：help (6年级上学期)、helpful (7年级下学期)、helpfully (8年级上学期)

### 2. 词转/搭配/语法：不按年级和学期
- 这些知识点贯穿整个初中，是中考必考
- 不需要按年级和学期隔离，所有年级学生都可以学习

### 3. 词族：混合内容
- 一个词族可以包含不同年级、不同学期的单词
- 同时关联该词族相关的词转、搭配（不限制年级和学期）

### 4. 向下兼容原则（核心）
- **6年级上学期**：只学习6年级上学期的单词
- **6年级下学期**：学习6年级下学期 + 复习6年级上学期的单词
- **7年级上学期**：学习7年级上学期 + 复习6年级上学期、6年级下学期的单词
- **7年级下学期**：学习7年级下学期 + 复习6年级上学期、6年级下学期、7年级上学期的单词
- **8年级上学期**：学习8年级上学期 + 复习6年级、7年级的所有单词
- **8年级下学期**：学习8年级下学期 + 复习6年级、7年级、8年级上学期的单词
- **9年级上学期**：学习9年级上学期 + 复习6年级、7年级、8年级的所有单词
- **9年级下学期**：学习9年级下学期 + 复习6年级、7年级、8年级、9年级上学期的单词

## 年级学期向下兼容映射表

| 用户年级学期 | 可访问年级学期 | 单词示例 |
|------------|--------------|---------|
| 6年级上学期 | 6年级上学期 | apple, happy (6年级上学期) |
| 6年级下学期 | 6年级上学期、6年级下学期 | apple (复习), happiness (新学) |
| 7年级上学期 | 6年级上学期、6年级下学期、7年级上学期 | apple (复习), happiness (复习), helpful (新学) |
| 7年级下学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期 | apple (复习), happiness (复习), helpful (复习), helpfully (新学) |
| 8年级上学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期 | apple (复习), happiness (复习), helpful (复习), helpfully (新学), succeed (新学) |
| 8年级下学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期 | 全部8年级及以下单词（复习+新学） |
| 9年级上学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期、9年级上学期 | 全部9年级上学期及以下单词（复习+新学） |
| 9年级下学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期、9年级上学期、9年级下学期 | 全部单词（复习+新学） |

## 数据模型

### 1. words 表（单词表）
```sql
CREATE TABLE words (
  id VARCHAR(36) PRIMARY KEY,
  word VARCHAR(100) NOT NULL,
  word_type VARCHAR(20),  -- 'noun' | 'verb' | 'adj' | 'adv'
  phonetic VARCHAR(100),
  meaning TEXT NOT NULL,
  example TEXT,
  example_translation TEXT,
  grade VARCHAR(20) DEFAULT '8年级',  -- '6年级' | '7年级' | '8年级' | '9年级'
  semester VARCHAR(10) DEFAULT '下学期',  -- '上学期' | '下学期'
  difficulty INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_words_grade ON words(grade);
CREATE INDEX idx_words_semester ON words(semester);
CREATE INDEX idx_words_grade_semester ON words(grade, semester);
```

### 2. word_families 表（词族表）
```sql
CREATE TABLE word_families (
  id VARCHAR(36) PRIMARY KEY,
  base_word VARCHAR(100) NOT NULL,
  family_name VARCHAR(100) NOT NULL,
  grade VARCHAR(20) DEFAULT '8年级',  -- '6年级' | '7年级' | '8年级' | '9年级'
  semester VARCHAR(10) DEFAULT '下学期',  -- '上学期' | '下学期'
  source_type VARCHAR(20) DEFAULT 'list',
  source_info VARCHAR(200),
  difficulty INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_word_families_grade ON word_families(grade);
CREATE INDEX idx_word_families_semester ON word_families(semester);
CREATE INDEX idx_word_families_grade_semester ON word_families(grade, semester);
```

## 学习逻辑示例

### 场景：8年级下学期学生学习 "happy" 词族（向下兼容，支持学期）

1. **单词推荐（向下兼容，支持学期）**
   ```sql
   SELECT * FROM words
   WHERE word_family_id = 'happy_family_id'
     AND (
       (grade = '6年级' AND semester IN ('上学期', '下学期'))
       OR (grade = '7年级' AND semester IN ('上学期', '下学期'))
       OR (grade = '8年级' AND semester IN ('上学期', '下学期'))
     )
   ORDER BY grade, semester;
   ```

   结果：
   - happyly (6年级下学期，复习)
   - happiness (7年级上学期，复习)
   - happy (8年级下学期，新学)

2. **词转推荐**（不限制年级和学期，贯穿初中）
   ```sql
   SELECT * FROM word_transformations
   WHERE base_word = 'happy';
   ```

   结果：
   - happy → happiness (形容词变名词)
   - happy → happily (形容词变副词)
   - happy → unhappiness (加前缀)

3. **搭配推荐**（不限制年级和学期）
   ```sql
   SELECT * FROM collocations
   WHERE phrase LIKE '%happy%';
   ```

   结果：
   - be happy to do something
   - make me happy

### 场景：7年级上学期学生学习同一词族

1. **单词推荐（向下兼容，支持学期）**
   ```sql
   SELECT * FROM words
   WHERE word_family_id = 'happy_family_id'
     AND (
       (grade = '6年级' AND semester IN ('上学期', '下学期'))
       OR (grade = '7年级' AND semester = '上学期')
     )
   ORDER BY grade, semester;
   ```

   结果：
   - happyly (6年级下学期，复习)
   - happiness (7年级上学期，新学)
   - happy (8年级下学期，**不显示** - 未到该年级学期)

### 学习统计示例（8年级下学期学生）

```typescript
{
  totalFamilies: 100,        // 可访问的总词族数（6年级-8年级下学期）
  completedFamilies: 30,     // 已完成的词族数
  dueFamilies: 5,           // 待复习的词族数（根据艾宾浩斯）
  totalWords: 500,          // 可访问的总单词数（6年级-8年级下学期）
  currentSemesterWords: 80, // 8年级下学期的单词数（新学）
  reviewWords: 420,         // 6年级、7年级、8年级上学期的单词数（复习）
  masteryLevel: 3           // 平均掌握度（0-5）
}
```

## 实现机制

### 1. 年级学期映射常量

```typescript
const GRADE_SEMESTER_COMPATIBILITY: Record<string, string[]> = {
  '6年级上学期': ['6年级上学期'],
  '6年级下学期': ['6年级上学期', '6年级下学期'],
  '7年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期'],
  '7年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期'],
  '8年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期'],
  '8年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期'],
  '9年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期'],
  '9年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'],
};
```

### 2. 核心函数

#### 2.1 parseGradeSemester(gradeSemester)
解析年级学期组合

```typescript
parseGradeSemester('8年级上学期'); // { grade: '8年级', semester: '上学期' }
```

#### 2.2 combineGradeSemester(grade, semester)
组合年级和学期

```typescript
combineGradeSemester('8年级', '上学期'); // '8年级上学期'
```

#### 2.3 getAccessibleGradeSemesters(userGradeSemester)
获取用户可访问的年级学期列表（向下兼容）

```typescript
getAccessibleGradeSemesters('8年级下学期');
// ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期']
```

#### 2.4 adaptWordFamiliesForUser(userGradeSemester, limit)
为用户适配词族（向下兼容，支持学期）

**逻辑**：
1. 查询主要年级在可访问范围内的词族
2. 获取每个词族的关联单词，筛选出可访问年级学期的单词
3. 获取所有词转和搭配（不限制年级和学期）
4. 返回适配后的词族列表

#### 2.5 getUserLearningStats(userId, userGradeSemester)
获取用户的学习统计（向下兼容，支持学期）

**返回内容**：
```typescript
{
  totalFamilies: number;        // 可访问的总词族数
  completedFamilies: number;    // 已完成的词族数
  dueFamilies: number;          // 待复习的词族数
  totalWords: number;           // 可访问的总单词数
  currentSemesterWords: number; // 当前年级学期的单词数
  reviewWords: number;          // 需要复习的单词数
  masteryLevel: number;         // 平均掌握度
}
```

#### 2.6 generateLearningPlan(userGradeSemester)
为新用户推荐学习计划（向下兼容，支持学期）

**返回内容**：
```typescript
{
  currentGradeSemester: string;
  recommendedFamilies: string[];
  schedule: [
    {
      phase: '复习内容',
      gradeSemester: '6年级上学期',
      families: 25,
      estimatedDays: 9
    },
    {
      phase: '复习内容',
      gradeSemester: '6年级下学期',
      families: 25,
      estimatedDays: 9
    },
    {
      phase: '复习内容',
      gradeSemester: '7年级上学期',
      families: 22,
      estimatedDays: 8
    },
    {
      phase: '复习内容',
      gradeSemester: '7年级下学期',
      families: 23,
      estimatedDays: 8
    },
    {
      phase: '复习内容',
      gradeSemester: '8年级上学期',
      families: 20,
      estimatedDays: 7
    },
    {
      phase: '新学内容',
      gradeSemester: '8年级下学期',
      families: 18,
      estimatedDays: 6
    }
  ]
}
```

## API 文档

### 1. 获取学习内容
**接口**：`GET /api/learning/content?gradeSemester=8年级下学期&limit=50`

**响应**：
```json
{
  "success": true,
  "data": {
    "userGradeSemester": "8年级下学期",
    "accessibleGradeSemesters": ["6年级上学期", "6年级下学期", "7年级上学期", "7年级下学期", "8年级上学期", "8年级下学期"],
    "count": 50,
    "families": [...]
  },
  "message": "为 8年级下学期 学生推荐 50 个词族"
}
```

### 2. 获取学习统计
**接口**：`GET /api/learning/stats?gradeSemester=8年级下学期`

**响应**：
```json
{
  "success": true,
  "data": {
    "totalFamilies": 100,
    "completedFamilies": 30,
    "dueFamilies": 5,
    "totalWords": 500,
    "currentSemesterWords": 80,
    "reviewWords": 420,
    "masteryLevel": 3
  },
  "message": "学习统计数据"
}
```

### 3. 生成学习计划
**接口**：`GET /api/learning/plan?gradeSemester=8年级下学期`

**响应**：
```json
{
  "success": true,
  "data": {
    "currentGradeSemester": "8年级下学期",
    "recommendedFamilies": ["wf1", "wf2", ...],
    "schedule": [...]
  },
  "message": "为 8年级下学期 学生生成学习计划"
}
```

### 4. 导入单词（支持学期）
**接口**：`POST /api/admin/words/import`

**请求体**：
```json
{
  "grade": "8年级",
  "semester": "下学期",
  "words": [
    {
      "word": "happy",
      "meaning": "快乐的",
      "grade": "8年级",
      "semester": "下学期"
    }
  ],
  "skipDuplicates": true
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "total": 1,
    "success": 1,
    "skipped": 0,
    "failed": 0,
    "errors": []
  },
  "message": "成功导入 1 个单词（8年级下学期），跳过 0 个，失败 0 个"
}
```

## 数据导入示例

### 1. 导入6年级上学期单词表

```bash
curl -X POST http://localhost:5000/api/admin/words/import \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "6年级",
    "semester": "上学期",
    "words": [
      {
        "word": "apple",
        "meaning": "苹果",
        "phonetic": "/ˈæpl/",
        "example": "I like apples."
      }
    ]
  }'
```

### 2. 导入8年级下学期单词表

```bash
curl -X POST http://localhost:5000/api/admin/words/import \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "8年级",
    "semester": "下学期",
    "words": [
      {
        "word": "happy",
        "meaning": "快乐的",
        "phonetic": "/ˈhæpi/",
        "example": "I am happy today."
      }
    ]
  }'
```

## 注意事项

### 1. 词转和搭配不限制年级和学期
- 词转表和搭配表没有年级和学期字段，所有学生都可以学习
- 这符合中考知识体系：词转和搭配是贯穿初中的核心知识点

### 2. 词族年级学期仅供参考
- 词族的 `grade` 和 `semester` 字段只表示主要年级学期，不是唯一分类依据
- 一个词族可能包含多个年级、多个学期的单词

### 3. 学习统计的计算
- `currentSemesterWords`：用户当前年级学期的单词数
- `reviewWords`：可访问年级学期中，非当前年级学期的单词数（需要复习）

### 4. 前端展示建议
- 在词族详情页，按年级和学期分组显示单词（6年级上学期、6年级下学期、7年级上学期...）
- 用不同颜色标记新学内容（当前年级学期）和复习内容（之前年级学期）
- 显示进度条：`当前年级学期进度 / 总进度`

## 相关文档

- [词族系统快速开始](./word-family-quick-start.md) - 词族系统使用指南
- [词族生成指南](./word-family-generation-guide.md) - 词族生成流程
- [数据导入指南](./data-import-guide.md) - 数据导入步骤
- [项目快速开始](./PROJECT-QUICK-START.md) - 项目整体快速开始
- [压缩摘要](./compressed-summary.md) - 项目概览
