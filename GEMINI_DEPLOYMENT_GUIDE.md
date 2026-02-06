# Gemini 智能分析功能部署指南

## 📋 功能概述

本项目集成了 Gemini 1.5 Flash AI，实现了智能错题分析功能：

### 核心功能
1. **每日增量分析**（凌晨2点）
   - 只分析有新错题的用户
   - 提取错题知识点
   - 实时更新统计数据

2. **每周全量分析**（周日凌晨3点）
   - 只分析错题库有更新的用户
   - 深度分析学习模式和趋势
   - 生成复习建议

3. **智能去重**
   - 精确去重（数据库唯一约束）
   - 相似度检测（文本相似度算法）
   - 防止重复题目

4. **实时统计**
   - 添加错题时自动更新统计
   - 按知识点、难度、来源分类
   - 数据始终最新

---

## 🚀 部署步骤

### 第1步：准备环境变量

在 Netlify 控制台中添加以下环境变量：

```bash
# 必需变量
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-random-secret-key

# 可选变量
COZE_BUCKET_ENDPOINT_URL=your-bucket-endpoint
COZE_BUCKET_NAME=your-bucket-name
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
```

**获取方式**：
- `DATABASE_URL`：Neon 控制台 → Connection Details
- `GEMINI_API_KEY`：[Google AI Studio](https://aistudio.google.com/)
- `CRON_SECRET`：运行 `openssl rand -base64 32` 生成

---

### 第2步：运行数据库迁移

连接到 Neon 数据库，执行以下SQL文件：

```bash
psql "postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require" -f scripts/migrate-smart-analysis.sql
```

或在 Neon SQL Editor 中直接执行 `scripts/migrate-smart-analysis.sql`。

**迁移内容**：
- 添加智能分析相关字段
- 创建统计表和分析表
- 创建视图和索引
- 创建触发器自动化任务

---

### 第3步：部署到 Netlify

1. 连接 GitHub 仓库到 Netlify
2. 配置环境变量（见第1步）
3. 部署项目

Netlify 会自动：
- 安装依赖
- 构建项目
- 配置定时任务

---

## 📊 定时任务配置

### 任务1：每日增量分析

- **运行时间**：每天凌晨2点
- **API端点**：`/api/cron/daily-analysis`
- **功能**：
  - 查询有新错题的用户
  - 批量提取知识点（每批10题）
  - 实时更新统计
  - 请求间隔4秒（满足15次/分钟限制）

### 任务2：每周全量分析

- **运行时间**：每周日凌晨3点
- **API端点**：`/api/cron/weekly-analysis`
- **功能**：
  - 查询错题库有更新的用户
  - 深度分析学习模式
  - 生成复习建议
  - 请求间隔4秒

---

## 📈 成本分析

### Gemini 1.5 Flash 免费额度

- 每天请求次数：1500次
- 每分钟请求次数：15次

### 实际使用预估（50用户）

#### 每日增量分析
- 有新错题的用户：5-10个
- 每个用户：1-10批（取决于新错题数）
- 总计：10-100次调用/天

#### 每周全量分析
- 错题库更新的用户：10-20个
- 每个用户：5-10批
- 总计：50-200次调用/周

#### 月度总计
- 每日：100次 × 30天 = 3000次
- 每周：200次 × 4周 = 800次
- **总计：3800次/月**

### 配额使用

```
免费额度：1500次/天 × 30天 = 45,000次/月
实际使用：3800次/月
使用率：8.4%
剩余：41,200次/月
```

**结论：完全在免费范围内！**

---

## 🔍 监控和调试

### 查看分析日志

在数据库中查询：

```sql
-- 查看最近的每日分析记录
SELECT * FROM analysis_log
WHERE task_type = 'daily_incremental'
ORDER BY started_at DESC
LIMIT 10;

-- 查看最近的每周分析记录
SELECT * FROM analysis_log
WHERE task_type = 'weekly_full'
ORDER BY started_at DESC
LIMIT 10;

-- 查看失败的任务
SELECT * FROM analysis_log
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### 手动触发分析（测试用）

```bash
# 测试每日增量分析
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.netlify.app/api/cron/daily-analysis

# 测试每周全量分析
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.netlify.app/api/cron/weekly-analysis
```

---

## 📁 数据库表结构

### 核心表

1. **users** - 用户表
   - `last_analysis_date` - 最后分析时间
   - `has_new_mistakes` - 是否有新错题
   - `last_mistake_updated` - 错题库最后更新时间

2. **user_mistakes** - 错题表
   - `knowledge_point` - 知识点
   - `sub_knowledge_point` - 子知识点
   - `difficulty` - 难度
   - `status` - 分析状态
   - `duplicate_of` - 重复错题ID
   - `similarity_score` - 相似度分数

3. **user_mistake_stats** - 实时统计表
   - `total_count` - 总错题数
   - `knowledge_points` - 知识点统计
   - `difficulties` - 难度统计
   - `sources` - 来源统计

4. **user_mistake_analysis** - 深度分析表
   - `weak_points` - 薄弱点
   - `learning_trend` - 学习趋势
   - `review_suggestion` - 复习建议
   - `priority_points` - 优先知识点

5. **analysis_log** - 分析日志表
   - `task_type` - 任务类型
   - `user_id` - 用户ID
   - `status` - 状态
   - `items_analyzed` - 分析数量
   - `api_calls` - API调用次数
   - `error_message` - 错误信息

---

## 🎯 使用示例

### 添加错题（自动去重和统计）

```typescript
import { addMistake } from '@/utils/mistakeStats';

const db = await getDb();

const result = await addMistake(db, {
  userId: 'user123',
  question: 'He _____ to school by bike every day.',
  options: ['A. go', 'B. goes', 'C. going', 'D. went'],
  userAnswer: 'A',
  correctAnswer: 'B',
  explanation: '一般现在时第三人称单数形式',
  source: 'practice'
});

// 如果重复
if (result.isDuplicate) {
  console.log('该错题已存在');
}

// 成功添加
if (result.success) {
  console.log('错题ID:', result.mistakeId);
  console.log('统计已自动更新');
}
```

### 获取用户统计

```typescript
import { getUserStats, getUserDeepAnalysis } from '@/utils/mistakeStats';

const db = await getDb();

// 获取实时统计
const stats = await getUserStats(db, 'user123');
console.log('总错题数:', stats.totalCount);
console.log('知识点分布:', stats.knowledgePoints);

// 获取深度分析
const analysis = await getUserDeepAnalysis(db, 'user123');
console.log('薄弱点:', analysis.weakPoints);
console.log('学习趋势:', analysis.learningTrend);
console.log('复习建议:', analysis.reviewSuggestion);
```

---

## ⚠️ 常见问题

### Q1: 定时任务没有运行？

**A**: 检查：
1. Netlify 构建日志是否正常
2. 环境变量是否正确配置
3. `CRON_SECRET` 是否正确设置

### Q2: 分析失败？

**A**: 查看 `analysis_log` 表：
```sql
SELECT * FROM analysis_log
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;
```

### Q3: API 配额用完？

**A**: 检查 Gemini 控制台的配额使用情况，或升级到付费版本。

### Q4: 去重不准确？

**A**: 调整相似度阈值：
```typescript
// 在 checkDuplicate 函数中
await checkSimilarity(
  db,
  userId,
  question,
  0.9  // 提高到0.9（更严格）
);
```

---

## 🔄 更新和维护

### 定期维护任务

1. **每周检查**：
   - 查看 `analysis_log` 表的失败记录
   - 检查 API 配额使用情况

2. **每月检查**：
   - 清理旧的日志记录（保留最近3个月）
   - 分析用户增长趋势

3. **每季度检查**：
   - 评估成本和性能
   - 优化批次大小和调度策略

---

## 📞 技术支持

如有问题，请检查：
1. Netlify 构建日志
2. 数据库分析日志表
3. Gemini 控制台配额

---

部署完成后，智能分析功能将自动运行，无需人工干预！🎉
