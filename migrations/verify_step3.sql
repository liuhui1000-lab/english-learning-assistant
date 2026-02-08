-- 验证 step3 迁移是否成功
-- 检查 grade 字段是否已添加到正确的表

-- 检查 words 表
SELECT
    'words' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'words'
AND column_name = 'grade'

UNION ALL

-- 检查 word_families 表
SELECT
    'word_families' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'word_families'
AND column_name = 'grade'

UNION ALL

-- 检查索引（words 表）
SELECT
    'idx_words_grade' as table_name,
    indexname as column_name,
    'index' as data_type,
    '' as column_default
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'words'
AND indexname = 'idx_words_grade'

UNION ALL

-- 检查索引（word_families 表）
SELECT
    'idx_word_families_grade' as table_name,
    indexname as column_name,
    'index' as data_type,
    '' as column_default
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'word_families'
AND indexname = 'idx_word_families_grade'

ORDER BY table_name, column_name;
