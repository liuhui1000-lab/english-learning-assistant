-- ============================================
-- 步骤2：修改现有表（仅在步骤1成功后执行）
-- ============================================

-- 为 words 表添加字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_family_id VARCHAR(36);
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_type VARCHAR(20);

-- 为 words 表创建索引
CREATE INDEX IF NOT EXISTS idx_words_word_family_id ON words(word_family_id);

-- 为 word_transformations 表添加字段
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS word_family_id VARCHAR(36);
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'list';
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS source_info VARCHAR(200);

-- 为 word_transformations 表创建索引
CREATE INDEX IF NOT EXISTS idx_word_transformations_word_family_id ON word_transformations(word_family_id);

-- 为 collocations 表添加字段
ALTER TABLE collocations ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'list';
ALTER TABLE collocations ADD COLUMN IF NOT EXISTS source_info VARCHAR(200);

-- 为 grammar_points 表添加字段
ALTER TABLE grammar_points ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'preset';
ALTER TABLE grammar_points ADD COLUMN IF NOT EXISTS source_info VARCHAR(200);
ALTER TABLE grammar_points ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;

-- 验证新字段添加成功
SELECT column_name, table_name 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND column_name IN (
    'word_family_id',
    'word_type',
    'source_type',
    'source_info'
) 
ORDER BY table_name, column_name;
