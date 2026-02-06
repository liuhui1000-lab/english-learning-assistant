/**
 * 创建默认管理员账户脚本
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('正在连接数据库...');

    console.log('正在检查users表是否存在...');
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      )
    `);
    const tableExists = tableExistsResult.rows[0].exists;

    if (!tableExists) {
      console.log('users表不存在，正在创建...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password_hash TEXT,
          full_name TEXT,
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          is_active BOOLEAN DEFAULT true,
          last_login_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 创建索引
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)`);

      console.log('users表创建成功');
    } else {
      console.log('users表已存在');
    }

    console.log('正在生成admin123的密码哈希...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log('密码哈希:', passwordHash);

    console.log('正在检查是否已存在admin用户...');
    const existingAdminResult = await pool.query(`
      SELECT id FROM users WHERE username = 'admin'
    `);
    const existingAdmin = existingAdminResult.rows[0];

    if (existingAdmin) {
      console.log('admin用户已存在，正在更新密码...');
      await pool.query(`
        UPDATE users
        SET
          password_hash = $1,
          email = 'admin@example.com',
          full_name = '管理员',
          role = 'admin',
          is_active = true,
          updated_at = NOW()
        WHERE username = 'admin'
      `, [passwordHash]);
      console.log('admin用户密码更新成功');
    } else {
      console.log('正在创建admin用户...');
      await pool.query(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
        VALUES ('admin', 'admin', 'admin@example.com', $1, '管理员', 'admin', true)
      `, [passwordHash]);
      console.log('admin用户创建成功');
    }

    console.log('\n✅ 默认管理员账户创建/更新成功！');
    console.log('用户名: admin');
    console.log('邮箱: admin@example.com');
    console.log('密码: admin123');
    console.log('\n请立即登录并修改密码！');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdminUser();
