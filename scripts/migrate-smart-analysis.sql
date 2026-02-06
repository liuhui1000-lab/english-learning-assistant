-- 智能分析功能数据库迁移脚本
-- 执行前请确保已备份数据库

-- 1. 更新用户表，添加智能分析相关字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS has_new_mistakes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_mistake_updated TIMESTAMP;

-- 2. 更新错题表，添加分析状态和去重相关字段
ALTER TABLE user_mistakes
ADD COLUMN IF NOT EXISTS knowledge_point TEXT,
ADD COLUMN IF NOT EXISTS sub_knowledge_point TEXT,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unanalyzed',
ADD COLUMN IF NOT EXISTS duplicate_of INTEGER REFERENCES user_mistakes(id),
ADD COLUMN IF NOT EXISTS similarity_score NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'practice', -- 'practice' | 'upload'
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 添加唯一约束，防止完全相同的题目
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_mistake'
  ) THEN
    ALTER TABLE user_mistakes
    ADD CONSTRAINT unique_user_mistake UNIQUE (user_id, question);
  END IF;
END $$;

-- 3. 创建错题实时统计表
CREATE TABLE IF NOT EXISTS user_mistake_stats (
  user_id TEXT PRIMARY KEY,
  total_count INTEGER DEFAULT 0,
  knowledge_points JSONB DEFAULT '{}',
  difficulties JSONB DEFAULT '{}',
  sources JSONB DEFAULT '{}',
  last_updated TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 创建错题深度分析表
CREATE TABLE IF NOT EXISTS user_mistake_analysis (
  user_id TEXT PRIMARY KEY,
  weak_points JSONB DEFAULT '[]',
  learning_trend JSONB,
  review_suggestion TEXT,
  priority_points JSONB DEFAULT '[]',
  last_analysis_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. 创建分析任务日志表（用于监控和调试）
CREATE TABLE IF NOT EXISTS analysis_log (
  id SERIAL PRIMARY KEY,
  task_type TEXT NOT NULL, -- 'daily_incremental' | 'weekly_full'
  user_id TEXT,
  status TEXT NOT NULL, -- 'running' | 'success' | 'failed'
  items_analyzed INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_mistakes_status ON user_mistakes(status);
CREATE INDEX IF NOT EXISTS idx_user_mistakes_user_status ON user_mistakes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_mistakes_created_at ON user_mistakes(created_at);
CREATE INDEX IF NOT EXISTS idx_user_mistakes_knowledge_point ON user_mistakes(knowledge_point);
CREATE INDEX IF NOT EXISTS idx_users_has_new_mistakes ON users(has_new_mistakes);
CREATE INDEX IF NOT EXISTS idx_analysis_log_task_type ON analysis_log(task_type);
CREATE INDEX IF NOT EXISTS idx_analysis_log_status ON analysis_log(status);
CREATE INDEX IF NOT EXISTS idx_analysis_log_started_at ON analysis_log(started_at);

-- 7. 创建视图：有新错题待分析的用户
CREATE OR REPLACE VIEW users_with_new_mistakes AS
SELECT
  u.id,
  u.username,
  u.last_analysis_date,
  u.last_mistake_updated,
  COUNT(m.id) AS unanalyzed_count,
  COUNT(m.id) FILTER (WHERE m.created_at > COALESCE(u.last_analysis_date, NOW() - INTERVAL '30 days')) AS recent_count
FROM users u
INNER JOIN user_mistakes m ON u.id = m.user_id
WHERE m.status = 'unanalyzed'
GROUP BY u.id, u.username, u.last_analysis_date, u.last_mistake_updated;

-- 8. 创建视图：错题库有更新的用户（用于每周全量分析）
CREATE OR REPLACE VIEW users_with_updated_mistakes AS
SELECT
  u.id,
  u.username,
  u.last_mistake_updated,
  a.last_analysis_date AS last_weekly_analysis,
  COUNT(m.id) AS total_mistakes,
  COUNT(m.id) FILTER (WHERE m.created_at > NOW() - INTERVAL '7 days') AS new_mistakes_week
FROM users u
LEFT JOIN user_mistake_analysis a ON u.id = a.user_id
LEFT JOIN user_mistakes m ON u.id = m.user_id
WHERE
  u.last_mistake_updated > NOW() - INTERVAL '7 days'
  OR a.last_analysis_date IS NULL
  OR (u.last_mistake_updated > a.last_analysis_date)
GROUP BY u.id, u.username, u.last_mistake_updated, a.last_analysis_date;

-- 9. 创建触发器：自动更新用户的 last_mistake_updated 字段
CREATE OR REPLACE FUNCTION update_user_mistake_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    UPDATE users
    SET
      last_mistake_updated = NOW(),
      has_new_mistakes = true
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_mistake_updated ON user_mistakes;
CREATE TRIGGER trigger_update_user_mistake_updated
AFTER INSERT OR UPDATE ON user_mistakes
FOR EACH ROW
EXECUTE FUNCTION update_user_mistake_updated();

-- 10. 创建触发器：自动删除用户的错题统计（用户删除时）
CREATE OR REPLACE FUNCTION cleanup_user_mistake_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM user_mistake_stats WHERE user_id = OLD.id;
    DELETE FROM user_mistake_analysis WHERE user_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_user_mistake_stats ON users;
CREATE TRIGGER trigger_cleanup_user_mistake_stats
AFTER DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION cleanup_user_mistake_stats();

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '数据库迁移完成！';
  RAISE NOTICE '已添加智能分析相关表和字段';
  RAISE NOTICE '已创建索引优化查询性能';
  RAISE NOTICE '已创建视图和触发器自动化任务';
END $$;
