# 词转练习功能文档

## 功能概述

词转练习模块已全面升级，支持：
1. ✅ 包含原形词的完整变形列表
2. ✅ 批量练习后统一批改
3. ✅ 显示所有变形（包括未填写的）
4. ✅ 错题记录和进度跟踪
5. ✅ 艾宾浩斯记忆曲线复习调度

## 数据结构

### word_transformations 表
- `base_word`: 基础词（如：act）
- `base_meaning`: 基础词释义（如：行动；表演）
- `transformations`: JSON 数组，包含所有变形
  - 原形：`{ word: "act", meaning: "行动；表演", type: "原形（动词）" }`
  - 变形：`{ word: "actor", meaning: "演员（男）", type: "名词（人）" }`

### user_transformation_progress 表
- `user_id`: 用户ID
- `transformation_id`: 词转组ID
- `word`: 具体单词（actor, action等）
- `mastery_level`: 掌握程度 0-5
- `review_count`: 复习次数
- `correct_count`: 正确次数
- `wrong_count`: 错误次数
- `last_review_at`: 最后复习时间
- `next_review_at`: 下次复习时间（艾宾浩斯曲线）

## 艾宾浩斯记忆曲线

复习间隔根据掌握程度自动计算：

| 掌握程度 | 复习间隔 |
|---------|---------|
| 0级     | 1小时   |
| 1级     | 6小时   |
| 2级     | 1天     |
| 3级     | 3天     |
| 4级     | 7天     |
| 5级     | 14天    |

## 练习流程

### 1. 显示基础词
```
基础词：act
释义：行动；表演
```

### 2. 用户填写变形
- act（原形）- 行动；表演 - 原形（动词）
- actor - 演员（男） - 名词（人）
- actress - 演员（女） - 名词（人）
- action - 行动；活动 - 名词（物）
- active - 活跃的；积极的 - 形容词
- activity - 活动 - 名词

### 3. 点击"批改答案"
- 实时反馈正确/错误/未填写
- 显示完整变形列表

### 4. 自动记录进度
- 正确：掌握度 +1
- 错误：掌握度 -1
- 计算下次复习时间

## API 接口

### 获取词转数据
```
GET /api/vocabulary/transformations
```

### 提交练习结果
```
POST /api/vocabulary/transformations/progress

Body: {
  userId: string,
  transformationId: string,
  word: string,
  isCorrect: boolean
}
```

### 获取复习列表
```
GET /api/vocabulary/transformations/progress?userId=xxx&mode=review
```

### 获取新练习列表
```
GET /api/vocabulary/transformations/progress?userId=xxx&mode=new
```

## 数据统计

- 词转组数：42 组
- 每组包含 3-6 个变形（含原形）
- 总变形词数：约 180 个

## 示例数据

### act 组
```json
{
  "baseWord": "act",
  "baseMeaning": "行动；表演",
  "transformations": [
    { "word": "act", "meaning": "行动；表演", "type": "原形（动词）" },
    { "word": "actor", "meaning": "演员（男）", "type": "名词（人）" },
    { "word": "actress", "meaning": "演员（女）", "type": "名词（人）" },
    { "word": "action", "meaning": "行动；活动", "type": "名词（物）" },
    { "word": "active", "meaning": "活跃的；积极的", "type": "形容词" },
    { "word": "activity", "meaning": "活动", "type": "名词" }
  ]
}
```

### complete 组
```json
{
  "baseWord": "complete",
  "baseMeaning": "完成；完整的",
  "transformations": [
    { "word": "complete", "meaning": "完成；完整的", "type": "原形（动词/形容词）" },
    { "word": "completion", "meaning": "完成", "type": "名词" },
    { "word": "completely", "meaning": "完全地；彻底地", "type": "副词" },
    { "word": "incomplete", "meaning": "不完全的", "type": "形容词" }
  ]
}
```

## 未来优化

1. 实现用户登录功能
2. 添加错题本模式
3. 支持自定义练习数量
4. 添加学习统计图表
5. 支持导出学习记录
