-- 题库版本管理系统数据库迁移脚本
-- 支持题库版本管理、批量导入、历史记录

-- 1. 创建题库版本表
CREATE TABLE IF NOT EXISTS library_versions (
  id SERIAL PRIMARY KEY,
  library_type VARCHAR(50) NOT NULL, -- 'word' | 'grammar' | 'phrase' | 'reading'
  version VARCHAR(20) NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '{}', -- 记录变更内容
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false, -- 当前激活的版本
  UNIQUE (library_type, version)
);

CREATE INDEX IF NOT EXISTS idx_library_versions_type ON library_versions(library_type);
CREATE INDEX IF NOT EXISTS idx_library_versions_active ON library_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_library_versions_created_at ON library_versions(created_at);

-- 2. 创建导入任务表
CREATE TABLE IF NOT EXISTS import_tasks (
  id SERIAL PRIMARY KEY,
  library_type VARCHAR(50) NOT NULL, -- 'word' | 'grammar' | 'phrase' | 'reading'
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_format VARCHAR(20), -- 'json' | 'csv' | 'xlsx'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'processing' | 'success' | 'failed'
  total_items INTEGER DEFAULT 0,
  success_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_message TEXT,
  changes JSONB DEFAULT '{}', -- 记录添加/修改/删除的数量
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_type ON import_tasks(library_type);
CREATE INDEX IF NOT EXISTS idx_import_tasks_status ON import_tasks(status);
CREATE INDEX IF NOT EXISTS idx_import_tasks_created_at ON import_tasks(created_at);

-- 3. 更新单词表，添加版本支持
ALTER TABLE words
ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES library_versions(id),
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_words_version ON words(version_id);

-- 4. 更新语法题表，添加版本支持（如果存在）
-- 注意：如果表中没有相关字段，需要根据实际表结构调整
-- ALTER TABLE grammar_questions
-- ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES library_versions(id),
-- ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id),
-- ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id),
-- ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 5. 更新固定搭配表，添加版本支持（如果存在）
-- ALTER TABLE phrases
-- ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES library_versions(id),
-- ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id),
-- ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id),
-- ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 6. 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_words_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_words_updated_at ON words;
CREATE TRIGGER trigger_update_words_updated_at
BEFORE UPDATE ON words
FOR EACH ROW
EXECUTE FUNCTION update_words_updated_at();

-- 7. 创建函数：激活题库版本
CREATE OR REPLACE FUNCTION activate_library_version(p_library_type VARCHAR, p_version VARCHAR, p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_version_id INTEGER;
BEGIN
  -- 查找版本
  SELECT id INTO v_version_id
  FROM library_versions
  WHERE library_type = p_library_type AND version = p_version;
  
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION '版本不存在';
  END IF;
  
  -- 取消其他版本的激活状态
  UPDATE library_versions
  SET is_active = false
  WHERE library_type = p_library_type;
  
  -- 激活指定版本
  UPDATE library_versions
  SET is_active = true
  WHERE id = v_version_id;
  
  -- 更新单词表的版本ID（示例，需要根据实际表结构调整）
  UPDATE words
  SET version_id = v_version_id
  WHERE version_id IS NULL OR version_id IN (
    SELECT id FROM library_versions WHERE library_type = p_library_type
  );
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建视图：题库版本列表
CREATE OR REPLACE VIEW library_version_list AS
SELECT
  lv.id,
  lv.library_type,
  lv.version,
  lv.description,
  lv.changes,
  lv.is_active,
  lv.created_at,
  u.username AS created_by_name,
  u.email AS created_by_email,
  -- 统计当前版本的题目数量
  CASE lv.library_type
    WHEN 'word' THEN (SELECT COUNT(*) FROM words WHERE version_id = lv.id)
    -- WHEN 'grammar' THEN (SELECT COUNT(*) FROM grammar_questions WHERE version_id = lv.id)
    -- WHEN 'phrase' THEN (SELECT COUNT(*) FROM phrases WHERE version_id = lv.id)
    ELSE 0
  END AS item_count,
  -- 统计最近一次导入
  (
    SELECT json_build_object(
      'file_name', file_name,
      'status', status,
      'total_items', total_items,
      'success_items', success_items,
      'created_at', created_at
    )
    FROM import_tasks
    WHERE library_type = lv.library_type
    AND created_at > (lv.created_at - INTERVAL '1 hour')
    ORDER BY created_at DESC
    LIMIT 1
  ) AS recent_import
FROM library_versions lv
JOIN users u ON lv.created_by = u.id
ORDER BY lv.library_type, lv.created_at DESC;

-- 9. 创建视图：导入任务列表
CREATE OR REPLACE VIEW import_task_list AS
SELECT
  it.id,
  it.library_type,
  it.file_name,
  it.file_size,
  it.file_format,
  it.status,
  it.total_items,
  it.success_items,
  it.failed_items,
  it.error_message,
  it.changes,
  it.created_at,
  it.completed_at,
  u.username AS created_by_name,
  u.email AS created_by_email,
  -- 计算处理时长
  CASE
    WHEN it.completed_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (it.completed_at - it.created_at))
  END AS duration_seconds,
  -- 计算成功率
  CASE
    WHEN it.total_items = 0 THEN 0
    ELSE ROUND((it.success_items::NUMERIC / it.total_items) * 100, 2)
  END AS success_rate
FROM import_tasks it
JOIN users u ON it.created_by = u.id
ORDER BY it.created_at DESC;

-- 10. 创建函数：统计题库版本变更
CREATE OR REPLACE FUNCTION record_version_changes(p_library_type VARCHAR, p_version VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_changes JSONB;
BEGIN
  -- 统计变更内容
  v_changes := jsonb_build_object(
    'word_count', (SELECT COUNT(*) FROM words WHERE version_id = (
      SELECT id FROM library_versions WHERE library_type = p_library_type AND version = p_version
    ))
    -- 可以添加更多统计
  );
  
  -- 更新版本的变更记录
  UPDATE library_versions
  SET changes = v_changes
  WHERE library_type = p_library_type AND version = p_version;
END;
$$ LANGUAGE plpgsql;

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '题库版本管理系统迁移完成！';
  RAISE NOTICE '已创建题库版本表和导入任务表';
  RAISE NOTICE '已创建视图和函数支持题库管理';
  RAISE NOTICE '已添加版本支持到单词表';
  RAISE NOTICE '请根据实际的表结构调整其他表的版本字段';
END $$;
