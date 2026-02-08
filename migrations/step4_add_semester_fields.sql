-- ============================================
-- 步骤4：为单词表添加 semester 字段（上学期/下学期）
-- ============================================

-- 为 words 表添加 semester 字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT '下学期';

-- 为 word_families 表添加 semester 字段（参考用）
ALTER TABLE word_families ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT '下学期';

-- 为 words 表添加 semester 索引
CREATE INDEX IF NOT EXISTS idx_words_semester ON words(semester);

-- 为 word_families 表添加 semester 索引
CREATE INDEX IF NOT EXISTS idx_word_families_semester ON word_families(semester);

-- 创建复合索引（grade + semester）
CREATE INDEX IF NOT EXISTS idx_words_grade_semester ON words(grade, semester);
CREATE INDEX IF NOT EXISTS idx_word_families_grade_semester ON word_families(grade, semester);

-- 验证字段是否添加成功
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('words', 'word_families')
AND column_name = 'semester'
ORDER BY table_name;
