# 学期支持更新说明

## 更新概述

词族学习系统现在支持每个年级分为**上学期**和**下学期**，共有**8个词汇表**：

- 6年级上学期
- 6年级下学期
- 7年级上学期
- 7年级下学期
- 8年级上学期
- 8年级下学期
- 9年级上学期
- 9年级下学期

## 主要变化

### 1. 数据库结构

#### 新增字段

**words 表**：
- `grade` VARCHAR(20) - 年级（6年级、7年级、8年级、9年级）
- `semester` VARCHAR(10) - 学期（上学期、下学期）

**word_families 表**：
- `grade` VARCHAR(20) - 主要年级（6年级、7年级、8年级、9年级）
- `semester` VARCHAR(10) - 主要学期（上学期、下学期）

#### 新增索引

```sql
-- words 表
CREATE INDEX idx_words_semester ON words(semester);
CREATE INDEX idx_words_grade_semester ON words(grade, semester);

-- word_families 表
CREATE INDEX idx_word_families_semester ON word_families(semester);
CREATE INDEX idx_word_families_grade_semester ON word_families(grade, semester);
```

### 2. 向下兼容逻辑

#### 年级学期映射

| 用户年级学期 | 可访问年级学期 |
|------------|--------------|
| 6年级上学期 | 6年级上学期 |
| 6年级下学期 | 6年级上学期、6年级下学期 |
| 7年级上学期 | 6年级上学期、6年级下学期、7年级上学期 |
| 7年级下学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期 |
| 8年级上学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期 |
| 8年级下学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期 |
| 9年级上学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期、9年级上学期 |
| 9年级下学期 | 6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期、9年级上学期、9年级下学期 |

### 3. API 变更

#### 查询参数变更

所有学习相关 API 的查询参数从 `grade` 变更为 `gradeSemester`：

**旧格式**：
```
GET /api/learning/content?grade=8年级
```

**新格式**：
```
GET /api/learning/content?gradeSemester=8年级下学期
```

#### API 列表

| API | 旧参数 | 新参数 |
|-----|-------|-------|
| `/api/learning/content` | `grade` | `gradeSemester` |
| `/api/learning/stats` | `grade` | `gradeSemester` |
| `/api/learning/plan` | `grade` | `gradeSemester` |

### 4. 单词导入 API 变更

#### 新增支持

导入单词时可以指定年级和学期：

```json
{
  "grade": "8年级",
  "semester": "下学期",
  "words": [
    {
      "word": "happy",
      "meaning": "快乐的",
      "grade": "8年级",      // 可选，优先使用单词自己的grade
      "semester": "下学期"    // 可选，优先使用单词自己的semester
    }
  ]
}
```

## 数据迁移

### Step 4：添加学期字段

```sql
-- 为 words 表添加 semester 字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT '下学期';

-- 为 word_families 表添加 semester 字段
ALTER TABLE word_families ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT '下学期';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_words_semester ON words(semester);
CREATE INDEX IF NOT EXISTS idx_word_families_semester ON word_families(semester);
CREATE INDEX IF NOT EXISTS idx_words_grade_semester ON words(grade, semester);
CREATE INDEX IF NOT EXISTS idx_word_families_grade_semester ON word_families(grade, semester);
```

## 使用示例

### 1. 导入单词（支持学期）

```bash
# 导入8年级下学期单词
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

### 2. 获取学习内容（支持学期）

```bash
# 8年级下学期学生获取学习内容
curl "http://localhost:5000/api/learning/content?gradeSemester=8年级下学期&limit=50"
```

### 3. 获取学习统计（支持学期）

```bash
# 8年级下学期学生的学习统计
curl "http://localhost:5000/api/learning/stats?gradeSemester=8年级下学期"
```

### 4. 生成学习计划（支持学期）

```bash
# 8年级下学期学生的学习计划
curl "http://localhost:5000/api/learning/plan?gradeSemester=8年级下学期"
```

## 测试

### 运行测试脚本

```bash
npx ts-node src/storage/database/test-downward-compatibility.ts
```

### 测试 API

```bash
# 测试向下兼容逻辑（需要管理员权限）
curl "http://localhost:5000/api/learning/test-compatibility"
```

## 注意事项

### 1. 无版本区分

所有上传的资料都没有版本的区分，不添加版本管理功能。

### 2. 词转和搭配不限制年级学期

- 词转表和搭配表没有年级和学期字段
- 所有学生都可以学习所有词转和搭配

### 3. 向下兼容原则

- 高年级学生可以学习当前年级学期内容
- 同时复习所有之前年级学期的内容

### 4. 数据导入

- 需要导入8个年级学期的单词表
- 每个年级学期的单词表单独导入
- 导入时指定正确的年级和学期

## 相关文档

- [年级学期支持设计文档](./word-family-semester-design.md) - 详细设计和实现说明
- [学习内容向下兼容设计](./learning-content-downward-compatibility.md) - 向下兼容逻辑
- [词族系统快速开始](./word-family-quick-start.md) - 词族系统使用指南
- [压缩摘要](./compressed-summary.md) - 项目概览

## 常见问题

### Q1: 为什么要分为上学期和下学期？
A: 因为每个学年的词汇表分为上学期和下学期两份，需要分别管理和学习。

### Q2: 8年级下学期的学生能看到哪些内容？
A: 8年级下学期的学生可以看到6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期的所有单词和词转内容。

### Q3: 词转和搭配是否也按年级学期隔离？
A: 不，词转和搭配贯穿初中，不按年级学期隔离，所有学生都可以学习。

### Q4: 如何导入不同年级学期的单词？
A: 在导入时指定正确的年级和学期参数，如 `grade: "8年级", semester: "下学期"`。

### Q5: 是否支持版本管理？
A: 不支持，所有上传的资料都没有版本的区分。
