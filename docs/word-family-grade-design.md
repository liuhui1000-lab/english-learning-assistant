# 词族系统年级处理方案（含向下兼容）

## 核心原则

### 1. 单词：严格按年级
- `words` 表的 `grade` 字段表示该单词主要在哪个年级学习
- 例如：help (6年级)、helpful (7年级)、helpfully (8年级)

### 2. 词转/搭配/语法：不按年级
- 这些知识点贯穿整个初中，是中考必考
- 不需要按年级隔离，所有年级学生都可以学习

### 3. 词族：混合内容
- 一个词族可以包含不同年级的单词
- 同时关联该词族相关的词转、搭配（不限制年级）

### 4. 向下兼容原则（核心）
- **6年级学生**：只学习6年级的单词
- **7年级学生**：学习7年级的单词 + 复习6年级的单词
- **8年级学生**：学习8年级的单词 + 复习6年级、7年级的单词
- **9年级学生**：学习9年级的单词 + 复习6年级、7年级、8年级的单词

## 向下兼容映射表

| 用户年级 | 可访问年级 | 单词示例 |
|---------|----------|---------|
| 6年级 | 6年级 | apple, happy, help |
| 7年级 | 6年级、7年级 | apple (复习), happiness (新学), helpful (新学) |
| 8年级 | 6年级、7年级、8年级 | apple (复习), happiness (复习), helpfully (新学) |
| 9年级 | 6年级、7年级、8年级、9年级 | 全部单词（复习 + 新学） |

## 数据表 grade 字段使用

### 保留 grade 字段的表
- `words` 表：必需，用于按年级筛选单词
- `word_families` 表：可选，记录该词族主要出现年级（或最低年级）

### 不需要 grade 字段的表
- `word_transformations` 表：词转能力贯穿初中
- `collocations` 表：搭配贯穿初中
- `grammar_points` 表：语法点贯穿初中
- `articles` 表：阅读理解已用 level (beginner/elementary/intermediate/advanced)

## 学习逻辑示例

### 场景：8年级学生学习 "happy" 词族（向下兼容）

1. **单词推荐（向下兼容）**
   ```sql
   SELECT * FROM words
   WHERE word_family_id = 'happy_family_id'
     AND grade IN ('6年级', '7年级', '8年级')  -- 向下兼容：学习当前及之前年级
   ORDER BY grade;
   ```
   结果：
   - happy (8年级，新学)
   - happiness (7年级，复习)
   - happyly (6年级，复习)

2. **词转推荐**（不限制年级，贯穿初中）
   ```sql
   SELECT * FROM word_transformations
   WHERE base_word = 'happy';
   ```
   结果：
   - happy → happiness (形容词变名词)
   - happy → happily (形容词变副词)
   - happy → unhappiness (加前缀)

3. **搭配推荐**（不限制年级）
   ```sql
   SELECT * FROM collocations
   WHERE phrase LIKE '%happy%';
   ```
   结果：
   - be happy to do something
   - make me happy

4. **语法点推荐**（根据学习进度，不按年级）
   ```sql
   SELECT * FROM grammar_points
   WHERE level IN ('入门', '进阶');  -- 使用现有的 level 字段
   ```

### 场景：7年级学生学习同一词族

1. **单词推荐（向下兼容）**
   ```sql
   SELECT * FROM words
   WHERE word_family_id = 'happy_family_id'
     AND grade IN ('6年级', '7年级')  -- 7年级只到7年级
   ORDER BY grade;
   ```
   结果：
   - happiness (7年级，新学)
   - happyly (6年级，复习)
   - happy (8年级，**不显示** - 未到该年级)

### 学习统计示例（8年级学生）

```typescript
{
  totalFamilies: 100,        // 可访问的总词族数（6-8年级）
  completedFamilies: 30,     // 已完成的词族数
  dueFamilies: 5,           // 待复习的词族数（根据艾宾浩斯）
  totalWords: 500,          // 可访问的总单词数（6-8年级）
  currentGradeWords: 150,   // 8年级的单词数（新学）
  reviewWords: 350,         // 6年级、7年级的单词数（复习）
  masteryLevel: 3           // 平均掌握度（0-5）
}
```

