# 题库管理系统部署指南

## 📋 功能概述

题库管理系统为管理员提供了完整的题库管理能力：

### 核心功能
1. **版本管理**
   - 创建题库版本
   - 激活/停用版本
   - 删除版本
   - 导出版本

2. **批量导入**
   - 支持 JSON 格式
   - 支持 CSV 格式
   - 自动验证数据
   - 异步处理大文件

3. **导入跟踪**
   - 实时查看导入进度
   - 统计成功/失败数量
   - 记录错误信息
   - 计算处理时长

4. **在线管理**
   - 题库版本列表
   - 导入任务历史
   - 版本详情查看
   - 一键操作

---

## 🚀 部署步骤

### 第1步：运行数据库迁移

连接到 Neon 数据库，执行以下SQL文件：

```bash
psql "postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require" \
  -f scripts/migrate-library-management.sql
```

或在 Neon SQL Editor 中直接执行 `scripts/migrate-library-management.sql`。

**迁移内容**：
- 创建题库版本表（library_versions）
- 创建导入任务表（import_tasks）
- 更新单词表，添加版本支持
- 创建视图和函数
- 创建触发器

### 第2步：访问管理页面

1. 使用管理员账户登录
2. 访问：`https://your-app.netlify.app/admin/library`

---

## 📁 数据库结构

### 1. library_versions（题库版本表）

```sql
CREATE TABLE library_versions (
  id SERIAL PRIMARY KEY,
  library_type VARCHAR(50) NOT NULL, -- 'word' | 'grammar' | 'phrase' | 'reading'
  version VARCHAR(20) NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '{}', -- 变更统计
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false, -- 当前激活的版本
  UNIQUE (library_type, version)
);
```

### 2. import_tasks（导入任务表）

```sql
CREATE TABLE import_tasks (
  id SERIAL PRIMARY KEY,
  library_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_format VARCHAR(20), -- 'json' | 'csv' | 'xlsx'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'processing' | 'success' | 'failed'
  total_items INTEGER DEFAULT 0,
  success_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_message TEXT,
  changes JSONB DEFAULT '{}', -- 添加/修改/删除统计
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### 3. 更新后的单词表

```sql
ALTER TABLE words
ADD COLUMN version_id INTEGER REFERENCES library_versions(id),
ADD COLUMN created_by TEXT REFERENCES users(id),
ADD COLUMN updated_by TEXT REFERENCES users(id),
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

---

## 🔌 API 接口

### 版本管理

#### GET /api/admin/library/versions
获取所有题库版本

**查询参数**：
- `libraryType`: 题库类型筛选（可选）

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "library_type": "word",
      "version": "1.0.0",
      "description": "2025年初二单词库",
      "is_active": true,
      "created_at": "2025-01-09T10:00:00.000Z",
      "created_by_name": "admin",
      "item_count": 500
    }
  ]
}
```

#### POST /api/admin/library/versions
创建新版本

**请求体**：
```json
{
  "libraryType": "word",
  "version": "1.0.0",
  "description": "2025年初二单词库"
}
```

#### POST /api/admin/library/versions/:id/activate
激活版本

**响应**：
```json
{
  "success": true,
  "message": "版本激活成功"
}
```

#### GET /api/admin/library/versions/:id/export
导出版本

**响应**：JSON 文件下载

### 导入管理

#### POST /api/admin/library/import
导入题库文件

**请求**：FormData

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('libraryType', 'word');
formData.append('version', '1.0.0');
formData.append('description', '2025年初二单词库');
```

**响应**：
```json
{
  "success": true,
  "data": {
    "taskId": 1,
    "libraryType": "word",
    "fileName": "words.json",
    "itemCount": 500
  },
  "message": "导入任务已创建，正在处理中..."
}
```

#### GET /api/admin/library/import/tasks
获取导入任务列表

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "library_type": "word",
      "file_name": "words.json",
      "file_format": "json",
      "status": "success",
      "total_items": 500,
      "success_items": 498,
      "failed_items": 2,
      "success_rate": 99.6,
      "duration_seconds": 5.2,
      "created_at": "2025-01-09T10:00:00.000Z"
    }
  ]
}
```

---

## 📖 使用示例

### 示例1：导入单词库

#### 步骤1：准备 JSON 文件

**words.json**:
```json
[
  {
    "word": "abandon",
    "meaning": "放弃；抛弃",
    "phonetic": "/əˈbændən/",
    "example": "He abandoned his car in the snow.",
    "category": "verb",
    "difficulty": "intermediate"
  },
  {
    "word": "ability",
    "meaning": "能力；才能",
    "phonetic": "/əˈbɪləti/",
    "example": "She has the ability to solve complex problems.",
    "category": "noun",
    "difficulty": "easy"
  }
]
```

#### 步骤2：使用管理界面导入

1. 访问 `/admin/library`
2. 点击"导入题库"
3. 选择题库类型：单词库
4. 输入版本号：`1.0.0`
5. 输入描述：`2025年初二单词库`
6. 选择文件：`words.json`
7. 点击"开始导入"

#### 步骤3：查看导入进度

1. 切换到"导入记录"标签页
2. 查看任务状态
3. 等待导入完成

#### 步骤4：激活版本

1. 返回"题库版本"标签页
2. 找到版本 `1.0.0`
3. 点击"激活"按钮
4. 版本激活成功，所有用户开始使用新题库

### 示例2：使用 API 导入

```bash
curl -X POST https://your-app.netlify.app/api/admin/library/import \
  -H "Cookie: auth_token=your-token" \
  -F "file=@words.json" \
  -F "libraryType=word" \
  -F "version=1.0.0" \
  -F "description=2025年初二单词库"
