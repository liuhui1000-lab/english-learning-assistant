# 中国国内部署指南（国内网络访问）

## 🎯 部署目标
- ✅ 国内网络流畅访问（无需VPN）
- ✅ 50用户以下低成本运行
- ✅ 完整功能支持（AI、数据库、OCR）

---

## 📦 推荐架构

```
前端 → 阿里云静态网站托管
后端 → 阿里云函数计算 (Serverless)
数据库 → 腾讯云 PostgreSQL
AI服务 → 豆包大模型（火山引擎）
对象存储 → 阿里云 OSS
```

---

## 🔧 准备工作

### 1. 注册账号

| 服务 | 注册地址 | 用途 |
|------|---------|------|
| **阿里云** | https://www.aliyun.com | 前端托管 + 函数计算 + OSS |
| **腾讯云** | https://cloud.tencent.com | PostgreSQL 数据库 |
| **火山引擎** | https://www.volcengine.com | 豆包大模型 API |

### 2. 环境变量准备

创建 `.env.production` 文件：

```bash
# 数据库连接（腾讯云 PostgreSQL）
DATABASE_URL="postgresql://tencentcloud_user:password@postgres.tencentcloudapi.com:5432/english_learning"

# 豆包大模型
DOUBAO_API_KEY="sk-xxxxxxxxxxxxxx"

# 阿里云 OSS（可选）
OSS_ACCESS_KEY_ID="LTAI5txxxxxxxxxx"
OSS_ACCESS_KEY_SECRET="xxxxxxxxxxxxxx"
OSS_BUCKET="english-learning-assets"
OSS_ENDPOINT="oss-cn-shanghai.aliyuncs.com"
```

---

## 📋 部署步骤

## 第一步：配置 Next.js 静态导出

### 1. 修改 Next.js 配置

使用静态导出配置文件：

```bash
# 使用静态导出配置
cp next.config.static.js next.config.js
```

### 2. 构建静态文件

```bash
# 安装依赖
pnpm install

# 构建静态导出
pnpm run build
```

构建完成后，`out/` 目录包含所有静态文件。

---

## 第二步：部署前端到阿里云静态网站托管

### 1. 登录阿里云控制台

访问：https://oss.console.aliyun.com

### 2. 创建 Bucket

1. 点击 "创建 Bucket"
2. 设置：
   - Bucket 名称：`english-learning-frontend`
   - 地域：华东1（杭州）或 华东2（上海）
   - 存储类型：标准存储
   - 读写权限：公共读

### 3. 上传静态文件

**方法1：阿里云控制台上传**
1. 进入 Bucket → 文件管理
2. 上传 `out/` 目录下的所有文件

**方法2：使用阿里云CLI（推荐）**

安装阿里云CLI：
```bash
# macOS
brew install aliyun-cli

# Linux
wget https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz
tar xzvf aliyun-cli-linux-latest-amd64.tgz
sudo mv aliyun /usr/local/bin/
```

配置访问密钥：
```bash
aliyun configure
# 输入 AccessKey ID 和 Secret
```

上传文件：
```bash
# 上传静态文件
aliyun oss cp out/ oss://english-learning-frontend/ -r -f

# 设置静态网站托管
aliyun oss website put english-learning-frontend
```

### 4. 配置静态网站

1. 进入 Bucket → 数据管理 → 静态页面
2. 点击 "设置"
3. 设置：
   - 默认首页：`index.html`
   - 默认404页：`404.html`
4. 点击 "确定"

### 5. 获取访问地址

访问地址格式：
```
https://english-learning-frontend.oss-cn-shanghai.aliyuncs.com
```

---

## 第三步：部署后端API到阿里云函数计算

### 1. 准备 API 路由代码

由于静态导出不支持 Next.js API Routes，需要单独部署 API。

**选项A：使用 Express + 函数计算（推荐）**

创建 `server.js`：

```javascript
const express = require('express');
const { drizzle } = require('drizzle-orm/node-postgres');
const pkg = require('pg');
const { Pool } = pkg;
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

// 导入 API 路由
const aiRouter = require('./src/app/api/ai/chat/route');
const grammarRouter = require('./src/app/api/grammar/practice/batch/route');

// 注册路由
app.use('/api/ai/chat', aiRouter);
app.use('/api/grammar/practice/batch', grammarRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 导出函数
module.exports = app;
```

**选项B：直接部署 Next.js API Routes（更简单）**

阿里云函数计算支持直接部署 Next.js 项目。

### 2. 创建函数

1. 登录阿里云函数计算控制台
   访问：https://fc.console.aliyun.com

2. 创建服务：
   - 服务名称：`english-learning-backend`
   - 地域：华东1（杭州）

3. 创建函数：
   - 函数名称：`api-server`
   - 运行时：Node.js 18
   - 请求处理程序：`index.handler`
   - 代码上传方式：使用示例代码

### 3. 部署代码

**使用 Serverless Devs（推荐）**

安装 Serverless Devs：
```bash
npm install -g @serverless-devs/s
```

初始化项目：
```bash
s init fc-express
```

配置 `s.yaml`：

```yaml
edition: 3.0.0
name: english-learning-backend
access: default

resources:
  english-learning-backend:
    component: fc
    props:
      region: cn-shanghai
      service:
        name: english-learning-service
        internetAccess: true
      function:
        name: api-server
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
              - PUT
              - DELETE
```

部署：
```bash
s deploy
```

### 4. 配置自定义域名

1. 函数计算 → 服务 → 域名管理
2. 添加自定义域名：
   - 域名：`api.your-domain.com`（需要备案）
   - 路由配置：`/` → `english-learning-service/api-server`

---

## 第四步：创建腾讯云 PostgreSQL 数据库

