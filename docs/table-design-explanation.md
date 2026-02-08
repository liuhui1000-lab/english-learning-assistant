# 词转、搭配、语法表设计说明

## 核心原则

单词表：**严格按年级**
其他资料：**贯穿初中**

---

## 各表设计详情

### 1. 单词表（words）- 按年级

**年级字段**：`grade` (VARCHAR(20))

**含义**：单词学习的年级

**可能值**：
- `6年级`
- `7年级`
- `8年级`
- `9年级`

**使用场景**：
```sql
-- 查询8年级的单词
SELECT * FROM words WHERE grade = '8年级';

-- 查询到当前年级的单词（循序渐进）
SELECT * FROM words
WHERE grade IN ('6年级', '7年级', '8年级')
ORDER BY grade;
```

**原因**：
- 单词是按年级学习的，每个年级有特定的词汇量要求
- 6年级的单词主要给6年级学生学
- 7年级学生会学习7年级的新单词，同时复习6年级的单词

---

### 2. 词转表（word_transformations）- 不按年级

**年级字段**：❌ **无**

**替代字段**：`sourceInfo` (VARCHAR(200))

**含义**：数据来源说明（如 `模拟卷2024-03`）

**使用场景**：
```sql
-- 查询所有词转练习（不限制年级）
SELECT * FROM word_transformations;

-- 查询特定来源的词转
SELECT * FROM word_transformations
WHERE sourceInfo = '模拟卷2024-03';
```

**原因**：
- 词转能力（如 help → helpful）是贯穿初中的语言技能
- 6年级学的词转规则，8年级考试也会考
- 中考要求掌握完整的词转体系
- 按年级隔离会导致知识碎片化

---

### 3. 搭配表（collocations）- 不按年级

**年级字段**：❌ **无**

**替代字段**：`sourceInfo` (VARCHAR(200))

**含义**：数据来源说明

**使用场景**：
```sql
-- 查询所有搭配（不限制年级）
SELECT * FROM collocations;

-- 查询包含某个词的搭配
SELECT * FROM collocations
WHERE phrase LIKE '%help%';
```

**原因**：
- 固定搭配是语言使用习惯，贯穿整个学习阶段
- make friends, help sb. with sth. 这样的搭配从6年级就学，一直用到9年级
- 中考英语强调固定搭配的使用

---

### 4. 语法点表（grammar_points）- 不按年级

**年级字段**：❌ **无**

**替代字段**：`level` (VARCHAR(20))

**含义**：难度级别（不是年级）

**可能值**：
- `6年级`
- `7年级`
- `8年级`
- `9年级`

**注意**：这里的 `level` 表示**难度级别**，而非学习年级

**使用场景**：
```sql
-- 查询所有语法点（不按年级隔离）
SELECT * FROM grammar_points;

-- 查询特定难度的语法点
SELECT * FROM grammar_points
WHERE level = '8年级';
```

**原因**：
- 语法知识点（如一般现在时、被动语态）贯穿整个初中
- 6年级学的基础语法，9年级考试仍然会考
- 中考要求掌握完整的语法体系
- `level` 字段表示该语法点的难度级别，用于分类和筛选

---

### 5. 阅读理解表（articles）- 不按年级

**年级字段**：❌ **无**

**替代字段**：`level` (VARCHAR(20))

**含义**：阅读难度级别

**可能值**：
- `beginner`（初级）
- `elementary`（基础）
- `intermediate`（中级）
- `advanced`（高级）

**使用场景**：
```sql
-- 查询中级难度的阅读
SELECT * FROM articles
WHERE level = 'intermediate';

-- 年级到难度映射
-- 6年级 -> beginner
-- 7年级 -> elementary
-- 8年级 -> intermediate
-- 9年级 -> advanced
```

**原因**：
- 阅读理解能力循序渐进，但不按年级严格隔离
- 学生可以根据自己的水平选择适合难度的阅读材料
- 8年级学生也可以尝试阅读 advanced 级别的文章

---

## 词族系统的年级策略

### 词族表（word_families）

**年级字段**：`grade` (VARCHAR(20))

**含义**：词族主要出现的年级（**参考用**）

**可能值**：
- `6年级`
- `7年级`
- `8年级`
- `9年级`

**使用场景**：
```sql
-- 查询8年级的词族
SELECT * FROM word_families
WHERE grade = '8年级';

-- 查询词族详情（包含所有关联内容）
-- 单词：按年级筛选
-- 词转：不限制年级（贯穿初中）
-- 搭配：不限制年级（贯穿初中）
```

**词族详情查询示例**：
```sql
-- 查询 "help" 词族详情
SELECT
  wf.base_word,
  wf.family_name,
  w.word,
  w.grade,
  wt.base_word as transformation,
  c.phrase as collocation
FROM word_families wf
LEFT JOIN words w ON w.word_family_id = wf.id
LEFT JOIN word_transformations wt ON wt.word_family_id = wf.id
LEFT JOIN collocations c ON c.phrase LIKE '%' || wf.base_word || '%'
WHERE wf.base_word = 'help';

-- 结果示例：
-- base_word: help
-- family_name: help 词族
-- 单词：help (6年级), helpful (7年级), helpfully (8年级)  ← 按年级
-- 词转：help → helpful, help → helpfully  ← 不限制年级
-- 搭配：help sb. with sth., be helpful to  ← 不限制年级
```

---

## 总结表

| 数据类型 | 年级字段 | 年级隔离 | 原因 |
|---------|---------|---------|------|
| 单词（words） | ✅ grade | ✅ 严格 | 词汇量按年级要求 |
| 词转（word_transformations） | ❌ 无 | ❌ 不隔离 | 语言技能贯穿初中 |
| 搭配（collocations） | ❌ 无 | ❌ 不隔离 | 语言习惯贯穿初中 |
| 语法（grammar_points） | ❌ 无 | ⚠️ level表示难度 | 语法体系贯穿初中 |
| 阅读（articles） | ❌ 无 | ❌ 不隔离 | 难度自适应 |
| 词族（word_families） | ✅ grade | ⚠️ 参考用 | 主要出现年级 |

---

## 常见问题

### Q: 为什么词转、搭配不按年级？
A: 因为这些是语言技能和习惯，从6年级学基础，到9年级还在使用。中考要求完整掌握，按年级隔离会导致知识碎片化。

### Q: 如何给8年级学生推荐学习内容？
A:
- 单词：6年级、7年级、8年级的单词（循序渐进）
- 词转：所有词转（不限制年级）
- 搭配：所有搭配（不限制年级）
- 语法：难度 6-8 级的语法点（循序渐进）

### Q: 词族详情中的单词和词转年级逻辑不同吗？
A: 是的。词族中的单词按年级显示（如 help-6年级, helpful-7年级），但词转和搭配不按年级，因为它们贯穿初中。
