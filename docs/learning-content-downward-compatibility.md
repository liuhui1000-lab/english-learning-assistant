# 学习内容向下兼容设计文档

## 1. 设计原则

### 1.1 核心理念
- **向下兼容**：高年级学生可以学习当前年级内容，同时复习所有之前年级的内容
- **循序渐进**：按照年级递进的方式学习，确保知识体系的连贯性
- **复习巩固**：在学习新内容的同时，持续复习已学内容

### 1.2 年级策略

| 学生年级 | 可访问年级 | 内容说明 |
|---------|----------|---------|
| 6年级 | 6年级 | 仅学习6年级单词 |
| 7年级 | 6年级、7年级 | 学习7年级单词 + 复习6年级单词 |
| 8年级 | 6年级、7年级、8年级 | 学习8年级单词 + 复习6、7年级单词 |
| 9年级 | 6年级、7年级、8年级、9年级 | 学习9年级单词 + 复习6、7、8年级单词 |

## 2. 数据模型

### 2.1 单词表（words）
- `grade` 字段：标记单词所属年级（6年级、7年级、8年级、9年级）
- 严格按年级隔离，一个单词只属于一个年级

### 2.2 词族表（word_families）
- `grade` 字段：标记词族的主要年级（参考用）
- 一个词族可能包含多个年级的单词

### 2.3 词转表（word_transformations）
- **无年级字段**：贯穿初中，不按年级隔离
- 所有学生都可以学习所有词转知识

### 2.4 搭配表（collocations）
- **无年级字段**：贯穿初中，不按年级隔离
- 所有学生都可以学习所有搭配知识

### 2.5 语法表（grammar_points）
- `level` 字段：标记难度级别（入门、进阶、挑战）
- 难度级别可映射到年级，但不强制绑定

## 3. 实现机制

### 3.1 年级向下兼容映射

```typescript
const GRADE_COMPATIBILITY: Record<string, string[]> = {
  '6年级': ['6年级'],
  '7年级': ['6年级', '7年级'],
  '8年级': ['6年级', '7年级', '8年级'],
  '9年级': ['6年级', '7年级', '8年级', '9年级'],
};
```

### 3.2 核心函数

#### 3.2.1 getAccessibleGrades(userGrade)
获取用户可访问的年级列表（向下兼容）

**示例**：
```typescript
getAccessibleGrades('8年级'); // ['6年级', '7年级', '8年级']
getAccessibleGrades('7年级'); // ['6年级', '7年级']
```

#### 3.2.2 adaptWordFamiliesForUser(userGrade, limit)
为用户适配词族（向下兼容）

**逻辑**：
1. 查询主要年级在可访问范围内的词族
2. 获取每个词族的关联单词，筛选出可访问年级的单词
3. 获取所有词转和搭配（不限制年级）
4. 返回适配后的词族列表

**示例**：
```typescript
// 8年级学生获取词族
const families = await adaptWordFamiliesForUser('8年级', 50);
// 返回的词族只包含6、7、8年级的单词
```

#### 3.2.3 getUserLearningStats(userId, userGrade)
获取用户的学习统计（向下兼容）

**返回内容**：
```typescript
{
  totalFamilies: number;        // 可访问的总词族数
  completedFamilies: number;    // 已完成的词族数
  dueFamilies: number;          // 待复习的词族数
  totalWords: number;           // 可访问的总单词数
  currentGradeWords: number;    // 当前年级的单词数
  reviewWords: number;          // 需要复习的单词数
  masteryLevel: number;         // 平均掌握度
}
```

#### 3.2.4 generateLearningPlan(userGrade)
为新用户推荐学习计划（向下兼容）

**返回内容**：
```typescript
{
  currentGrade: string;
  recommendedFamilies: string[];
  schedule: [
    {
      phase: '复习内容',
      grade: '6年级',
      families: 50,
      estimatedDays: 17
    },
    {
      phase: '复习内容',
      grade: '7年级',
      families: 45,
      estimatedDays: 15
    },
    {
      phase: '新学内容',
      grade: '8年级',
      families: 40,
      estimatedDays: 14
    }
  ]
}
```

## 4. API 文档

### 4.1 获取学习内容
**接口**：`GET /api/learning/content?grade=8年级&limit=50`

**响应**：
```json
{
  "success": true,
  "data": {
    "userGrade": "8年级",
    "accessibleGrades": ["6年级", "7年级", "8年级"],
    "count": 50,
    "families": [...]
  },
  "message": "为 8年级 学生推荐 50 个词族"
}
```

### 4.2 获取学习统计
**接口**：`GET /api/learning/stats?grade=8年级`

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
  },
  "message": "学习统计数据"
}
```

### 4.3 生成学习计划
**接口**：`GET /api/learning/plan?grade=8年级`

**响应**：
```json
{
  "success": true,
  "data": {
    "currentGrade": "8年级",
    "recommendedFamilies": ["wf1", "wf2", ...],
    "schedule": [...]
  },
  "message": "为 8年级 学生生成学习计划"
}
```

## 5. 使用场景

### 5.1 用户登录后获取推荐内容
```typescript
// 前端调用
const response = await fetch(`/api/learning/content?grade=${user.grade}`);
const { data } = await response.json();

// 显示推荐词族列表
data.families.forEach(family => {
  // 只显示可访问年级的单词
  family.words.forEach(word => {
    // word.grade ∈ ['6年级', '7年级', '8年级']
  });
});
```

### 5.2 显示学习统计
```typescript
// 前端调用
const response = await fetch(`/api/learning/stats?grade=${user.grade}`);
const { data } = await response.json();

// 显示统计数据
console.log(`当前年级单词: ${data.currentGradeWords}`);
console.log(`复习单词: ${data.reviewWords}`);
console.log(`总单词数: ${data.totalWords}`);
```

### 5.3 生成学习计划
```typescript
// 前端调用
const response = await fetch(`/api/learning/plan?grade=${user.grade}`);
const { data } = await response.json();

// 显示学习计划
data.schedule.forEach(phase => {
  console.log(`${phase.phase}: ${phase.grade} - ${phase.families}个词族`);
});
```

## 6. 注意事项

### 6.1 词转和搭配不限制年级
- 词转表和搭配表没有年级字段，所有学生都可以学习
- 这符合中考知识体系：词转和搭配是贯穿初中的核心知识点

### 6.2 词族年级仅供参考
- 词族的 `grade` 字段只表示主要年级，不是唯一分类依据
- 一个词族可能包含多个年级的单词

### 6.3 学习统计的计算
- `currentGradeWords`：用户当前年级的单词数
- `reviewWords`：可访问年级中，非当前年级的单词数（需要复习）

### 6.4 前端展示建议
- 在词族详情页，按年级分组显示单词（6年级、7年级、8年级...）
- 用不同颜色标记新学内容（当前年级）和复习内容（之前年级）
- 显示进度条：`当前年级进度 / 总进度`

## 7. 未来优化

### 7.1 智能推荐
- 根据用户掌握度，动态调整复习频率
- 对于易错单词，增加复习次数

### 7.2 个性化路径
- 允许用户自定义学习计划
- 支持跳过已掌握的内容

### 7.3 学习效果追踪
- 记录单词在不同年级的表现
- 分析知识点跨年级的重要性
