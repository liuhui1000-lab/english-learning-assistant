# 📝 推送到 GitHub 并部署到 Netlify - 超详细图文指南

## 🎯 你现在需要做什么

### 第一步：在 GitHub 创建仓库

1. **打开 GitHub**
   - 访问：https://github.com/
   - 如果没有账号，先注册

2. **创建新仓库**
   - 点击右上角的 **+** 按钮
   - 选择 **New repository**

3. **填写仓库信息**
   ```
   Repository name: english-learning-assistant
   Description: 初中英语学习助手
   ☑️ Public  或  ☑️ Private（建议 Private）
   ☐ Add a README file（不要勾选）
   ☐ Add .gitignore（不要勾选）
   ☐ Choose a license（不要勾选）
   ```
   - 点击 **Create repository** 按钮

4. **复制仓库 URL**
   - GitHub 会显示一个页面，找到类似这样的命令：
   ```
   …or push an existing repository from the command line
   git remote add origin https://github.com/你的用户名/english-learning-assistant.git
   git branch -M main
   git push -u origin main
   ```
   - **暂时不要执行这些命令**，先看下面的说明

---

### 第二步：配置 Git（如果还没配置）

**检查是否已配置 Git：**
```bash
git config --global user.name
git config --global user.email
```

**如果没有配置，执行：**
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

---

### 第三步：连接并推送到 GitHub

**在沙箱环境中执行以下命令：**

```bash
# 1. 进入项目目录
cd /workspace/projects

# 2. 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/english-learning-assistant.git

# 3. 确认分支名为 main
git branch -M main

# 4. 推送到 GitHub
git push -u origin main
```

**如果提示需要身份验证：**
- GitHub 会弹出浏览器窗口
- 登录你的 GitHub 账号
- 授权访问

**如果提示输入用户名和密码：**
- 用户名：输入你的 GitHub 用户名
- 密码：**不是 GitHub 登录密码**，而是 Personal Access Token
- 如何获取 Token：见下方说明

---

### 第四步：获取 GitHub Personal Access Token（如果需要）

**如果你的 GitHub 账号启用了 2FA（双因素认证）或密码认证已被禁用，需要使用 Token：**

1. **在浏览器中执行：**
   - 访问：https://github.com/settings/tokens
   - 点击 **Generate new token (classic)**
   - 填写信息：
     - Note: Netlify Deployment
     - Expiration: 30 days 或 No expiration
     - 勾选权限：**repo**（完整仓库访问权限）
   - 点击 **Generate token**
   - **复制生成的 Token（只显示一次！）**

2. **在沙箱中推送到 GitHub：**
   ```bash
   git push -u origin main
   ```
   - Username: 你的 GitHub 用户名
   - Password: 粘贴刚才复制的 Token

---

### 第五步：验证代码已推送到 GitHub

1. 在浏览器中访问你的 GitHub 仓库
2. 应该能看到所有文件：
   - `src/`
   - `package.json`
   - `netlify.toml`
   - `DETAILED_DEPLOYMENT.md`
   - 等等

如果能看到，恭喜！代码已成功推送到 GitHub！🎉

---

## 🚀 连接 Netlify

### 方法一：在 Netlify 网站上连接（推荐）

1. **登录 Netlify**
   - 访问：https://app.netlify.com/
   - 使用 GitHub 账号登录

2. **创建新站点**
   - 点击 **Add new site**
   - 选择 **Import an existing project**

3. **连接 GitHub**
   - 点击 **GitHub** 图标
   - **如果显示 "No repositories found"**：
     - 点击 **Configure** 或 **Update repo access**
     - 在弹出窗口中选择你的仓库
     - 或者选择 **All repositories**
     - 点击 **Install & Authorize**

4. **选择仓库**
   - 找到并点击 **english-learning-assistant**
   - 点击 **Import site**

5. **配置构建设置**
   ```
   Branch to deploy: main
   Build command: pnpm run build
   Publish directory: .next
   ```
   - 点击 **Show advanced**（可选）
   - 点击 **Deploy site**

---

### 方法二：使用 Netlify CLI（如果网站连接有问题）

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```
   - 浏览器会自动打开
   - 授权 Netlify 访问你的账号

3. **初始化项目**
   ```bash
   cd /workspace/projects
   netlify init
   ```
   - 选择：**Create & configure a new site**
   - 选择团队：**Your team**
   - 站点名称：**english-learning-assistant**
   - 构建命令：**pnpm run build**
   - 发布目录：**.next**

4. **手动部署**
   ```bash
   # 构建
   pnpm run build

   # 部署
   netlify deploy --prod
   ```

---

## 📝 配置环境变量（关键步骤）

### 方法一：在 Netlify 网站上配置

1. **访问站点设置**
   - 在 Netlify Dashboard 点击你的站点
   - 点击 **Site configuration**

2. **添加环境变量**
   - 向下滚动找到 **Environment variables**
   - 点击 **Add variable**

3. **逐个添加以下变量**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://user:password@host:port/db?sslmode=require` | 从 Neon 复制 |
| `JWT_SECRET` | `随机32位字符串` | 使用 https://www.random.org/strings/ |
| `NODE_ENV` | `production` | 固定值 |
| `NEXT_PUBLIC_APP_NAME` | `初中英语学习助手` | 固定值 |
| `NEXT_PUBLIC_APP_URL` | `https://your-site.netlify.app` | 部署后替换 |

4. **保存并重新部署**
   - 点击 **Save**
   - 点击 **Trigger deploy** -> **Deploy site**

---

## 🎯 快速参考

### 最简单的部署流程（假设已有 GitHub 仓库）

```bash
# 1. 连接远程仓库
cd /workspace/projects
git remote add origin https://github.com/YOUR_USERNAME/english-learning-assistant.git

# 2. 推送代码
git branch -M main
git push -u origin main

# 3. 在 Netlify 网站上：
#    - 登录 Netlify
#    - Add new site -> Import from GitHub
#    - 选择仓库
#    - 配置环境变量
#    - Deploy
```

---

## ❓ 常见问题

### Q: 提示 "No repositories found"
**A:** 需要授权 Netlify 访问你的 GitHub 仓库
1. 点击 "Configure" 或 "Update repo access"
2. 选择你的仓库或 "All repositories"
3. 点击 "Save"

### Q: Git push 提示需要密码
**A:** GitHub 不再支持密码认证，需要使用 Personal Access Token
1. 访问 https://github.com/settings/tokens
2. 生成新 Token
3. 使用 Token 作为密码

### Q: 构建失败
**A:** 检查以下几点：
1. 确认 Build command 是 `pnpm run build`
2. 确认 Publish directory 是 `.next`
3. 查看构建日志，找到具体错误
4. 确认环境变量已正确配置

### Q: 数据库连接失败
**A:** 检查：
1. `DATABASE_URL` 格式是否正确
2. 是否包含 `?sslmode=require`
3. Neon 数据库是否正常运行

---

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. 你在哪一步卡住了？
2. 具体的错误信息是什么？
3. 是否有截图？

---

**祝你部署顺利！** 🎉🚀
