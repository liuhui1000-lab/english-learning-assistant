-- AI服务提供商配置表
-- 支持多个AI服务（Gemini、DeepSeek、Kimi、OpenAI、MiniMax、Claude等）

CREATE TABLE IF NOT EXISTS ai_providers (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(50) NOT NULL,           -- AI公司名称：gemini, deepseek, kimi
    model_name VARCHAR(100) NOT NULL,             -- 模型名称：gemini-2.5-flash, deepseek-chat
    api_key TEXT NOT NULL,                        -- API密钥（加密存储）
    is_active BOOLEAN DEFAULT FALSE,              -- 是否激活
    priority INTEGER DEFAULT 0,                   -- 优先级（数字越小优先级越高）
    config JSONB DEFAULT '{}',                    -- 额外配置（如端点URL、温度等）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- 约束：每个provider_name只能有一个激活的配置
    CONSTRAINT unique_active_provider UNIQUE (provider_name, is_active)
        WHERE is_active = TRUE
);

-- 创建索引
CREATE INDEX idx_ai_providers_provider_name ON ai_providers(provider_name);
CREATE INDEX idx_ai_providers_is_active ON ai_providers(is_active);
CREATE INDEX idx_ai_providers_priority ON ai_providers(priority);

-- 插入默认配置（示例）
INSERT INTO ai_providers (provider_name, model_name, api_key, is_active, priority)
VALUES
    ('gemini', 'gemini-2.5-flash', 'YOUR_GEMINI_API_KEY', TRUE, 1),
    ('deepseek', 'deepseek-chat', 'YOUR_DEEPSEEK_API_KEY', FALSE, 2),
    ('kimi', 'moonshot-v1-8k', 'YOUR_KIMI_API_KEY', FALSE, 3),
    ('minimax', 'abab6.5s-chat', 'YOUR_MINIMAX_API_KEY', FALSE, 4),
    ('claude', 'claude-sonnet-4-20250514', 'YOUR_CLAUDE_API_KEY', FALSE, 5)
ON CONFLICT DO NOTHING;

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_ai_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_providers_updated_at
    BEFORE UPDATE ON ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_providers_updated_at();

-- 添加注释
COMMENT ON TABLE ai_providers IS 'AI服务提供商配置表';
COMMENT ON COLUMN ai_providers.provider_name IS 'AI公司名称：gemini, deepseek, kimi, minimax, claude';
COMMENT ON COLUMN ai_providers.model_name IS '模型名称';
COMMENT ON COLUMN ai_providers.api_key IS 'API密钥（生产环境应加密存储）';
COMMENT ON COLUMN ai_providers.is_active IS '是否激活（同一provider只能有一个激活配置）';
COMMENT ON COLUMN ai_providers.priority IS '优先级（数字越小优先级越高）';
COMMENT ON COLUMN ai_providers.config IS '额外配置（如端点URL、temperature、max_tokens等）';
