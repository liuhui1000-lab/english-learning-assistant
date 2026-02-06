# 国内部署简化方案（最简版）

## 🎯 目标
- ✅ 国内网络流畅访问
- ✅ 最少配置步骤
- ✅ 50用户以下低成本

---

## 📦 极简架构

```
前端 → Gitee Pages（免费）
后端 → 阿里云函数计算（免费额度）
数据库 → 腾讯云 PostgreSQL（免费）
AI服务 → 豆包大模型（按量付费）
```

---

## 🚀 3步快速部署

### 第1步：部署前端到 Gitee Pages（5分钟）

#### 1.1 创建 Gitee 仓库

1. 访问 https://gitee.com 并注册账号
2. 创建新仓库：`english-learning-frontend`
3. 上传代码：
   ```bash
   # 初始化 git 仓库
   git init
   git add .
   git commit -m "Initial commit"

   # 添加 Gitee 远程仓库
   git remote add origin https://gitee.com/your-username/english-learning-frontend.git
   git push -u origin master
   ```

#### 1.2 开启 Gitee Pages

1. 进入仓库 → "服务" → "Gitee Pages"
2. 点击 "启用"
3. 部署分支：`master`
4. 部署目录：`out/`（静态导出目录）

#### 1.3 构建静态文件

修改 `package.json`：

```json
{
  "scripts": {
    "build:static": "cp next.config.static.js next.config.js && next build",
    "export": "next export"
  }
}
```

执行构建：

```bash
# 安装依赖
pnpm install

# 构建静态文件
pnpm run build:static
```

#### 1.4 提交静态文件

```bash
git add out/
git commit -m "Add static build"
git push
```

Gitee 会自动部署，访问地址：
```
https://your-username.gitee.io/english-learning-frontend
```

---

### 第2步：部署后端到阿里云函数计算（10分钟）

#### 2.1 安装 Serverless Devs

```bash
npm install -g @serverless-devs/s
```

#### 2.2 初始化函数项目

```bash
# 在项目根目录创建函数目录
mkdir api-server
cd api-server

# 初始化 Express 项目
s init fc-express
```

#### 2.3 配置函数

编辑 `s.yaml`：

```yaml
edition: 3.0.0
name: english-learning-api
access: default

resources:
  english-learning-api:
    component: fc
    props:
      region: cn-shanghai
      service:
        name: english-learning-service
        internetAccess: true
      function:
        name: api-handler
        runtime: nodejs18
        code: ./
        handler: index.handler
        memorySize: 512
        timeout: 60
        environmentVariables:
          DATABASE_URL: ${env.DATABASE_URL}
          DOUBAO_API_KEY: ${env.DOUBAO_API_KEY}
      triggers:
        - name: httpTrigger
          type: http
          config:
            authType: anonymous
            methods:
              - GET
              - POST
```

#### 2.4 创建 Express API

编辑 `index.js`：

```javascript
const express = require('express');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

// 导入 API 路由（需要迁移）
// 暂时创建示例路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 词转练习批改
app.post('/api/transformation/grade', async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;
    // TODO: 实现批改逻辑
    res.json({ success: true, result: { isCorrect: true, explanation: '...' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 语法练习批改
app.post('/api/grammar/practice/batch', async (req, res) => {
  try {
    const { questions, answers } = req.body;
    // TODO: 实现批改逻辑
    res.json({ success: true, results: [], score: 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
```

#### 2.5 安装依赖

```bash
cd api-server
npm install express pg drizzle-orm cors
```

#### 2.6 配置环境变量

创建 `.env`：

```bash
DATABASE_URL="postgresql://user:password@postgres.tencentcloudapi.com:5432/english_learning"
DOUBAO_API_KEY="sk-xxxxxxxxxxxxxx"
```

#### 2.7 部署

```bash
# 配置阿里云密钥
s configure

# 部署
s deploy
```

部署成功后会返回 API 地址，格式类似：
```
https://xxxxx.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/english-learning-service/api-handler
```

---

### 第3步：创建腾讯云 PostgreSQL（5分钟）

