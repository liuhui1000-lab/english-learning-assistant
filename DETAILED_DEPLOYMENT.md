# 详细部署步骤 - Netlify + Neon

## 📋 准备工作

### 步骤 0：将代码推送到 GitHub

#### 0.1 初始化 Git 仓库（如果还没有）

```bash
# 在项目根目录执行
cd /workspace/projects

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: 初中英语学习助手"
```

#### 0.2 创建 GitHub 仓库

1. 访问 [GitHub](https://github.com/) 并登录
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `english-learning-assistant`（或任意名称）
   - **Description**: 初中英语学习助手
   - 选择 "Public" 或 "Private"（推荐 Private）
4. 点击 "Create repository"
5. GitHub 会显示命令，复制并执行类似下面的命令：

```bash
# 关联远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/english-learning-assistant.git

# 推送代码到 GitHub
git branch -M main
git push -u origin main
```

**注意**：
- 如果推送时提示需要登录，GitHub 会弹出浏览器窗口让你授权
- 需要创建 Personal Access Token（如果使用密码认证已被禁用）

#### 0.3 验证代码已推送到 GitHub

访问你的 GitHub 仓库页面，应该能看到所有文件：
- `src/`
- `package.json`
- `netlify.toml`
- 等等

---

## 🚀 详细部署步骤

### 步骤 1：创建 Neon 数据库

#### 1.1 注册 Neon 账号
1. 访问 [Neon Console](https://console.neon.tech/)
2. 点击 "Sign up" 注册新账号
3. 可以使用 GitHub 账号直接登录

#### 1.2 创建新项目
1. 登录后，点击 "New Project"
2. 填写项目信息：
   - **Project name**: `english-learning-assistant`
   - **Region**: 选择离你最近的区域（如：ap-northeast-1 东京）
3. 点击 "Create Project"

#### 1.3 复制连接字符串
1. 项目创建后，会显示 "Connection Details" 页面
2. 找到 "Connection string"，格式类似：
   ```
   postgresql://user_abc123:password_xyz@ep-abc123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. 点击复制按钮，保存到记事本，稍后会用到

#### 1.4 初始化数据库表
1. 在 Neon Console，点击左侧菜单的 "SQL Editor"
2. 点击 "New Query"
3. 复制下面的完整 SQL 脚本并粘贴：

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

-- 创建用户登录日志表（ip_address 使用 text 类型避免长度限制）
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

-- 创建其他必要表（如果有）
CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  pronunciation TEXT,
  meaning TEXT,
  example_sentence TEXT,
  difficulty INTEGER DEFAULT 1,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grammar_points (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  explanation TEXT,
  examples TEXT,
  difficulty INTEGER DEFAULT 1,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reading_passages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

4. 点击 "Run" 执行 SQL 脚本
5. 确认所有表都创建成功（不会有错误提示）

---

### 步骤 2：注册 Netlify 账号

1. 访问 [Netlify](https://www.netlify.com/)
2. 点击右上角 "Sign up"
3. 选择使用 GitHub 账号注册（推荐）
4. 授权 Netlify 访问你的 GitHub 账号

---

### 步骤 3：在 Netlify 中连接 GitHub 仓库

#### 3.1 授权 Netlify 访问 GitHub

如果显示 "No repositories found"，需要：

1. **刷新页面并重新授权**：
   - 退出 Netlify 并重新登录
   - 登录时确保授权 Netlify 访问 GitHub

2. **检查 GitHub 权限设置**：
   - 访问 [GitHub Applications Settings](https://github.com/settings/applications)
   - 在 "OAuth Apps" 中找到 Netlify
   - 点击 "Configure"
   - 确保 "Repository access" 设置正确：
     - 选择 "All repositories" 或
     - 选择 "Only select repositories" 并选择你的仓库

3. **刷新仓库列表**：
   - 在 Netlify 的 "New site from Git" 页面
   - 找到 "GitHub" 部分
   - 点击 "Configure" 或 "Update repo access"
   - 选择你的仓库，点击 "Save"

#### 3.2 选择仓库

1. 在 Netlify Dashboard，点击 "Add new site" -> "Import an existing project"
2. 点击 "GitHub" 图标
3. 现在应该能看到你的仓库列表
4. 找到并选择 `english-learning-assistant` 仓库
5. 点击 "Import site"

#### 3.3 配置构建设置

Netlify 会自动检测到 Next.js 项目，但仍需要确认：

**Build settings** 部分：
- **Branch to deploy**: `main`（或 `master`，取决于你的分支名）
- **Build command**: `pnpm run build`
- **Publish directory**: `.next`

如果这些字段是空的，手动输入：
- Build command: `pnpm run build`
- Publish directory: `.next`

点击 "Show advanced" 可选配置：
- **Build function directory**: `.netlify/functions`
- **Functions directory**: `.netlify/functions`

---

### 步骤 4：配置环境变量

1. 在 Site configuration 页面，向下滚动找到 "Environment variables"
2. 点击 "Add variable"
3. 逐个添加以下环境变量：

#### 必需变量：

| Name | Value | 说明 |
|------|-------|------|
| `DATABASE_URL` | 你从 Neon 复制的连接字符串 | 数据库连接 |
| `JWT_SECRET` | 生成一个随机字符串（至少32位） | JWT 密钥 |
| `NODE_ENV` | `production` | 环境类型 |
| `NEXT_PUBLIC_APP_NAME` | `初中英语学习助手` | 应用名称 |
| `NEXT_PUBLIC_APP_URL` | `https://your-site-name.netlify.app` | 应用 URL（稍后会替换） |

#### JWT_SECRET 生成方法：
访问任意在线随机字符串生成器，如：
- https://www.random.org/strings/
- 或者使用：`openssl rand -base64 32`（如果有 OpenSSL）

#### 可选变量（AI 服务）：

| Name | Value | 说明 |
|------|-------|------|
| `GEMINI_API_KEY` | 你的 Gemini API Key | 豆包生图 |
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API Key | DeepSeek |
| `KIMI_API_KEY` | 你的 Kimi API Key | Kimi |
| `OPENAI_API_KEY` | 你的 OpenAI API Key | OpenAI |
| `MINIMAX_API_KEY` | 你的 MiniMax API Key | MiniMax |
| `CLAUDE_API_KEY` | 你的 Claude API Key | Claude |

**注意**：这些 AI 密钥不是必需的，可以后续再配置。

4. 所有环境变量添加完成后，点击 "Deploy site"

---

### 步骤 5：等待部署完成

1. Netlify 会自动开始构建
2. 点击 "Deploys" 标签页查看进度
3. 构建过程通常需要 2-5 分钟

**如果构建失败**：
- 点击失败的构建，查看 "Build log"
- 常见问题：
  - 依赖安装失败：检查 `package.json`
  - 构建命令错误：确认是 `pnpm run build`
  - TypeScript 错误：查看具体错误信息

**如果构建成功**：
- 状态会显示 "Published"
- Netlify 会提供一个临时 URL，例如：`https://your-app-name-abc123.netlify.app`

---

### 步骤 6：更新应用 URL

1. 复制 Netlify 提供的 URL
2. 回到 "Site configuration" -> "Environment variables"
3. 找到 `NEXT_PUBLIC_APP_URL`
4. 将值更新为实际部署的 URL
5. 点击 "Save"
6. 点击 "Trigger deploy" -> "Deploy site" 重新部署

---

### 步骤 7：创建管理员账户

1. 部署成功后，访问：
   ```
   https://your-app-name.netlify.app/api/setup/create-admin
   ```
2. 应该会看到：
   ```json
   {
     "success": true,
     "message": "管理员账户创建成功"
   }
   ```
3. 默认管理员账户：
   - 用户名：`admin`
   - 密码：`admin123`

---

### 步骤 8：访问应用并登录

1. 访问你的应用：
   ```
   https://your-app-name.netlify.app
   ```
2. 会自动跳转到登录页
3. 输入：
   - 用户名：`admin`
   - 密码：`admin123`
4. 点击"登录"
5. 登录成功后会跳转到 Dashboard

---

## 🔧 替代方案：使用 Netlify CLI 部署（不需要 Git）

如果你不想使用 Git，可以使用 Netlify CLI 直接部署：

### 安装 Netlify CLI
```bash
npm install -g netlify-cli
```

### 登录 Netlify
```bash
netlify login
```

### 初始化部署
```bash
netlify init
```

### 手动部署
```bash
# 构建
pnpm run build

# 部署
netlify deploy --prod
```

按照提示操作即可完成部署。

---

## ❓ 常见问题

### Q1: GitHub 仓库列表为空

**解决方法**：
1. 确保已将代码推送到 GitHub
2. 在 Netlify 中重新授权 GitHub 访问权限
3. 检查 GitHub 的 OAuth 设置，确保 Netlify 有访问权限

### Q2: 构建失败

**解决方法**：
1. 查看构建日志，找到具体错误
2. 确认环境变量已正确配置
3. 检查 `package.json` 中的脚本是否正确

### Q3: 数据库连接失败

**解决方法**：
1. 确认 `DATABASE_URL` 格式正确
2. 确保包含 `?sslmode=require`
3. 在 Neon Console 检查连接池设置

### Q4: 登录失败

**解决方法**：
1. 确认已创建管理员账户
2. 检查用户名和密码是否正确
3. 查看浏览器控制台是否有错误

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 具体的错误信息
2. Netlify 构建日志
3. 浏览器控制台错误
4. 操作步骤截图

---

**祝部署顺利！** 🎉