```

### 示例3：导出版本

```bash
curl -X GET https://your-app.netlify.app/api/admin/library/versions/1/export \
  -H "Cookie: auth_token=your-token" \
  -o words-1.0.0.json
```

---

## 🔄 工作流程

### 完整的题库更新流程

```
1. 准备数据
   ↓
2. 创建或整理 JSON/CSV 文件
   ↓
3. 登录管理后台
   ↓
4. 导入文件到题库
   ↓
5. 查看导入结果
   ↓
6. 激活新版本
   ↓
7. 所有用户自动使用新题库
```

### 版本回滚流程

```
1. 导出当前版本（备份）
   ↓
2. 创建新版本
   ↓
3. 导入旧版本的数据
   ↓
4. 激活回滚版本
   ↓
5. 用户开始使用旧题库
```

---

## 📊 统计信息

### 版本统计

查看每个版本的题目数量：
```sql
SELECT 
  library_type,
  version,
  is_active,
  item_count,
  created_at
FROM library_version_list
ORDER BY library_type, created_at DESC;
```

### 导入统计

查看导入任务成功率：
```sql
SELECT 
  library_type,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_tasks,
  ROUND(AVG(success_rate), 2) as avg_success_rate,
  ROUND(AVG(duration_seconds), 2) as avg_duration
FROM import_task_list
GROUP BY library_type;
```

---

## ⚠️ 注意事项

### 1. 版本管理

- **唯一激活版本**: 同一题库类型只能有一个激活版本
- **激活新版本**: 会自动取消其他版本的激活状态
- **删除限制**: 不能删除激活的版本

### 2. 导入规则

- **必填字段**: 确保所有必填字段都已填写
- **数据验证**: 系统会自动验证数据格式和重复性
- **异步处理**: 大文件采用异步处理，避免超时

### 3. 文件大小

- **推荐大小**: 单次导入不超过 10MB
- **大文件处理**: 如需导入大量数据，建议分批导入

### 4. 用户影响

- **实时生效**: 激活新版本后，用户立即使用新题库
- **无需通知**: 系统自动切换，无需通知用户
- **数据隔离**: 用户的错题和学习进度不受影响

---

## 🎯 最佳实践

### 1. 版本命名

使用语义化版本号：
- `1.0.0` - 首次发布
- `1.1.0` - 功能更新
- `1.0.1` - 错误修复
- `2.0.0` - 重大更新

### 2. 导入前准备

1. 验证文件格式
2. 检查必填字段
3. 去除重复数据
4. 准备版本描述

### 3. 分批导入

- 小批量测试
- 检查导入结果
- 确认无误后全量导入

### 4. 备份数据

- 更新前导出当前版本
- 保留历史版本
- 定期备份

---

## 🐛 常见问题

### Q1: 导入失败怎么办？

**A**: 检查以下内容：
1. 文件格式是否正确
2. 必填字段是否完整
3. JSON 语法是否正确
4. CSV 分隔符是否正确

查看导入记录了解详细错误信息。

### Q2: 如何处理重复数据？

**A**:
1. 导入前去除文件中的重复数据
2. 或使用不同的版本号导入

### Q3: 导入后数据没有显示？

**A**:
1. 检查版本是否已激活
2. 刷新页面
3. 查看导入记录确认导入成功

### Q4: 如何回滚到旧版本？

**A**:
1. 导出旧版本数据
2. 创建新版本
3. 导入旧数据
4. 激活新版本

### Q5: 导入需要多长时间？

**A**:
- 1000 条题目：约 5-10 秒
- 5000 条题目：约 20-30 秒
- 10000 条题目：约 1-2 分钟

---

## 📚 相关文档

- [题库导入格式说明](./LIBRARY_IMPORT_GUIDE.md)
- [多用户角色系统部署指南](./MULTI_USER_DEPLOYMENT_GUIDE.md)
- [Gemini 智能分析部署指南](./GEMINI_DEPLOYMENT_GUIDE.md)

---

题库管理系统已全部实现，可以立即部署！🎉
