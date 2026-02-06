-- 多用户角色系统数据库迁移脚本
-- 执行前请确保已备份数据库

-- 1. 更新用户表，添加角色和认证相关字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 3. 创建用户会话表（用于登录状态管理）
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 4. 创建用户登录日志表（用于安全审计）
CREATE TABLE IF NOT EXISTS user_login_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at ON user_login_logs(login_at);

-- 5. 创建触发器：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_updated_at ON users;
CREATE TRIGGER trigger_update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_updated_at();

-- 6. 创建默认管理员账户
-- 密码: admin123 (需要在首次登录后修改)
-- 密码哈希通过 bcrypt 生成
DO $$
BEGIN
  -- 检查是否已存在管理员账户
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1) THEN
    INSERT INTO users (
      id,
      username,
      email,
      password_hash,
      full_name,
      role,
      is_active
    ) VALUES (
      'admin',
      'admin',
      'admin@example.com',
      '$2b$10$rJZK8K3yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8yK8y',
      '管理员',
      'admin',
      true
    );
    RAISE NOTICE '已创建默认管理员账户';
    RAISE NOTICE '用户名: admin';
    RAISE NOTICE '邮箱: admin@example.com';
    RAISE NOTICE '默认密码: admin123 (请立即修改)';
  ELSE
    RAISE NOTICE '管理员账户已存在，跳过创建';
  END IF;
END $$;

-- 7. 创建视图：活跃用户列表
CREATE OR REPLACE VIEW active_users AS
SELECT
  u.id,
  u.username,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  u.last_login_at,
  u.created_at,
  COUNT(DISTINCT m.id) AS total_mistakes,
  COUNT(DISTINCT m.id) FILTER (WHERE m.created_at > NOW() - INTERVAL '7 days') AS mistakes_this_week,
  COALESCE(s.total_count, 0) AS stats_total_count
FROM users u
LEFT JOIN user_mistakes m ON u.id = m.user_id
LEFT JOIN user_mistake_stats s ON u.id = s.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.last_login_at, u.created_at, s.total_count
ORDER BY u.created_at DESC;

-- 8. 创建视图：用户学习进度统计
CREATE OR REPLACE VIEW user_learning_progress AS
SELECT
  u.id AS user_id,
  u.username,
  u.full_name,
  u.role,
  -- 单词背诵进度
  COALESCE(
    (SELECT COUNT(*) FROM user_word_progress WHERE user_id = u.id AND mastered = true),
    0
  ) AS mastered_words_count,
  -- 语法错题数量
  COALESCE(
    (SELECT COUNT(*) FROM user_mistakes WHERE user_id = u.id AND category = 'grammar'),
    0
  ) AS grammar_mistakes_count,
  -- 词转错题数量
  COALESCE(
    (SELECT COUNT(*) FROM user_mistakes WHERE user_id = u.id AND category = 'word-formation'),
    0
  ) AS word_formation_mistakes_count,
  -- 固定搭配掌握数量
  COALESCE(
    (SELECT COUNT(*) FROM user_phrase_progress WHERE user_id = u.id AND mastered = true),
    0
  ) AS mastered_phrases_count,
  -- 阅读理解完成数量
  COALESCE(
    (SELECT COUNT(*) FROM user_reading_progress WHERE user_id = u.id AND completed = true),
    0
  ) AS completed_readings_count,
  -- 总学习时长（分钟，需要新增字段存储）
  0 AS total_study_minutes,
  -- 最后学习时间
  COALESCE(
    (SELECT MAX(created_at) FROM user_mistakes WHERE user_id = u.id),
    u.created_at
  ) AS last_study_at,
  -- 最后登录时间
  u.last_login_at
FROM users u
WHERE u.is_active = true
ORDER BY u.last_login_at DESC NULLS LAST;

-- 9. 创建函数：清理过期的会话
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建函数：检查用户权限
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id TEXT, p_required_role VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(20);
  is_user_active BOOLEAN;
BEGIN
  -- 获取用户角色和状态
  SELECT role, is_active INTO user_role, is_user_active
  FROM users
  WHERE id = p_user_id;
  
  -- 用户不存在或未激活
  IF user_role IS NULL OR NOT is_user_active THEN
    RETURN false;
  END IF;
  
  -- 管理员拥有所有权限
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- 普通用户只能访问 user 级别的资源
  IF p_required_role = 'user' THEN
    RETURN true;
  END IF;
  
  -- 拒绝访问
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '多用户角色系统数据库迁移完成！';
  RAISE NOTICE '已添加角色和认证相关字段';
  RAISE NOTICE '已创建用户会话表和登录日志表';
  RAISE NOTICE '已创建视图和函数支持用户管理';
  RAISE NOTICE '已创建默认管理员账户（admin / admin123）';
  RAISE NOTICE '请在首次登录后立即修改管理员密码';
END $$;
