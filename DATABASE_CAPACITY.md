# 数据库容量分析与规划

## 📊 当前数据库规模预估

### 表结构与数据量

| 表名 | 用途 | 单条记录大小 | 预估记录数 | 总大小 |
|------|------|-------------|----------|--------|
| `words` | 单词表 | ~1KB | 5,000 | ~5MB |
| `word_transformations` | 词转变形 | ~5KB | 269 | ~1.3MB |
| `grammar_exercises` | 语法练习题 | ~2KB | 1,227 | ~2.5MB |
| `grammar_points` | 语法知识点 | ~500B | 100 | ~50KB |
| `collocations` | 固定搭配 | ~1KB | 500 | ~500KB |
| `articles` | 阅读文章 | ~10KB | 50 | ~500KB |
| `user_word_progress` | 单词学习进度 | ~500B | 5,000 | ~2.5MB |
| `user_transformation_progress` | 词转进度 | ~300B | 1,000 | ~300KB |
| `transformation_mistakes` | 词转错题 | ~1KB | 500 | ~500KB |
| `grammar_practice_records` | 语法练习记录 | ~300B | 10,000 | ~3MB |
| `grammar_mistakes` | 语法错题 | ~1KB | 1,000 | ~1MB |
| `grammar_weak_points` | 薄弱知识点 | ~500B | 200 | ~100KB |
| `user_reading_progress` | 阅读进度 | ~300B | 500 | ~150KB |
| **总计** | | | | **~17MB** |

### 当前数据库大小
- **核心数据**：~17MB（不含索引）
- **索引**：约 50% → ~25MB
- **总计**：**~42MB**

---

## 🚀 未来增长预估

### 阶段1：初期（1-6个月）
- **目标用户**：100-500人
- **题库规模**：5,000题
- **单词量**：10,000词
- **练习记录**：50,000条
- **预估大小**：~150MB

### 阶段2：中期（6-12个月）
- **目标用户**：500-2,000人
- **题库规模**：20,000题
- **单词量**：30,000词
- **练习记录**：500,000条
- **预估大小**：~800MB

### 阶段3：成熟期（1-2年）
- **目标用户**：5,000-10,000人
- **题库规模**：100,000题
- **单词量**：50,000词
- **练习记录**：5,000,000条
- **预估大小**：~8GB

---

## 👥 多用户模式影响分析

### 多用户需要的数据

| 数据类型 | 单用户 | 100用户 | 1000用户 | 10000用户 |
|---------|--------|---------|----------|-----------|
| 单词学习进度 | ~2.5MB | ~250MB | ~2.5GB | ~25GB |
| 语法练习记录 | ~3MB | ~300MB | ~3GB | ~30GB |
| 错题记录 | ~2MB | ~200MB | ~2GB | ~20GB |
| **总计** | **~7.5MB** | **~750MB** | **~7.5GB** | **~75GB** |

### 关键发现
- ✅ **核心题库**（单词、语法题）不随用户增长
- ⚠️ **用户数据**线性增长
- ⚠️ **练习记录**是最大增长点

---

## 📈 各平台免费版对比

### Supabase 免费版
- ✅ **数据库**：500MB PostgreSQL
- ✅ **文件存储**：1GB
- ✅ **每月请求**：50,000次
- ✅ **实时连接**：100个
- ⚠️ **限制**：7天备份保留

**适用阶段**：**阶段1（100-500用户）**

### Vercel Postgres 免费版
- ✅ **数据库**：256MB PostgreSQL
- ✅ **自动备份**
- ✅ **边缘节点**
- ⚠️ **限制**：只能用于 Vercel 部署的应用

**适用阶段**：**阶段0（测试/开发）**

### Neon 免费版
- ✅ **数据库**：3GB PostgreSQL（最大！）
- ✅ **自动暂停**：无活跃连接时自动休眠
- ✅ **分支功能**：支持开发分支
- ✅ **无请求限制**
- ⚠️ **限制**：20小时活跃时间/月

**适用阶段**：**阶段2（500-2,000用户）**

### PlanetScale 免费版
- ✅ **数据库**：5GB MySQL
- ✅ **无服务器架构**
- ✅ **自动扩缩容**
- ❌ **只支持 MySQL**（本项目使用 PostgreSQL）

---

## 🎯 推荐方案

### 方案1：开发/测试阶段（当前）
**使用 Vercel Postgres**
- ✅ 零配置，与 Vercel 部署一体化
- ✅ 256MB 足够开发测试
- ✅ 自动备份
- ✅ 无限构建
- ❌ 256MB 限制太小，不适合生产环境

### 方案2：初期上线（1-6个月）
**使用 Supabase 免费版**
- ✅ 500MB 数据库
- ✅ 1GB 对象存储
- ✅ 50,000次请求/月
- ✅ 支持多用户认证
- ✅ 实时功能
- ✅ 100-500用户完全够用

**预估成本**：$0

### 方案3：中期运营（6-12个月）
**使用 Supabase Pro 或 Neon**
- **Supabase Pro**：$25/月 → 8GB 数据库
- **Neon 免费版**：$0 → 3GB 数据库（推荐）