#### 3.1 创建实例

1. 访问 https://console.cloud.tencent.com/postgres
2. 点击 "新建实例"
3. 选择 "基础版"（免费）
4. 配置：
   - 地域：上海
   - 数据库：`english_learning`
   - 用户名：`english_learning_user`
   - 密码：设置强密码（保存！）

#### 3.2 运行数据库迁移

**方法1：使用腾讯云控制台**

1. 进入实例 → 数据库管理
2. 点击 "登录"
3. 在 SQL 编辑器中执行：
   - `scripts/schema.sql`
   - `scripts/seed-data.sql`
   - `scripts/database-optimization.sql`

**方法2：使用 DBeaver（推荐）**

1. 下载 DBeaver（免费数据库工具）
2. 连接到腾讯云 PostgreSQL
3. 执行 SQL 脚本

#### 3.3 获取连接字符串

连接字符串格式：
```
postgresql://english_learning_user:password@postgres.tencentcloudapi.com:5432/english_learning
```

---

## 🔗 连接前后端

### 修改前端 API 地址

创建 `src/config/api.ts`：

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.com';

export const getApiUrl = (path: string) => {
  return `${API_BASE_URL}${path}`;
};
```

### 构建并重新部署

```bash
# 设置环境变量
export NEXT_PUBLIC_API_URL="https://your-api-url.com"

# 重新构建
pnpm run build:static

# 提交到 Gitee
git add out/
git commit -m "Update API URL"
git push
```

Gitee 会自动重新部署。

---

## 🧪 测试部署

### 1. 测试前端

访问：
```
https://your-username.gitee.io/english-learning-frontend
```

### 2. 测试后端 API

访问：
```
https://your-api-url.com/api/health
```

应该返回：
```json
{ "status": "ok", "timestamp": "..." }
```

### 3. 测试数据库连接

在阿里云函数计算控制台查看日志，确认无连接错误。

---

## 💰 成本（50用户）

| 服务 | 费用 |
|------|------|
| Gitee Pages | 免费 |
| 阿里云函数计算 | 免费（5万次调用/月） |
| 腾讯云 PostgreSQL | 免费（50GB） |
| 豆包大模型 | ¥10-30/月 |

**总计**：**¥10-30/月**

---

## 📝 总结

### 优点
- ✅ 完全免费（除了AI调用）
- ✅ 国内访问速度快
- ✅ 无需域名备案
- ✅ 配置简单（3步搞定）

### 缺点
- ⚠️ Gitee Pages 更新需要手动触发
- ⚠️ 函数计算有冷启动延迟（~500ms）

### 替代方案

如果 Gitee Pages 不稳定，可以改用：
- **Vercel + 阿里云 CDN**（需要备案）
- **Netlify + 阿里云 CDN**（需要备案）
- **阿里云静态网站托管**（推荐）

---

## 🆘 常见问题

### Q1: Gitee Pages 更新慢怎么办？

**A**: Gitee Pages 更新需要手动触发，进入仓库 → 服务 → Gitee Pages → "更新"。

### Q2: 函数计算冷启动慢怎么办？

**A:** 配置预留实例，在 `s.yaml` 中添加：
```yaml
function:
  instanceConcurrency: 10
  instanceType: e1
  instances:
    - 1  # 预留1个实例
```

### Q3: 数据库连接失败？

**A:** 检查：
1. PostgreSQL 白名单是否包含阿里云函数计算的 IP
2. 连接字符串是否正确
3. 数据库实例是否运行

---

## ✅ 部署检查清单

- [ ] 注册 Gitee、阿里云、腾讯云账号
- [ ] 创建 Gitee 仓库并上传代码
- [ ] 开启 Gitee Pages
- [ ] 构建静态文件
- [ ] 创建阿里云函数计算
- [ ] 部署 Express API
- [ ] 创建腾讯云 PostgreSQL
- [ ] 运行数据库迁移
- [ ] 配置前端 API 地址
- [ ] 测试前端访问
- [ ] 测试后端 API
- [ ] 测试数据库连接
- [ ] 测试完整功能

完成！🎉
