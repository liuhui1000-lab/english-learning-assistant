-- ============================================
-- 步骤3：为核心表添加 grade（年级）字段
-- ============================================

-- 为 words 表添加 grade 字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT '8年级';

-- 为 word_families 表添加 grade 字段
ALTER TABLE word_families ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT '8年级';

-- 为 word_transformations 表添加 grade 字段
ALTER TABLE word_transformations ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT '8年级';

-- 为 collocations 表添加 grade 字段
ALTER TABLE collocations ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT '8年级';

-- 为 word_families 表添加 grade 索引
CREATE INDEX IF NOT EXISTS idx_word_families_grade ON word_families(grade);

-- 为 words 表添加 grade 索引
CREATE INDEX IF NOT EXISTS idx_words_grade ON words(grade);

-- 为 word_transformations 表添加 grade 索引
CREATE INDEX IF NOT EXISTS idx_word_transformations_grade ON word_transformations(grade);

-- 为 collocations 表添加 grade 索引
CREATE INDEX IF NOT EXISTS idx_collocations_grade ON collocations(grade);

-- 验证字段是否添加成功
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('words', 'word_families', 'word_transformations', 'collocations')
AND column_name = 'grade'
ORDER BY table_name;
