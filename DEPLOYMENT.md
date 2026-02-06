# 部署指南：Netlify + Neon

## 🚀 快速部署到 Netlify + Neon

### 步骤 1：创建 Neon 数据库

1. 访问 [Neon Console](https://console.neon.tech/)
2. 登录或注册账号
3. 点击 "New Project" 创建新项目
4. 选择区域（推荐选择离你最近的区域）
5. 创建项目后，在 "Connection Details" 中复制 Connection String
6. Connection String 格式：
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### 步骤 2：初始化数据库表

1. 在 Neon Console 中，打开 "SQL Editor"
2. 执行以下 SQL 脚本：

```sql
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(token)
);

-- 创建用户登录日志表
CREATE TABLE IF NOT EXISTS user_login_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT
);

-- 创建错题统计表
CREATE TABLE IF NOT EXISTS user_mistake_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  total_mistakes INTEGER DEFAULT 0,
  corrected_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, subject)
);

-- 创建错题表
CREATE TABLE IF NOT EXISTS user_mistakes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  user_answer TEXT,
  explanation TEXT,
  subject TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  is_corrected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建管理员账户
INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
  'admin',
  'admin',
  '2710694@qq.com',
  '$2a$12$1nmZLiq19peqloaAeDMEle49eTnlUaL95rlW7gBTypuc75vGZmZjO', -- 需要使用 bcrypt 生成
  '管理员',
  'admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;
```

**注意**：管理员密码需要使用 bcrypt 生成。你可以：
- 使用在线 bcrypt 工具：https://bcrypt-generator.com/
- 或者稍后通过 API 创建（见下方）

### 步骤 3：配置 Netlify 环境变量

1. 访问 [Netlify Dashboard](https://app.netlify.com/)
2. 登录或注册账号
3. 点击 "Add new site" -> "Import an existing project"
4. 连接你的 Git 仓库（GitHub/GitLab/Bitbucket）
5. 在 "Build settings" 中配置：
   - **Build command**: `pnpm run build`
   - **Publish directory**: `.next`

6. 在 "Site settings" -> "Environment variables" 中添加：

```
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-jwt-secret-key-change-in-production
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=初中英语学习助手
NEXT_PUBLIC_APP_URL=https://your-app-name.netlify.app
```

7. （可选）添加 AI 服务 API 密钥：
```
GEMINI_API_KEY=your-gemini-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
KIMI_API_KEY=your-kimi-api-key
OPENAI_API_KEY=your-openai-api-key
MINIMAX_API_KEY=your-minimax-api-key
CLAUDE_API_KEY=your-claude-api-key
```

### 步骤 4：部署

1. 点击 "Deploy site"
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，Netlify 会提供一个 URL，例如：`https://your-app-name.netlify.app`

### 步骤 5：初始化管理员账户

部署成功后，访问以下 API 创建管理员账户：

```bash
curl -X POST https://your-app-name.netlify.app/api/setup/create-admin
```

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

### 步骤 6：验证部署

1. 访问你的应用：`https://your-app-name.netlify.app`
2. 使用管理员账户登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. 登录成功后会跳转到 Dashboard

## 🔧 本地开发

如果你想在本地开发，使用现有的 Neon 数据库：

1. 复制 `.env.example` 为 `.env.local`
2. 填入你的 Neon 数据库连接字符串
3. 运行开发服务器：
   ```bash
   pnpm install
   pnpm run dev
   ```
4. 访问 `http://localhost:5000`

## 📝 故障排除

### 问题 1：数据库连接失败

**症状**：登录时提示 "登录失败"

**解决方案**：
1. 检查 `DATABASE_URL` 环境变量是否正确
2. 确保使用 `sslmode=require`
3. 在 Neon Console 检查连接池设置

### 问题 2：构建失败

**症状**：Netlify 构建时出错

**解决方案**：
1. 确保 `package.json` 中的 `build` 脚本正确
2. 检查 `netlify.toml` 配置
3. 查看 Netlify 构建日志

### 问题 3：登录后跳转失败

**症状**：登录成功但无法跳转到 Dashboard

**解决方案**：
1. 检查 `NEXT_PUBLIC_APP_URL` 环境变量
2. 确保使用 HTTPS（Netlify 自动提供）
3. 检查浏览器控制台是否有错误

## 🎯 下一步

部署成功后，你可以：
1. 在 Dashboard 中创建题库
2. 上传单词、语法、阅读材料
3. 设置 AI 服务配置
4. 添加其他用户账户

---

**需要帮助？**
- 查看 [Netlify 文档](https://docs.netlify.com/)
- 查看 [Neon 文档](https://neon.tech/docs)
- 提交 Issue 获取支持
