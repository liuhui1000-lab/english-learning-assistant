# 多AI服务配置使用指南

## 📋 概述

本系统支持多个AI服务提供商（Gemini、DeepSeek、Kimi、OpenAI、MiniMax、Claude），管理员可以在管理界面轻松配置和切换不同的AI服务。

### 功能特点

- ✅ 支持多个AI服务提供商
- ✅ 可视化管理界面
- ✅ 一键激活/切换AI服务
- ✅ API密钥安全存储
- ✅ 优先级管理
- ✅ 自动故障切换

---

## 🎯 支持的AI服务

| 服务商 | 模型示例 | 免费额度 | 特点 |
|-------|---------|---------|------|
| Gemini (Google) | gemini-2.5-flash | 1500次/天 | 快速响应，支持多模态 |
| DeepSeek | deepseek-chat | 按量付费 | 性价比高，中文优秀 |
| Kimi (月之暗面) | moonshot-v1-8k | 按量付费 | 长文本处理 |
| OpenAI | gpt-4o-mini | 按量付费 | 综合能力强 |
| MiniMax | abab6.5s-chat | 按量付费 | 语音和多模态 |
| Claude (Anthropic) | claude-sonnet-4-20250514 | 按量付费 | 安全性高，代码能力强 |

---

## 🚀 快速开始

### 1. 运行数据库迁移

```bash
psql $DATABASE_URL -f scripts/migrate-ai-providers.sql
```

### 2. 访问管理页面

登录管理员账户，访问：
```
https://your-domain.com/admin/ai-providers
```

### 3. 添加AI配置

#### 步骤1：点击"添加配置"按钮

#### 步骤2：填写配置信息

- **AI服务商**：从下拉选择（Gemini、DeepSeek、Kimi、OpenAI）
- **模型名称**：输入模型名称
  - Gemini: `gemini-2.5-flash`
  - DeepSeek: `deepseek-chat`
  - Kimi: `moonshot-v1-8k`
  - OpenAI: `gpt-4o-mini`
  - MiniMax: `abab6.5s-chat`
  - Claude: `claude-sonnet-4-20250514`
- **API密钥**：输入对应的API密钥
- **优先级**：数字越小优先级越高（0最高）

#### 步骤3：点击"添加"按钮

系统会自动激活第一个配置，后续配置默认为未激活状态。

---

## 📊 管理界面说明

### 配置列表

配置列表显示所有AI配置，包含以下信息：

| 字段 | 说明 |
|-----|------|
| AI服务商 | AI公司名称（带图标） |
| 模型名称 | 使用的模型 |
| API密钥 | 脱敏显示（只显示前4位和后4位） |
| 优先级 | 调用优先级（数字越小越高） |
| 状态 | 已激活 / 未激活 |
| 更新时间 | 最后更新时间 |

### 操作按钮

- **激活**：激活当前配置（会停用同服务商的其他配置）
- **编辑**：修改配置信息（模型名称、API密钥、优先级）
- **删除**：删除配置（仅限未激活的配置）

---

## 🔄 切换AI服务

### 场景：Gemini到期后切换到DeepSeek

#### 步骤1：添加DeepSeek配置

```
AI服务商: DeepSeek
模型名称: deepseek-chat
API密钥: sk-xxxxxxxxxxxxxxxx
优先级: 1
```

#### 步骤2：激活DeepSeek配置

点击DeepSeek配置的"激活"按钮。

#### 步骤3：验证切换

1. 查看配置列表，确认DeepSeek状态为"已激活"
2. 测试上传错题或分析文档
3. 检查日志，确认使用了DeepSeek服务

#### 步骤4：（可选）停用Gemini

点击Gemini配置的"编辑"按钮，修改API密钥或优先级。

---

## 🔧 API接口

### 获取所有AI配置

```bash
GET /api/admin/ai-providers
Authorization: Bearer {token}
```

响应示例：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider_name": "gemini",
      "model_name": "gemini-2.5-flash",
      "api_key_masked": "AIza****xyz123",
      "is_active": true,
      "priority": 1,
      "created_at": "2025-01-09T10:00:00Z",
      "updated_at": "2025-01-09T10:00:00Z"
    }
  ]
}
```

### 添加AI配置

```bash
POST /api/admin/ai-providers
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider_name": "deepseek",
  "model_name": "deepseek-chat",
  "api_key": "sk-xxxxxxxxxxxxxxxx",
  "priority": 2
}
```

### 更新AI配置

```bash
PUT /api/admin/ai-providers/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "model_name": "deepseek-chat",
  "priority": 1
}
```

### 删除AI配置

```bash
DELETE /api/admin/ai-providers/{id}
Authorization: Bearer {token}
```

### 激活AI配置

```bash
POST /api/admin/ai-providers/{id}/activate
Authorization: Bearer {token}
```

### 获取激活的AI配置

```bash
GET /api/admin/ai-providers/active
Authorization: Bearer {token}
```

---

## 💻 代码调用示例

### 使用统一AI调用接口

```typescript
import { callAI, callAIWithRetry, callAIStream } from '@/utils/aiClient';

