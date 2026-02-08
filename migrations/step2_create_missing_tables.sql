-- ============================================
-- 步骤2：创建缺失的表并添加字段
-- ============================================

-- 创建 words 表（如果不存在）
CREATE TABLE IF NOT EXISTS words (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    word VARCHAR(100) NOT NULL UNIQUE,
    word_family_id VARCHAR(36),
    word_type VARCHAR(20),
    phonetic VARCHAR(100),
    meaning TEXT NOT NULL,
    example TEXT,
    example_translation TEXT,
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 word_transformations 表（如果不存在）
CREATE TABLE IF NOT EXISTS word_transformations (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    word_family_id VARCHAR(36),
    base_word VARCHAR(100) NOT NULL,
    base_meaning TEXT NOT NULL,
    transformations JSONB NOT NULL,
    difficulty INTEGER DEFAULT 1,
    source_type VARCHAR(20) DEFAULT 'list',
    source_info VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 collocations 表（如果不存在）
CREATE TABLE IF NOT EXISTS collocations (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    phrase VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    example_translation TEXT,
    category VARCHAR(50),
    difficulty INTEGER DEFAULT 1,
    source_type VARCHAR(20) DEFAULT 'list',
    source_info VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 grammar_points 表（如果不存在）
CREATE TABLE IF NOT EXISTS grammar_points (
    id VARCHAR(36) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    level INTEGER DEFAULT 1,
    level_new VARCHAR(20),
    source_type VARCHAR(20) DEFAULT 'preset',
    source_info VARCHAR(200),
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_words_word_family_id ON words(word_family_id);

CREATE INDEX IF NOT EXISTS idx_word_transformations_base_word ON word_transformations(base_word);
CREATE INDEX IF NOT EXISTS idx_word_transformations_word_family_id ON word_transformations(word_family_id);

CREATE INDEX IF NOT EXISTS idx_collocations_phrase ON collocations(phrase);

CREATE INDEX IF NOT EXISTS idx_grammar_points_name ON grammar_points(name);

-- 验证所有表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'words',
    'word_transformations',
    'collocations',
    'grammar_points'
)
ORDER BY table_name;
