# 多用户角色系统部署指南

## 📋 功能概述

本项目已实现完整的多用户角色管理系统，支持：

### 角色类型
1. **管理员（admin）**
   - 可以创建、修改、删除普通用户
   - 可以重置用户密码
   - 可以查看所有用户的学习进度和错题统计
   - 可以访问所有管理功能

2. **普通用户（user）**
   - 独立的学习进度
   - 独立的错题库
   - 独立的统计数据
   - 数据完全隔离，互不影响

### 核心功能
- ✅ 用户登录/登出
- ✅ 密码加密存储（bcrypt）
- ✅ JWT token认证
- ✅ 权限验证
- ✅ 用户管理（CRUD）
- ✅ 会话管理
- ✅ 登录日志记录
- ✅ 数据隔离

---

## 🚀 部署步骤

### 第1步：运行数据库迁移

连接到 Neon 数据库，执行以下SQL文件：

```bash
psql "postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require" -f scripts/migrate-multi-user.sql
```

或在 Neon SQL Editor 中直接执行 `scripts/migrate-multi-user.sql`。

**迁移内容**：
- 添加用户角色和认证字段
- 创建用户会话表
- 创建用户登录日志表
- 创建视图（活跃用户、学习进度）
- 创建触发器（自动更新字段）
- 创建默认管理员账户

### 第2步：配置环境变量

在 Netlify 控制台添加新的环境变量：

```bash
# JWT 密钥（必须）
JWT_SECRET=your-random-jwt-secret-key

# 其他已有变量
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-random-secret-key
```

**生成 JWT_SECRET**：
```bash
openssl rand -base64 32
```

### 第3步：登录系统

1. 访问登录页面：`https://your-app.netlify.app/login`
2. 使用默认管理员账户登录：
   - 用户名：`admin`
   - 密码：`admin123`

### 第4步：修改管理员密码

⚠️ **重要：首次登录后立即修改密码！**

1. 登录后访问：`https://your-app.netlify.app/admin/users`
2. 找到管理员账户，点击"重置密码"图标
3. 设置新密码（至少6位）

### 第5步：创建普通用户

在管理员用户管理页面：

1. 点击"创建用户"按钮
2. 填写用户信息：
   - 用户名
   - 邮箱
   - 密码
   - 姓名（可选）
   - 角色：选择"普通用户"
3. 点击"创建用户"

---

## 📁 数据库结构

### 核心表

#### 1. users（用户表）
```sql
- id: 用户ID（主键）
- username: 用户名
- email: 邮箱（唯一）
- password_hash: 密码哈希
- full_name: 姓名
- role: 角色（admin | user）
- is_active: 是否激活
- last_login_at: 最后登录时间
- created_at: 创建时间
- updated_at: 更新时间
```

#### 2. user_sessions（会话表）
```sql
- id: 会话ID
- user_id: 用户ID（外键）
- token: 认证token（唯一）
- expires_at: 过期时间
- created_at: 创建时间
```

#### 3. user_login_logs（登录日志表）
```sql
- id: 日志ID
- user_id: 用户ID（外键）
- ip_address: IP地址
- user_agent: 用户代理
- login_at: 登录时间
- success: 是否成功
- failure_reason: 失败原因
```

### 视图

#### 1. active_users（活跃用户视图）
显示所有活跃用户及其学习统计数据。

#### 2. user_learning_progress（学习进度视图）
显示用户的学习进度统计：
- 掌握的单词数
- 语法错题数
- 词转错题数
- 掌握的固定搭配数
- 完成的阅读理解数

---

## 🔐 API 接口

### 认证相关

#### POST /api/auth/login
用户登录