// 普通调用
const response = await callAI('请分析这道题目：...');

if (response.success) {
  console.log('AI回复:', response.content);
  console.log('Token使用:', response.usage);
} else {
  console.error('调用失败:', response.error);
}

// 带重试的调用（自动重试3次）
const responseWithRetry = await callAIWithRetry('请分析这道题目：...');

// 流式调用（DeepSeek、Kimi、OpenAI支持）
for await (const chunk of callAIStream('请分析这道题目：...')) {
  if (chunk.done) {
    console.log('完成:', chunk.content);
  } else {
    console.log('片段:', chunk.content);
  }
}
```

---

## 🔐 安全建议

### 1. API密钥安全

- ✅ 生产环境应加密存储API密钥
- ✅ 定期轮换API密钥
- ✅ 使用环境变量存储密钥
- ❌ 不要在代码中硬编码密钥
- ❌ 不要将密钥提交到版本控制

### 2. 访问控制

- ✅ 只有管理员可以访问AI配置页面
- ✅ 所有API接口都需要管理员权限验证
- ✅ 记录所有配置变更操作

### 3. 配额管理

- ✅ 监控各AI服务的使用量
- ✅ 设置合理的重试机制
- ✅ 配额用完后自动切换备用服务

---

## 🎨 用户体验

### 管理员视角

```
1. 登录系统
   ↓
2. 进入管理后台
   ↓
3. 点击"AI服务配置"
   ↓
4. 查看当前配置
   ↓
5. 添加/编辑/激活配置
   ↓
6. 测试切换效果
```

### 用户视角

```
1. 上传错题/文档
   ↓
2. 系统自动选择激活的AI服务
   ↓
3. 显示识别结果
   ↓
4. 用户无感知AI服务切换
```

---

## 📝 常见问题

### Q1: 如何切换AI服务？

A: 在管理页面找到要激活的配置，点击"激活"按钮即可。

### Q2: 可以同时激活多个AI服务吗？

A: 可以，但调用时会根据优先级选择一个激活的服务。

### Q3: API密钥会泄露吗？

A: API密钥在数据库中存储，前端显示时会脱敏，只有后端能获取完整密钥。

### Q4: 如何配置多个AI服务的自动切换？

A: 可以设置优先级，系统会优先使用优先级高的服务，失败时尝试其他服务。

### Q5: 支持流式输出吗？

A: 支持，DeepSeek、Kimi、OpenAI、MiniMax、Claude 支持流式输出，Gemini 目前不支持。

### Q6: 如何测试AI服务是否可用？

A: 可以上传测试文档或错题，观察日志输出确认使用了哪个AI服务。

---

## 🚀 部署说明

### 环境变量

无需额外的环境变量，数据库表存储所有配置。

### 数据库迁移

```bash
psql $DATABASE_URL -f scripts/migrate-ai-providers.sql
```

### 测试脚本

```bash
chmod +x scripts/test-ai-providers.sh
./scripts/test-ai-providers.sh
```

---

## 📊 数据库表结构

```sql
CREATE TABLE ai_providers (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(50) NOT NULL,           -- AI公司名称
    model_name VARCHAR(100) NOT NULL,             -- 模型名称
    api_key TEXT NOT NULL,                        -- API密钥
    is_active BOOLEAN DEFAULT FALSE,              -- 是否激活
    priority INTEGER DEFAULT 0,                   -- 优先级
    config JSONB DEFAULT '{}',                    -- 额外配置
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- 约束：每个provider_name只能有一个激活的配置
    CONSTRAINT unique_active_provider UNIQUE (provider_name, is_active)
        WHERE is_active = TRUE
);
```

---

## ✅ 功能清单

- ✅ 支持6个AI服务提供商（Gemini、DeepSeek、Kimi、OpenAI、MiniMax、Claude）
- ✅ 可视化管理界面
- ✅ 一键激活/切换AI服务
- ✅ API密钥安全存储
- ✅ 优先级管理
- ✅ 统一调用接口
- ✅ 自动重试机制
- ✅ 流式输出支持（5个AI服务支持：DeepSeek、Kimi、OpenAI、MiniMax、Claude）
- ✅ 配额错误处理
- ✅ 操作日志记录

---

## 🎯 总结

多AI服务配置系统让管理员可以轻松管理和切换不同的AI服务，提高了系统的灵活性和可靠性。当某个AI服务到期或出现问题时，管理员可以快速切换到其他服务，确保系统持续可用。

### 核心优势

1. **灵活性**：支持多个AI服务，可随时切换
2. **可靠性**：自动重试和故障切换
3. **易用性**：直观的管理界面
4. **安全性**：API密钥安全存储
5. **扩展性**：易于添加新的AI服务

开始使用：访问 `/admin/ai-providers` 开始配置您的AI服务！