### 1. 创建 PostgreSQL 实例

1. 登录腾讯云控制台
   访问：https://console.cloud.tencent.com/postgres

2. 点击 "新建实例"
3. 设置：
   - 实例名称：`english-learning-db`
   - 地域：上海
   - 数据库引擎：PostgreSQL 14
   - 实例规格：2核 4GB（或使用基础版）
   - 存储容量：50GB
   - 网络：默认 VPC

4. 设置密码（保存好！）

### 2. 获取连接字符串

1. 进入实例 → 数据库管理
2. 创建数据库：`english_learning`
3. 创建用户：`english_learning_user`
4. 获取连接字符串：
   ```
   postgresql://english_learning_user:password@xxxxx.postgres.tencentcloudapi.com:5432/english_learning
   ```

### 3. 运行数据库迁移

**方法1：使用 pgAdmin**
1. 下载 pgAdmin（PostgreSQL 管理工具）
2. 连接到数据库
3. 执行 SQL 脚本：
   - `scripts/schema.sql`
   - `scripts/seed-data.sql`
   - `scripts/database-optimization.sql`

**方法2：使用 psql 命令行**

```bash
# 安装 psql
# macOS
brew install postgresql

# Ubuntu/Debian
apt-get install postgresql-client

# 连接数据库
psql "postgresql://english_learning_user:password@xxxxx.postgres.tencentcloudapi.com:5432/english_learning"

# 执行 SQL 文件
\i scripts/schema.sql
\i scripts/seed-data.sql
\i scripts/database-optimization.sql
```

---

## 第五步：获取豆包大模型 API Key

### 1. 注册火山引擎

访问：https://console.volcengine.com

### 2. 开通豆包大模型

1. 进入 "火山方舟" 控制台
2. 选择 "大模型推理"
3. 开通豆包大模型服务

### 3. 获取 API Key

1. 进入 API Key 管理
2. 创建 API Key
3. 复制 API Key（保存到环境变量）

---

## 🔗 前后端连接

### 修改前端 API 地址

由于前端是静态托管，后端是独立的函数计算，需要配置 API 地址。

创建 `src/config/api.ts`：

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xxxxx.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/english-learning-service/api-server';

export const getApiUrl = (path: string) => {
  return `${API_BASE_URL}${path}`;
};
```

在 `.env.production` 中设置：

```bash
NEXT_PUBLIC_API_URL="https://your-api-domain.com"
```

---

## 🚀 验证部署

### 1. 检查前端访问

访问前端地址：
```
https://english-learning-frontend.oss-cn-shanghai.aliyuncs.com
```

应该能看到首页。

### 2. 检查后端 API

访问健康检查接口：
```
https://your-api-domain.com/health
```

应该返回：
```json
{ "status": "ok" }
```

### 3. 检查数据库连接

在阿里云函数计算控制台查看日志，确保数据库连接成功。

---

## 💰 成本估算（50用户）

| 服务 | 免费额度 | 50用户使用量 | 实际成本 |
|------|---------|-------------|---------|
| 阿里云静态托管 | 5GB存储 + 5GB流量 | ~50MB | **免费** |
| 阿里云函数计算 | 100万次调用 + 40万CU/s | ~5万次调用 | **免费** |
| 腾讯云 PostgreSQL | 基础版免费额度 | ~400MB | **免费**（或¥10/月）|
| 阿里云 OSS | 5GB存储 + 5GB流量 | ~100MB | **免费** |
| 豆包大模型 | 按调用付费 | ~10万tokens | **¥10-30/月** |

**总计**：**¥10-30/月**（主要是AI调用费用）

---

## 📝 注意事项

### 1. 域名备案（可选）

如果需要使用自定义域名：
- 国内服务器必须备案
- 备案需要提供营业执照或身份证
- 备案时间：1-2周

### 2. HTTPS 证书

- 阿里云免费提供 SSL 证书
- 自动配置 HTTPS

### 3. 性能优化

- 前端使用 CDN 加速
- 数据库使用读写分离（高并发时）
- 函数计算配置预留实例（冷启动优化）

### 4. 监控与日志

- 阿里云函数计算查看执行日志
- 腾讯云 PostgreSQL 查看慢查询
- 阿里云 OSS 查看访问日志

---

## 🔄 更新部署

### 更新前端

```bash
# 重新构建
pnpm run build

# 上传到阿里云 OSS
aliyun oss cp out/ oss://english-learning-frontend/ -r -f
```

### 更新后端

```bash
# 重新部署函数计算
s deploy
```

---

## 🆘 故障排查

### 前端访问慢
- 检查 OSS 地域是否选择上海/杭州
- 开启 CDN 加速

### 后端 API 失败
- 检查函数计算日志
- 检查环境变量配置
- 检查数据库连接

### 数据库连接失败
- 检查 PostgreSQL 白名单配置
- 检查连接字符串是否正确

---

## 📞 技术支持

- 阿里云文档：https://help.aliyun.com
- 腾讯云文档：https://cloud.tencent.com/document
- 火山引擎文档：https://www.volcengine.com/docs

---

## ✅ 部署检查清单

- [ ] 注册阿里云、腾讯云、火山引擎账号
- [ ] 配置环境变量
- [ ] 构建静态前端文件
- [ ] 上传到阿里云 OSS
- [ ] 配置静态网站托管
- [ ] 创建腾讯云 PostgreSQL 实例
- [ ] 运行数据库迁移脚本
- [ ] 获取豆包 API Key
- [ ] 部署后端到函数计算
- [ ] 配置前后端连接
- [ ] 验证前端访问
- [ ] 验证后端 API
- [ ] 验证数据库连接
- [ ] 测试完整功能

部署完成！🎉