## 实施建议

### 选项1：简化 grade 字段（推荐）
- 只在 `words` 表保留 `grade` 字段（必需）
- `word_families` 表保留 `grade` 字段（可选，表示主要年级）
- 其他表的 `grade` 字段删除或不使用
- 使用 `sourceInfo` 记录来源信息即可

### 选项2：保留 grade 字段但语义不同
- `words.grade`：严格按年级，必需
- `word_transformations.grade`：不使用（词转贯穿初中）
- `collocations.grade`：不使用（搭配贯穿初中）
- `grammar_points.level`：已存在，表示难度级别（入门、进阶、挑战）

### 向下兼容实现（必需）

#### 1. 年级映射常量
```typescript
const GRADE_COMPATIBILITY: Record<string, string[]> = {
  '6年级': ['6年级'],
  '7年级': ['6年级', '7年级'],
  '8年级': ['6年级', '7年级', '8年级'],
  '9年级': ['6年级', '7年级', '8年级', '9年级'],
};
```

#### 2. 查询逻辑
```typescript
// 获取用户可访问的年级列表
const accessibleGrades = GRADE_COMPATIBILITY[userGrade];

// 查询单词时，只返回可访问年级的单词
const words = await db.select()
  .from(wordsTable)
  .where(sql`${wordsTable.grade} = ANY(${accessibleGrades})`);

// 查询词转、搭配时，不限制年级
const transformations = await db.select()
  .from(transformationsTable);  // 无年级过滤
```

#### 3. 学习统计计算
```typescript
const stats = {
  totalWords: accessibleWords.length,
  currentGradeWords: accessibleWords.filter(w => w.grade === userGrade).length,
  reviewWords: accessibleWords.filter(w => w.grade !== userGrade).length,
};
```

### 推荐：选项1 + 向下兼容实现
更简单、更清晰，符合实际教学场景和学生学习规律。

## 学习内容适配器 API

### 1. 获取可访问年级
```typescript
import { getAccessibleGrades } from '@/storage/database/learningContentAdapter';

const accessibleGrades = getAccessibleGrades('8年级');
// ['6年级', '7年级', '8年级']
```

### 2. 适配词族（向下兼容）
```typescript
import { adaptWordFamiliesForUser } from '@/storage/database/learningContentAdapter';

const families = await adaptWordFamiliesForUser('8年级', 50);
// 返回的词族只包含可访问年级的单词
```

### 3. 获取学习统计
```typescript
import { getUserLearningStats } from '@/storage/database/learningContentAdapter';

const stats = await getUserLearningStats(userId, '8年级');
// {
//   totalFamilies: 100,
//   completedFamilies: 30,
//   dueFamilies: 5,
//   totalWords: 500,
//   currentGradeWords: 150,
//   reviewWords: 350,
//   masteryLevel: 3
// }
```

### 4. 生成学习计划
```typescript
import { generateLearningPlan } from '@/storage/database/learningContentAdapter';

const plan = await generateLearningPlan('8年级');
// {
//   currentGrade: '8年级',
//   recommendedFamilies: ['wf1', 'wf2', ...],
//   schedule: [
//     { phase: '复习内容', grade: '6年级', families: 50, estimatedDays: 17 },
//     { phase: '复习内容', grade: '7年级', families: 45, estimatedDays: 15 },
//     { phase: '新学内容', grade: '8年级', families: 40, estimatedDays: 14 }
//   ]
// }
```

## 相关文档

- [学习内容向下兼容设计](./learning-content-downward-compatibility.md) - 详细设计和实现说明
- [词族生成指南](./word-family-generation-guide.md) - 词族生成流程
- [数据导入指南](./data-import-guide.md) - 数据导入步骤
- [快速开始](./word-family-quick-start.md) - 系统使用指南