**推荐：Neon 免费版**
- ✅ 3GB 足够 1,000-2,000 用户
- ✅ 无请求限制
- ✅ 自动休眠节省资源
- ❌ 每月20小时活跃时间限制

### 方案4：成熟期（1年+）
**使用 Neon Pro 或 Supabase Pro**
- **Neon Pro**：$19/月 → 128GB 数据库
- **Supabase Pro**：$25/月 → 8GB 数据库

**推荐：Neon Pro**
- ✅ 128GB 支持 10,000+ 用户
- ✅ 按需付费，弹性扩容
- ✅ 全球边缘节点
- ✅ 无活跃时间限制

---

## 💾 数据优化建议

### 1. 练习记录归档
**策略**：定期将超过30天的练习记录归档到冷存储
```sql
-- 归档旧练习记录
CREATE TABLE grammar_practice_records_archive AS
SELECT * FROM grammar_practice_records
WHERE created_at < NOW() - INTERVAL '30 days';

-- 删除已归档记录
DELETE FROM grammar_practice_records
WHERE created_at < NOW() - INTERVAL '30 days';
```

**效果**：减少 60-70% 的活跃数据

### 2. 错题记录限制
**策略**：每用户最多保留最近的1,000条错题
```sql
-- 删除超过1,000条的旧错题
DELETE FROM grammar_mistakes
WHERE id NOT IN (
  SELECT id FROM grammar_mistakes
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT 1000
);
```

**效果**：防止错题记录无限增长

### 3. 学习进度聚合
**策略**：按天聚合学习数据
```sql
-- 创建每日学习统计表
CREATE TABLE user_daily_stats (
  user_id VARCHAR(100),
  date DATE,
  words_learned INTEGER DEFAULT 0,
  grammar_practiced INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),
  PRIMARY KEY (user_id, date)
);
```

**效果**：减少细粒度数据，节省 80% 空间

### 4. 使用 JSONB 代替关联表
**策略**：将某些关联数据改为 JSONB 存储
```sql
-- 例如：将单词例句改为 JSONB
ALTER TABLE words ADD COLUMN examples JSONB DEFAULT '[]';

-- 原来的例句表可以删除
DROP TABLE word_examples;
```

**效果**：减少表数量，提升查询性能

---

## 🔄 数据库迁移路径

### 阶段0 → 阶段1：Vercel Postgres → Supabase
```bash
# 1. 导出 Vercel Postgres 数据
pg_dump $DATABASE_URL > backup.sql

# 2. 导入到 Supabase
psql $SUPABASE_DATABASE_URL < backup.sql

# 3. 更新环境变量
DATABASE_URL=postgresql://xxx.supabase.co
```

### 阶段1 → 阶段2：Supabase → Neon
```bash
# 使用 Supabase 的备份功能
# 或使用 pg_dump 导出导入

# Supabase 提供一键导出功能
# Neon 支持从备份恢复
```

### 阶段2 → 阶段3：Neon → Neon Pro
```bash
# Neon 自动升级，无需迁移
# 只需更改套餐即可
```

---

## 📊 成本预估

| 用户数 | 推荐方案 | 月成本 | 年成本 |
|--------|---------|--------|--------|
| 0-100 | Vercel Postgres | $0 | $0 |
| 100-500 | Supabase 免费版 | $0 | $0 |
| 500-2,000 | Neon 免费版 | $0 | $0 |
| 2,000-10,000 | Neon Pro | $19 | $228 |
| 10,000+ | Neon Pro + 扩容 | $29-49 | $348-588 |

---

## 🎯 最终建议

### 立即行动（当前阶段）
1. ✅ 使用 **Vercel Postgres** 进行开发测试
2. ✅ 部署到 Vercel，零配置
3. ✅ 256MB 足够开发使用

### 近期规划（3-6个月）
1. ✅ 准备迁移到 **Supabase**
2. ✅ 注册 Supabase 账号
3. ✅ 实现多用户认证系统
4. ✅ 测试 Supabase 功能

### 中期规划（6-12个月）
1. ✅ 迁移到 **Neon** 免费版
2. ✅ 实现数据归档策略
3. ✅ 监控数据库使用情况
4. ✅ 准备付费方案

### 长期规划（1年+）
1. ✅ 升级到 **Neon Pro**
2. ✅ 实现读写分离（如果需要）
3. ✅ 添加缓存层（Redis）
4. ✅ 数据库分片（如果需要）

---

## 🔗 相关链接

- [Supabase](https://supabase.com/pricing)
- [Neon](https://neon.tech/pricing)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [PlanetScale](https://planetscale.com/pricing)

---

## ✅ 总结

**当前数据库大小**：~42MB（含索引）

**推荐路径**：
1. **开发**：Vercel Postgres（免费）
2. **初期**：Supabase 免费版（500MB）
3. **中期**：Neon 免费版（3GB）
4. **成熟期**：Neon Pro（128GB，$19/月）

**关键策略**：
- ✅ 实现数据归档机制
- ✅ 限制错题记录数量
- ✅ 按需聚合统计数据
- ✅ 选择支持平滑迁移的平台

这样可以确保系统在用户增长时平滑扩展，成本可控！