**请求体**：
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "admin",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "管理员",
    "role": "admin",
    "lastLoginAt": "2025-01-09T10:00:00.000Z"
  },
  "message": "登录成功"
}
```

#### POST /api/auth/logout
用户登出

**响应**：
```json
{
  "success": true,
  "message": "登出成功"
}
```

#### GET /api/auth/me
获取当前用户信息

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "username": "student1",
    "email": "student1@example.com",
    "fullName": "张三",
    "role": "user",
    "is_active": true,
    "last_login_at": "2025-01-09T10:00:00.000Z",
    "stats": {
      "total_count": 25,
      "knowledge_points": { "一般现在时": 5, "过去进行时": 3 },
      "difficulties": { "easy": 10, "intermediate": 15 },
      "sources": { "practice": 20, "upload": 5 }
    },
    "progress": {
      "mastered_words": 150,
      "total_mistakes": 25,
      "mistakes_this_week": 5
    }
  }
}
```

### 管理员相关

#### GET /api/admin/users
获取用户列表

**查询参数**：
- `role`: 角色筛选（admin | user）
- `isActive`: 状态筛选（true | false）
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "user123",
      "username": "student1",
      "email": "student1@example.com",
      "full_name": "张三",
      "role": "user",
      "is_active": true,
      "last_login_at": "2025-01-09T10:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z",
      "stats": {
        "total_count": 25,
        "knowledge_points": { "一般现在时": 5 },
        "difficulties": { "easy": 10, "intermediate": 15 },
        "sources": { "practice": 20, "upload": 5 }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### POST /api/admin/users
创建用户

**请求体**：
```json
{
  "username": "student2",
  "email": "student2@example.com",
  "password": "password123",
  "fullName": "李四",
  "role": "user"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user456",
    "username": "student2",
    "email": "student2@example.com",
    "full_name": "李四",
    "role": "user",
    "is_active": true,
    "created_at": "2025-01-09T10:00:00.000Z"
  },
  "message": "用户创建成功"
}
```

#### GET /api/admin/users/:id
获取用户详情

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "username": "student1",
    "email": "student1@example.com",
    "full_name": "张三",
    "role": "user",
    "is_active": true,
    "last_login_at": "2025-01-09T10:00:00.000Z",
    "created_at": "2025-01-01T00:00:00.000Z",
    "stats": { ... },
    "analysis": { ... },
    "loginLogs": [ ... ],
    "mistakesByCategory": [ ... ]
  }
}
```

#### PUT /api/admin/users/:id
修改用户

**请求体**：
```json
{
  "email": "newemail@example.com",
  "fullName": "新姓名",
  "role": "user",
  "isActive": true
}
```

#### DELETE /api/admin/users/:id
删除用户

**注意**：会级联删除用户的所有相关数据（错题、统计、进度等）。

#### POST /api/admin/users/:id/reset-password
重置用户密码

**请求体**：
```json
{
  "newPassword": "newpassword123"
}
```

---

## 🔍 数据隔离机制

### 用户数据隔离规则

1. **错题数据**
   - 每个错题记录都有 `user_id` 字段
   - 查询时自动过滤：`WHERE user_id = current_user_id`

2. **学习进度**
   - 单词进度表：`user_word_progress.user_id`
   - 词转进度表：`user_transformation_progress.user_id`
   - 固定搭配进度表：`user_phrase_progress.user_id`
   - 阅读进度表：`user_reading_progress.user_id`

3. **统计数据**
   - 实时统计：`user_mistake_stats.user_id`
   - 深度分析：`user_mistake_analysis.user_id`

4. **权限控制**
   - 管理员可以查看所有用户的数据
   - 普通用户只能访问自己的数据
   - 使用 `checkPermission` 和 `checkOwnership` 函数验证

---

## 🛡️ 安全措施

### 1. 密码安全
- 使用 bcrypt 加密，salt rounds = 10
- 密码长度最少 6 位
- 密码哈希存储在数据库，不可逆

### 2. Token 认证
- JWT token 有效期 7 天
- Token 存储在 httpOnly cookie
- 使用 HMAC-SHA256 签名

### 3. 登录保护
- 记录所有登录尝试（成功/失败）
- 失败原因记录（账户禁用、密码错误等）
- 记录 IP 地址和 User-Agent

### 4. 权限验证
- 所有 API 都需要验证用户身份
- 管理功能需要 admin 角色
- 数据访问需要验证所有权

### 5. 会话管理
- 支持 Token 过期
- 支持登出清除会话
- 可扩展支持多设备登录

---

## 📊 初始学习数据

### 共享题库
所有普通用户共享以下初始学习数据：

1. **单词库**
   - 269组词转练习
   - 995道语法练习题
   - 基础词汇和高级词汇

2. **固定搭配**
   - 常用动词短语
   - 介词搭配
   - 易混淆搭配对比

3. **语法知识点**
   - 时态（一般现在时、过去进行时等）
   - 词性转换
   - 从句

### 独立数据
每个用户独立的数据：

1. **学习进度**
   - 掌握的单词
   - 完成的练习
   - 复习计划

2. **错题库**
   - 个人错题记录
   - 错题统计
   - 薄弱点分析

3. **统计数据**
   - 学习时长
   - 正确率
   - 进步趋势

---

## 🧪 测试多用户功能

### 测试步骤

#### 1. 测试管理员登录
```bash
curl -X POST https://your-app.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### 2. 测试创建用户
```bash
curl -X POST https://your-app.netlify.app/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=your-token" \
  -d '{
    "username":"student1",
    "email":"student1@example.com",
    "password":"password123",
    "fullName":"测试学生",
    "role":"user"
  }'
```

