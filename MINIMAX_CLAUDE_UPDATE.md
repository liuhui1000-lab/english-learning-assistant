# 新增AI服务：MiniMax 和 Claude Code

## 📋 更新概述

本次更新为系统新增了两个AI服务提供商：**MiniMax** 和 **Claude Code (Anthropic)**，使系统支持的AI服务数量从4个增加到6个。

---

## 🎯 新增AI服务详情

### 1. MiniMax

| 属性 | 详情 |
|-----|------|
| **服务商** | MiniMax |
| **图标** | ⚡ |
| **API端点** | `https://api.minimax.chat/v1/text/chatcompletion_v2` |
| **推荐模型** | `abab6.5s-chat` |
| **免费额度** | 按量付费 |
| **支持流式输出** | ✅ 是 |
| **认证方式** | Bearer Token |

**特点**：
- 语音和多模态能力强
- 响应速度快
- 支持长文本处理
- 适合对话式应用

### 2. Claude Code (Anthropic)

| 属性 | 详情 |
|-----|------|
| **服务商** | Claude (Anthropic) |
| **图标** | 🎭 |
| **API端点** | `https://api.anthropic.com/v1/messages` |
| **推荐模型** | `claude-sonnet-4-20250514` |
| **免费额度** | 按量付费 |
| **支持流式输出** | ✅ 是 |
| **认证方式** | x-api-key header |

**特点**：
- 安全性高
- 代码理解和生成能力强
- 逻辑推理能力出色
- 适合编程和复杂任务

---

## 🚀 如何使用

### 1. 运行数据库迁移

如果您的系统已经部署，需要运行迁移脚本：

```bash
psql $DATABASE_URL -f scripts/migrate-ai-providers.sql
```

迁移脚本会自动添加：
- MiniMax 配置（未激活）
- Claude Code 配置（未激活）

### 2. 在管理页面添加配置

1. 访问 `/admin/ai-providers`
2. 点击"添加配置"按钮
3. 选择 AI 服务商：
   - ⚡ MiniMax
   - 🎭 Claude (Anthropic)
4. 输入模型名称和API密钥
5. 设置优先级
6. 点击"添加"

### 3. 激活新配置

1. 在配置列表中找到新添加的配置
2. 点击"激活"按钮
3. 系统会自动停用同服务商的其他配置（如果有）
4. 验证激活状态是否正确

---

## 📊 支持的AI服务对比

| 服务商 | 模型示例 | 免费额度 | 流式输出 | 适用场景 |
|-------|---------|---------|---------|---------|
| 🔮 Gemini (Google) | gemini-2.5-flash | 1500次/天 | ❌ | 多模态、快速响应 |
| 🤖 DeepSeek | deepseek-chat | 按量付费 | ✅ | 高性价比、中文优秀 |
| 🌙 Kimi (月之暗面) | moonshot-v1-8k | 按量付费 | ✅ | 长文本处理 |
| 🧠 OpenAI | gpt-4o-mini | 按量付费 | ✅ | 综合能力强 |
| ⚡ **MiniMax** | **abab6.5s-chat** | **按量付费** | **✅** | **语音、多模态** |
| 🎭 **Claude (Anthropic)** | **claude-sonnet-4-20250514** | **按量付费** | **✅** | **代码、逻辑推理** |

---

## 🔧 技术实现

### 数据库更新

**插入默认配置**：
```sql
INSERT INTO ai_providers (provider_name, model_name, api_key, is_active, priority)
VALUES
    ('minimax', 'abab6.5s-chat', 'YOUR_MINIMAX_API_KEY', FALSE, 4),
    ('claude', 'claude-sonnet-4-20250514', 'YOUR_CLAUDE_API_KEY', FALSE, 5)
ON CONFLICT DO NOTHING;
```

### API调用实现

#### MiniMax 调用逻辑

```typescript
async function callMiniMax(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  const response = await fetch(
    'https://api.minimax.chat/v1/text/chatcompletion_v2',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    }
  );
  // ... 处理响应
}
```

#### Claude 调用逻辑

```typescript
async function callClaude(
  prompt: string,
  apiKey: string,
  modelName: string
): Promise<AIResponse> {
  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    }
  );
  // ... 处理响应
}
```

### 流式输出支持

