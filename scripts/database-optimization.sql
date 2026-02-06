-- 数据库优化脚本
-- 用于清理和归档旧数据，控制数据库大小增长

-- 1. 归档超过30天的语法练习记录
CREATE OR REPLACE FUNCTION archive_old_practice_records()
RETURNS void AS $$
BEGIN
    -- 如果归档表不存在则创建
    CREATE TABLE IF NOT EXISTS grammar_practice_records_archive (
        LIKE grammar_practice_records INCLUDING ALL
    );

    -- 归档数据
    INSERT INTO grammar_practice_records_archive
    SELECT * FROM grammar_practice_records
    WHERE created_at < NOW() - INTERVAL '30 days'
    ON CONFLICT (id) DO NOTHING;

    -- 删除已归档的数据
    DELETE FROM grammar_practice_records
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 2. 限制每用户的错题记录数量（最多1000条）
CREATE OR REPLACE FUNCTION limit_user_mistakes(user_id_param VARCHAR(100))
RETURNS void AS $$
BEGIN
    -- 保留最近的1000条错题
    DELETE FROM grammar_mistakes
    WHERE user_id = user_id_param
    AND id NOT IN (
        SELECT id FROM grammar_mistakes
        WHERE user_id = user_id_param
        ORDER BY created_at DESC
        LIMIT 1000
    );
END;
$$ LANGUAGE plpgsql;

