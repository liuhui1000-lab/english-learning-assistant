# 词族系统年级处理方案

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

### 场景：8年级学生学习 "success" 词族

1. **单词推荐**
   ```sql
   SELECT * FROM words
   WHERE word_family_id = 'success_family_id'
     AND grade IN ('6年级', '7年级', '8年级')  -- 学习到当前年级的单词
   ORDER BY grade;
   ```
   结果：succeed (7年级)、success (8年级)

2. **词转推荐**（不限制年级）
   ```sql
   SELECT * FROM word_transformations
   WHERE base_word = 'success';
   ```
   结果：success → successful、successfully

3. **搭配推荐**（不限制年级）
   ```sql
   SELECT * FROM collocations
   WHERE phrase LIKE '%success%';
   ```

4. **语法点推荐**（根据学习进度，不按年级）
   ```sql
   SELECT * FROM grammar_points
   WHERE level = '8年级';  -- 使用现有的 level 字段
   ```

## 实施建议

### 选项1：简化 grade 字段（推荐）
- 只在 `words` 表保留 `grade` 字段
- 其他表的 `grade` 字段删除或不使用
- 使用 `sourceInfo` 记录来源信息即可

### 选项2：保留 grade 字段但语义不同
- `words.grade`：严格按年级
- `word_transformations.grade`：参考用，表示该词转主要在哪个年级接触
- `collocations.grade`：同上
- `grammar_points.level`：已经存在，表示难度级别

### 推荐：选项1
更简单、更清晰，符合实际教学场景。