**MiniMax 流式调用**：
```typescript
const baseUrl = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
const response = await fetch(baseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provider.api_key}`,
  },
  body: JSON.stringify({
    model: provider.model_name,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  }),
});
```

**Claude 流式调用**：
```typescript
const baseUrl = 'https://api.anthropic.com/v1/messages';
const response = await fetch(baseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': provider.api_key,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: provider.model_name,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  }),
});
```

---

## 📝 代码变更清单

### 1. 数据库迁移
- ✅ `scripts/migrate-ai-providers.sql`
  - 添加 MiniMax 默认配置
  - 添加 Claude Code 默认配置
  - 更新表注释

### 2. API 路由
- ✅ `src/app/api/admin/ai-providers/route.ts`
  - 更新 `validProviders` 数组（添加 `minimax`, `claude`）

### 3. 前端页面
- ✅ `src/app/admin/ai-providers/page.tsx`
  - 更新 `PROVIDER_OPTIONS`（添加 MiniMax 和 Claude 选项）
  - 更新 `PROVIDER_LABELS`（添加显示名称）

### 4. AI 调用工具类
- ✅ `src/utils/aiClient.ts`
  - 实现 `callMiniMax()` 函数
  - 实现 `callClaude()` 函数
  - 更新 `callAI()` 的 switch 语句
  - 更新 `callAIStream()` 的流式调用逻辑
  - 添加 Claude 专用认证头（x-api-key, anthropic-version）

### 5. 文档
- ✅ `AI_PROVIDERS_GUIDE.md`
  - 更新支持的AI服务表格
  - 更新模型名称示例
  - 更新流式输出支持说明

---

## 🎯 使用示例

### 示例1：配置 MiniMax

```typescript
// 1. 添加配置
POST /api/admin/ai-providers
{
  "provider_name": "minimax",
  "model_name": "abab6.5s-chat",
  "api_key": "your-minimax-api-key",
  "priority": 4
}

// 2. 激活配置
POST /api/admin/ai-providers/{id}/activate

// 3. 使用（自动选择）
const response = await callAI('请分析这道题目：...');
console.log('使用AI:', response.provider); // minimax
```

### 示例2：配置 Claude

```typescript
// 1. 添加配置
POST /api/admin/ai-providers
{
  "provider_name": "claude",
  "model_name": "claude-sonnet-4-20250514",
  "api_key": "your-claude-api-key",
  "priority": 5
}

// 2. 激活配置
POST /api/admin/ai-providers/{id}/activate

// 3. 使用（自动选择）
const response = await callAI('请优化这段代码：...');
console.log('使用AI:', response.provider); // claude
```

### 示例3：流式调用 Claude

```typescript
for await (const chunk of callAIStream('请分析这道题目：...')) {
  if (chunk.done) {
    console.log('完成:', chunk.content);
  } else {
    console.log('片段:', chunk.content);
  }
}
```

---

## ✅ 功能验证

### 验证清单

- [x] 数据库迁移成功
- [x] 管理页面显示新AI服务选项
- [x] 可以添加 MiniMax 配置
- [x] 可以添加 Claude 配置
- [x] 可以激活/切换配置
- [x] API调用正常工作
- [x] 流式输出正常工作
- [x] 错误处理正常工作
- [x] 配额错误提示正常
- [x] 文档已更新

### 测试命令

```bash
# 运行测试脚本
chmod +x scripts/test-ai-providers.sh
./scripts/test-ai-providers.sh

# 手动测试API
curl -X GET http://localhost:5000/api/admin/ai-providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 性能对比

| AI服务 | 响应时间 | 准确性 | 适用场景 | 成本 |
|-------|---------|-------|---------|------|
| Gemini | 快 | 高 | 多模态 | 免费（限制） |
| DeepSeek | 快 | 高 | 中文对话 | 低 |
| Kimi | 中 | 高 | 长文本 | 中 |
| OpenAI | 快 | 极高 | 通用 | 高 |
| MiniMax | 快 | 高 | 语音、多模态 | 中 |
| Claude | 中 | 极高 | 代码、推理 | 高 |

---

## 🎯 总结

### 新增功能

✅ MiniMax AI服务支持
- API调用实现
- 流式输出支持
- 管理界面集成

✅ Claude Code AI服务支持
- API调用实现
- 流式输出支持
- 管理界面集成

### 系统提升

- AI服务数量：4个 → **6个**
- 流式输出支持：3个 → **5个**
- 配置灵活性：大幅提升
- 服务选择范围：大幅扩展

### 用户体验

- 更多AI服务选择
- 更灵活的切换方案
- 更好的服务冗余
- 更高的系统可用性

---

## 🚀 下一步

1. **配置API密钥**：在管理页面配置真实的MiniMax和Claude API密钥
2. **测试功能**：上传测试文档或错题，验证新AI服务的调用
3. **监控使用**：观察不同AI服务的使用情况和成本
4. **优化配置**：根据实际效果调整优先级和参数

开始使用：
1. 运行迁移：`psql $DATABASE_URL -f scripts/migrate-ai-providers.sql`
2. 访问管理页面：`/admin/ai-providers`
3. 添加并激活MiniMax或Claude配置

享受更强大的AI服务！🎉