-- 3. 为所有用户限制错题记录
CREATE OR REPLACE FUNCTION limit_all_user_mistakes()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM grammar_mistakes LOOP
        PERFORM limit_user_mistakes(user_record.user_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建每日学习统计表（用于聚合数据）
CREATE TABLE IF NOT EXISTS user_daily_stats (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    words_learned INTEGER DEFAULT 0,
    grammar_practiced INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- 学习时间（秒）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date ON user_daily_stats(user_id, date);

-- 5. 聚合每日学习数据
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
    -- 聚合单词学习数据
    INSERT INTO user_daily_stats (user_id, date, words_learned, accuracy)
    SELECT
        user_id,
        target_date,
        COUNT(*) AS words_learned,
        CASE
            WHEN COUNT(*) > 0 THEN
                (SUM(CASE WHEN mastery_level >= 3 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100)
            ELSE 0
        END AS accuracy
    FROM user_word_progress
    WHERE DATE(updated_at) = target_date
    GROUP BY user_id
    ON CONFLICT (user_id, date) DO UPDATE
    SET
        words_learned = EXCLUDED.words_learned,
        accuracy = EXCLUDED.accuracy,
        updated_at = NOW();

    -- 聚合语法练习数据
    INSERT INTO user_daily_stats (user_id, date, grammar_practiced, accuracy)
    SELECT
        user_id,
        target_date,
        COUNT(*) AS grammar_practiced,
        CASE
            WHEN COUNT(*) > 0 THEN
                (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100)
            ELSE 0
        END AS accuracy
    FROM grammar_practice_records
    WHERE DATE(created_at) = target_date
    GROUP BY user_id
    ON CONFLICT (user_id, date) DO UPDATE
    SET
        grammar_practiced = EXCLUDED.grammar_practiced,
        accuracy = COALESCE(EXCLUDED.accuracy, user_daily_stats.accuracy),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. 清理过期的每日统计（保留1年）
CREATE OR REPLACE FUNCTION cleanup_old_daily_stats()
RETURNS void AS $$
BEGIN
    DELETE FROM user_daily_stats
    WHERE date < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- 7. 创建定期维护任务（需要 pg_cron 扩展）
-- 注意：某些平台（如 Supabase）需要手动设置定时任务

-- 每周执行一次数据归档
-- SELECT cron.schedule('weekly-archive', '0 2 * * 0', 'SELECT archive_old_practice_records();');

-- 每月限制一次错题数量
-- SELECT cron.schedule('monthly-limit-mistakes', '0 3 1 * *', 'SELECT limit_all_user_mistakes();');

-- 每天聚合统计数据
-- SELECT cron.schedule('daily-aggregate', '0 1 * * *', 'SELECT aggregate_daily_stats(CURRENT_DATE);');

-- 每月清理旧统计数据
-- SELECT cron.schedule('monthly-cleanup-stats', '0 4 1 * *', 'SELECT cleanup_old_daily_stats();');

-- 8. 数据库大小监控视图
CREATE OR REPLACE VIEW database_size_monitor AS
SELECT
    'words' AS table_name,
    pg_size_pretty(pg_total_relation_size('words')) AS size,
    (SELECT COUNT(*) FROM words) AS row_count
UNION ALL
SELECT
    'word_transformations' AS table_name,
    pg_size_pretty(pg_total_relation_size('word_transformations')) AS size,
    (SELECT COUNT(*) FROM word_transformations) AS row_count
UNION ALL
SELECT
    'grammar_exercises' AS table_name,
    pg_size_pretty(pg_total_relation_size('grammar_exercises')) AS size,
    (SELECT COUNT(*) FROM grammar_exercises) AS row_count
UNION ALL
SELECT
    'grammar_practice_records' AS table_name,
    pg_size_pretty(pg_total_relation_size('grammar_practice_records')) AS size,
    (SELECT COUNT(*) FROM grammar_practice_records) AS row_count
UNION ALL
SELECT
    'grammar_mistakes' AS table_name,
    pg_size_pretty(pg_total_relation_size('grammar_mistakes')) AS size,
    (SELECT COUNT(*) FROM grammar_mistakes) AS row_count
UNION ALL
SELECT
    'user_word_progress' AS table_name,
    pg_size_pretty(pg_total_relation_size('user_word_progress')) AS size,
    (SELECT COUNT(*) FROM user_word_progress) AS row_count
UNION ALL
SELECT
    'user_transformation_progress' AS table_name,
    pg_size_pretty(pg_total_relation_size('user_transformation_progress')) AS size,
    (SELECT COUNT(*) FROM user_transformation_progress) AS row_count
UNION ALL
SELECT
    'transformation_mistakes' AS table_name,
    pg_size_pretty(pg_total_relation_size('transformation_mistakes')) AS size,
    (SELECT COUNT(*) FROM transformation_mistakes) AS row_count
ORDER BY pg_total_relation_size(table_name) DESC;

-- 9. 用户数据统计视图
CREATE OR REPLACE VIEW user_data_statistics AS
SELECT
    (SELECT COUNT(*) FROM words) AS total_words,
    (SELECT COUNT(*) FROM word_transformations) AS total_word_transformations,
    (SELECT COUNT(*) FROM grammar_exercises) AS total_grammar_exercises,
    (SELECT COUNT(*) FROM user_word_progress) AS user_word_progress_count,
    (SELECT COUNT(*) FROM grammar_practice_records) AS grammar_practice_records_count,
    (SELECT COUNT(*) FROM grammar_mistakes) AS grammar_mistakes_count,
    (SELECT COUNT(DISTINCT user_id) FROM user_word_progress) AS active_users;

-- 10. 手动执行优化任务（供 API 调用）
-- 创建一个综合优化函数
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TABLE(
    archived_records INTEGER,
    limited_mistakes INTEGER,
    aggregated_stats INTEGER
) AS $$
DECLARE
    archived_count INTEGER;
    limited_count INTEGER;
    aggregated_count INTEGER;
BEGIN
    -- 归档旧记录
    SELECT COUNT(*) INTO archived_count
    FROM grammar_practice_records_archive
    WHERE created_at >= NOW() - INTERVAL '1 day';

    -- 归档
    PERFORM archive_old_practice_records();
    archived_count := COALESCE(archived_count, 0);

    -- 限制错题
    PERFORM limit_all_user_mistakes();
    limited_count := 0; -- 可以通过查询计算

    -- 聚合统计
    PERFORM aggregate_daily_stats();
    aggregated_count := 1;

    RETURN QUERY SELECT archived_count, limited_count, aggregated_count;
END;
$$ LANGUAGE plpgsql;

-- 使用示例：
-- SELECT * FROM optimize_database();
-- SELECT * FROM database_size_monitor;
-- SELECT * FROM user_data_statistics;
