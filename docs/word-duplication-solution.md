# 单词重复处理方案

## 当前逻辑

目前的处理逻辑是：
1. 检查单词是否已存在（只检查单词名称）
2. 如果存在，更新现有单词（用新数据补充）
3. 如果不存在，插入新单词

**问题**：六上的单词和八上的单词如果重复，会被认为是"同一个单词"，八上的上传会覆盖或更新六上的数据。

## 三种解决方案

### 方案 1：允许完全重复（推荐 ⭐⭐⭐⭐⭐）

**逻辑**：即使单词相同，只要年级或学期不同，就作为新记录插入。

**优点**：
- ✅ 保留完整的年级学期信息
- ✅ 每个年级学期的单词都独立记录
- ✅ 符合实际教学需求

**缺点**：
- ⚠️ 数据库中会有重复的单词
- ⚠️ 占用更多存储空间

**实现**：修改去重逻辑，检查单词+年级+学期的组合。

```typescript
// 检查单词是否已存在（同时检查单词和年级学期）
const [existingWord] = await db
  .select()
  .from(words)
  .where(
    and(
      eq(words.word, wordData.word),
      eq(words.grade, wordData.grade || '8年级'),
      eq(words.semester, wordData.semester || '下学期')
    )
  )
  .limit(1);

if (existingWord) {
  // 同一年级学期的单词才更新
  await db.update(words)...
} else {
  // 插入新单词（即使单词名称相同）
  await db.insert(words)...
}
```

---

### 方案 2：智能合并（推荐 ⭐⭐⭐⭐）

**逻辑**：
- 如果是新单词（任何年级都没有），插入
- 如果是现有单词，但在不同的年级学期，创建新记录
- 如果是同一单词且同一年级学期，更新

**优点**：
- ✅ 避免完全重复（同一年级学期不重复）
- ✅ 保留不同年级学期的独立记录
- ✅ 数据更规范

**缺点**：
- ⚠️ 实现稍微复杂

---

### 方案 3：全局去重（不推荐 ⭐）

**逻辑**：
- 单词全局唯一，不重复
- 记录单词首次出现的年级学期
- 后续年级学期不再重复

**优点**：
- ✅ 数据库最小
- ✅ 查询速度快

**缺点**：
- ❌ 丢失年级学期信息
- ❌ 不符合实际教学需求

---

## 推荐方案：方案 1（允许完全重复）

### 原因

1. **教学需求**：
   - 六年级学的单词和八年级学的单词是不同的学习进度
   - 即使单词相同，也应该独立记录
   - 学生可以在不同年级学期看到相同的单词进行复习

2. **学习追踪**：
   - 可以追踪学生在每个年级学期的单词掌握情况
   - 可以按年级学期生成学习计划
   - 可以查看每个年级学期的单词覆盖情况

3. **向下兼容**：
   - 八年级学生可以看到六年级、七年级、八年级的所有单词
   - 每个年级学期的单词独立显示

### 实现

修改单词上传的检查逻辑：

```typescript
// 获取当前上传的年级学期
const currentGrade = formData.get('grade') || '8年级';
const currentSemester = formData.get('semester') || '下学期';

for (const wordData of parsedWords) {
  // 检查同一单词是否在同一年级学期已存在
  const [existingWord] = await db
    .select()
    .from(words)
    .where(
      and(
        eq(words.word, wordData.word),
        eq(words.grade, currentGrade),
        eq(words.semester, currentSemester)
      )
    )
    .limit(1);

  if (existingWord) {
    // 同一年级学期，更新
    await db.update(words).set({...}).where(eq(words.id, existingWord.id));
  } else {
    // 不同年级学期或新单词，插入
    await db.insert(words).values({
      word: wordData.word,
      grade: currentGrade,
      semester: currentSemester,
      ...
    });
  }
}
```

### 效果

| 场景 | 结果 |
|------|------|
| 六上上传 "adventure" | ✅ 插入新记录（六上） |
| 八上上传 "adventure" | ✅ 插入新记录（八上） |
| 六上再次上传 "adventure" | ✅ 更新现有记录（六上） |
| 八上再次上传 "adventure" | ✅ 更新现有记录（八上） |

### 数据库示例

```
id  | word     | grade | semester | meaning
----|----------|-------|----------|--------
1   | adventure| 六年级 | 上学期   | 冒险
2   | adventure| 八年级 | 上学期   | 冒险
3   | bravery  | 六年级 | 上学期   | 勇气
4   | bravery  | 八年级 | 上学期   | 勇气
```

---

## 你的选择

请告诉我你希望采用哪种方案：

1. **方案 1（推荐）**：允许完全重复，按年级学期独立记录
2. **方案 2**：智能合并，同一年级学期不重复，不同年级学期可以重复
3. **方案 3**：全局去重，单词全局唯一
4. **其他需求**：如果你有其他想法，请告诉我

我会根据你的选择立即实现相应的代码修改。
