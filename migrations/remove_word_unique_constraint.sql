-- ============================================
-- 移除 words 表的 UNIQUE 约束
-- 目的：支持专有名词的原始大小写存储
-- ============================================

-- 查询当前约束名称
SELECT
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'words'::regclass;

-- 删除 UNIQUE 约束（如果存在）
-- 注意：约束名称通常是 words_word_unique
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'words'::regclass
        AND conname = 'words_word_unique'
    ) THEN
        ALTER TABLE words DROP CONSTRAINT words_word_unique;
        RAISE NOTICE '已删除约束 words_word_unique';
    ELSE
        RAISE NOTICE '约束 words_word_unique 不存在，跳过删除';
    END IF;
END $$;

-- 验证约束是否已删除
SELECT
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'words'::regclass;

-- 查询当前的所有索引
SELECT
    indexname AS index_name,
    indexdef AS index_definition
FROM pg_indexes
WHERE tablename = 'words';
