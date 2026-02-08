-- 创建词族表
CREATE TABLE IF NOT EXISTS word_families (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    base_word VARCHAR(100) NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) DEFAULT 'list' NOT NULL,
    source_info VARCHAR(200),
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为词族表创建索引
CREATE INDEX IF NOT EXISTS idx_word_families_base_word ON word_families(base_word);
CREATE INDEX IF NOT EXISTS idx_word_families_source_type ON word_families(source_type);

-- 为 words 表添加字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_family_id VARCHAR(36);
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_type VARCHAR(20);
ALTER TABLE words ADD CONSTRAINT IF NOT EXISTS words_word_family_id_fkey 
    FOREIGN KEY (word_family_id) REFERENCES word_families(id) ON DELETE SET NULL;

-- 为 words 表创建索引
CREATE INDEX IF NOT EXISTS idx_words_word_family_id ON words(word_family_id);

-- 为 word_transformations 表添加字段
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS word_family_id VARCHAR(36);
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'list';
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS source_info VARCHAR(200);
ALTER TABLE word_transformations ADD CONSTRAINT IF NOT EXISTS word_transformations_word_family_id_fkey 
    FOREIGN KEY (word_family_id) REFERENCES word_families(id) ON DELETE SET NULL;

-- 为 word_transformations 表创建索引
CREATE INDEX IF NOT EXISTS idx_word_transformations_word_family_id ON word_transformations(word_family_id);

-- 为 collocations 表添加字段
ALTER TABLE collocations ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'list';
ALTER TABLE collocations ADD COLUMN IF NOT EXISTS source_info VARCHAR(200);

-- 为 grammar_points 表修改字段
ALTER TABLE grammar_points ALTER COLUMN level TYPE VARCHAR(20);
ALTER TABLE grammar_points ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'preset';
ALTER TABLE grammar_points ADD COLUMN IF NOT EXISTS source_info VARCHAR(200);
ALTER TABLE grammar_points ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;

-- 创建用户词族学习进度表
CREATE TABLE IF NOT EXISTS user_word_family_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 为用户词族学习进度表创建索引
CREATE INDEX IF NOT EXISTS idx_user_word_family_progress_user_id ON user_word_family_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_family_progress_word_family_id ON user_word_family_progress(word_family_id);
CREATE INDEX IF NOT EXISTS idx_user_word_family_progress_next_review_at ON user_word_family_progress(next_review_at);

-- 添加外键约束
ALTER TABLE user_word_family_progress ADD CONSTRAINT IF NOT EXISTS user_word_family_progress_word_family_id_fkey 
    FOREIGN KEY (word_family_id) REFERENCES word_families(id) ON DELETE CASCADE;

-- 创建用户固定搭配学习进度表
CREATE TABLE IF NOT EXISTS user_collocation_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 为用户固定搭配学习进度表创建索引
CREATE INDEX IF NOT EXISTS idx_user_collocation_progress_user_id ON user_collocation_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collocation_progress_collocation_id ON user_collocation_progress(collocation_id);
CREATE INDEX IF NOT EXISTS idx_user_collocation_progress_next_review_at ON user_collocation_progress(next_review_at);

-- 添加外键约束
ALTER TABLE user_collocation_progress ADD CONSTRAINT IF NOT EXISTS user_collocation_progress_collocation_id_fkey 
    FOREIGN KEY (collocation_id) REFERENCES collocations(id) ON DELETE CASCADE;

-- 创建用户语法学习进度表
CREATE TABLE IF NOT EXISTS user_grammar_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    grammar_point_id VARCHAR(36) NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为用户语法学习进度表创建索引
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_user_id ON user_grammar_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_grammar_point_id ON user_grammar_progress(grammar_point_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_next_review_at ON user_grammar_progress(next_review_at);

-- 添加外键约束
ALTER TABLE user_grammar_progress ADD CONSTRAINT IF NOT EXISTS user_grammar_progress_grammar_point_id_fkey 
    FOREIGN KEY (grammar_point_id) REFERENCES grammar_points(id) ON DELETE CASCADE;
