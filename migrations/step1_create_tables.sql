-- ============================================
-- 步骤1：创建新表（不修改现有表）
-- ============================================

-- 创建词族表
CREATE TABLE IF NOT EXISTS word_families (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    base_word VARCHAR(100) NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) DEFAULT 'list' NOT NULL,
    source_info VARCHAR(200),
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户词族学习进度表
CREATE TABLE IF NOT EXISTS user_word_family_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    user_id VARCHAR(100) NOT NULL,
    word_family_id VARCHAR(36) NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_review_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    consecutive_correct INTEGER DEFAULT 0,
    learning_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户固定搭配学习进度表
CREATE TABLE IF NOT EXISTS user_collocation_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    user_id VARCHAR(100) NOT NULL,
    collocation_id VARCHAR(36) NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_review_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    consecutive_correct INTEGER DEFAULT 0,
    learning_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户语法学习进度表
CREATE TABLE IF NOT EXISTS user_grammar_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    user_id VARCHAR(100) NOT NULL,
    grammar_point_id VARCHAR(36) NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_word_families_base_word ON word_families(base_word);
CREATE INDEX IF NOT EXISTS idx_word_families_source_type ON word_families(source_type);

CREATE INDEX IF NOT EXISTS idx_user_word_family_progress_user_id ON user_word_family_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_family_progress_word_family_id ON user_word_family_progress(word_family_id);
CREATE INDEX IF NOT EXISTS idx_user_word_family_progress_next_review_at ON user_word_family_progress(next_review_at);

CREATE INDEX IF NOT EXISTS idx_user_collocation_progress_user_id ON user_collocation_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collocation_progress_collocation_id ON user_collocation_progress(collocation_id);
CREATE INDEX IF NOT EXISTS idx_user_collocation_progress_next_review_at ON user_collocation_progress(next_review_at);

CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_user_id ON user_grammar_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_grammar_point_id ON user_grammar_progress(grammar_point_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_next_review_at ON user_grammar_progress(next_review_at);

-- 验证新表创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'word_families',
    'user_word_family_progress',
    'user_collocation_progress',
    'user_grammar_progress'
)
ORDER BY table_name;
