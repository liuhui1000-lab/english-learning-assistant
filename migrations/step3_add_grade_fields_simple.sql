-- ============================================
-- 步骤3：为单词表添加 grade 字段（仅单词需要严格按年级）
-- ============================================

-- 为 words 表添加 grade 字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT '8年级';

-- 为 word_families 表添加 grade 字段（参考用，表示该词族主要出现的年级）
ALTER TABLE word_families ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT '8年级';

-- 为 words 表添加 grade 索引
CREATE INDEX IF NOT EXISTS idx_words_grade ON words(grade);

-- 为 word_families 表添加 grade 索引
CREATE INDEX IF NOT EXISTS idx_word_families_grade ON word_families(grade);

-- 注意：word_transformations、collocations、grammar_points 不需要 grade 字段
-- 因为这些知识点是贯穿整个初中的，不按年级隔离

-- 验证字段是否添加成功
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('words', 'word_families')
AND column_name = 'grade'
ORDER BY table_name;