#### 3. 测试数据隔离
```bash
# 用户1添加错题
curl -X POST https://your-app.netlify.app/api/mistakes \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=user1-token" \
  -d '{...}'

# 用户2查看错题（应该看不到用户1的错题）
curl https://your-app.netlify.app/api/mistakes \
  -H "Cookie: auth_token=user2-token"
```

#### 4. 测试权限控制
```bash
# 普通用户尝试访问管理员接口（应该返回401）
curl https://your-app.netlify.app/api/admin/users \
  -H "Cookie: auth_token=user-token"
```

---

## ⚠️ 常见问题

### Q1: 忘记管理员密码怎么办？

**A**: 在数据库中直接重置：
```sql
-- 生成新密码哈希（密码：newpassword123）
UPDATE users 
SET password_hash = '$2b$10$...'  -- 使用bcrypt生成
WHERE username = 'admin';
```

### Q2: 如何查看用户登录日志？

**A**: 查询数据库：
```sql
SELECT * FROM user_login_logs 
WHERE user_id = 'user123' 
ORDER BY login_at DESC 
LIMIT 10;
```

### Q3: 如何禁用某个用户？

**A**: 使用管理员界面或API：
```bash
curl -X PUT https://your-app.netlify.app/api/admin/users/user123 \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=admin-token" \
  -d '{"isActive":false}'
```

### Q4: Token 过期后如何处理？

**A**: 当前实现需要重新登录。可以扩展实现刷新 token 功能。

### Q5: 如何清理过期的会话？

**A**: 运行数据库函数：
```sql
SELECT cleanup_expired_sessions();
```

---

## 🔄 后续优化建议

### 1. 功能增强
- [ ] 实现注册功能（目前只支持管理员创建用户）
- [ ] 实现忘记密码功能（邮件重置）
- [ ] 实现 Token 刷新机制
- [ ] 实现多设备登录管理

### 2. 安全增强
- [ ] 添加登录失败次数限制（防止暴力破解）
- [ ] 添加 IP 黑名单功能
- [ ] 实现 2FA 双因素认证

### 3. 用户体验
- [ ] 添加用户头像上传
- [ ] 添加个人资料编辑
- [ ] 添加学习统计图表

### 4. 管理功能
- [ ] 添加批量导入用户
- [ ] 添加用户角色权限细分
- [ ] 添加操作审计日志

---

部署完成后，多用户角色系统即可使用！🎉
