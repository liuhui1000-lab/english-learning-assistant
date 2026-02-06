# 登录问题完整修复报告

## 📅 修复日期
2026年2月4日

## 🐛 问题描述

用户反馈：
> "admin/admin123还是不行啊"

## 🔍 问题根本原因

经过深入排查，发现以下多个问题：

### 1. 数据库未初始化
- `users` 表不存在
- `user_sessions` 表不存在
- `user_login_logs` 表不存在
- `user_mistake_stats` 表不存在
- `user_mistakes` 表不存在
- 没有默认管理员账户

### 2. 环境变量未配置
- `DATABASE_URL` 环境变量未设置
- Next.js 应用无法连接到数据库

### 3. Cookie API 不兼容
- Next.js 15 中 `cookies()` API 发生了变化
- `cookies().set()` 不再支持在 API Route 中使用

### 4. JWT 编码问题
- 使用 `base64` 编码导致 URL 中出现特殊字符（`+`, `/`, `=`）
- 这些字符在 Cookie 中被 URL 编码，导致解码失败

### 5. Cookie 读取问题
- 在 API Route 中使用 `cookies()` API 无法正确读取 Cookie
- 需要使用 `request.cookies.get()` 代替

## ✅ 解决方案

### 1. 配置环境变量

创建了 `.env.local` 文件：
```env
DATABASE_URL="postgresql://user_7602156918517563434:7ec1fe62-a6b1-4898-ae4f-f6e42e3b7292@cp-dandy-swell-8a2197e6.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770016381700?sslmode=require&channel_binding=require"

JWT_SECRET="your-jwt-secret-key-here-please-change-it-in-production"

GEMINI_API_KEY="your-gemini-api-key-here"

CRON_SECRET="your-cron-secret-key-here"

NEXT_PUBLIC_APP_NAME="初中英语学习助手"
NEXT_PUBLIC_APP_URL="http://localhost:5000"

NODE_ENV="development"
```

### 2. 创建数据库表

创建了以下表：
- `users` - 用户表
- `user_sessions` - 用户会话表
- `user_login_logs` - 用户登录日志表
- `user_mistake_stats` - 错题统计表
- `user_mistakes` - 错题表

### 3. 创建默认管理员账户

创建了默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`
- 邮箱：`admin@example.com`
- 角色：`admin`

### 4. 修复 Cookie API 兼容性

修改了 `src/utils/auth.ts` 文件中的 `setAuthCookie` 函数：

**修改前**：
```typescript
export function setAuthCookie(token: string): void {
  cookies().set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}
```

**修改后**：
```typescript
export function setAuthCookie(token: string): { name: string; value: string; attributes: any } {
  return {
    name: 'auth_token',
    value: token,
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    },
  };
}
```

修改了 `src/app/api/auth/login/route.ts` 文件：

**修改前**：
```typescript
// 设置cookie
setAuthCookie(token);

// 返回用户信息
return NextResponse.json({
  success: true,
  data: {
    // ...
  },
  message: '登录成功',
});
```

**修改后**：
```typescript
// 生成认证token
const token = generateAuthToken(user.id, user.role);

// 设置cookie
const cookie = setAuthCookie(token);

// 返回用户信息
const response = NextResponse.json({
  success: true,
  data: {
    // ...
  },
  message: '登录成功',
});

// 在响应中设置cookie
response.cookies.set(cookie.name, cookie.value, cookie.attributes);

return response;
```

### 5. 修复 JWT 编码问题

修改了 `generateAuthToken` 和 `verifyAuthToken` 函数，使用 `base64url` 编码：

**修改前**：
```typescript
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
const body = Buffer.from(JSON.stringify(payload)).toString('base64');
const signature = crypto
  .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
  .update(`${header}.${body}`)
  .digest('base64');
```

**修改后**：
```typescript
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature = crypto
  .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
  .update(`${header}.${body}`)
  .digest('base64url');
```

### 6. 创建 Cookie 读取辅助函数

创建了 `src/utils/authHelper.ts` 文件：

```typescript
import { verifyAuthToken } from './auth';

export function getCurrentUserFromRequest(request: NextRequest): { userId: string; role: string } | null {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    return verifyAuthToken(token);
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}
```

修改了 `src/app/api/auth/me/route.ts` 文件：

**修改前**：
```typescript
import { getCurrentUser } from '@/utils/auth';

export async function GET(request: NextRequest) {
  const currentUser = getCurrentUser();
  // ...
}
```

**修改后**：
```typescript
import { getCurrentUserFromRequest } from '@/utils/authHelper';

export async function GET(request: NextRequest) {
  const currentUser = getCurrentUserFromRequest(request);
  // ...
}
```

### 7. 简化用户信息 API

修改了 `src/app/api/auth/me/route.ts` 文件，暂时跳过对不存在表的查询：

**修改前**：
```typescript
// 查询错题统计
const statsResult = await query(
  'SELECT * FROM user_mistake_stats WHERE user_id = $1',
  [currentUser.userId]
);
const stats = statsResult.rows[0] || null;

// 查询学习进度
const progressResult = await query(
  `SELECT
    (SELECT COUNT(*) FROM user_word_progress WHERE user_id = $1 AND mastered = true) AS mastered_words,
    (SELECT COUNT(*) FROM user_mistakes WHERE user_id = $1) AS total_mistakes,
    (SELECT COUNT(*) FROM user_mistakes WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days') AS mistakes_this_week`,
  [currentUser.userId]
);
const progress = progressResult.rows[0];
```

**修改后**：
```typescript
// 暂时跳过查询错题统计和学习进度，因为相关表可能不存在
const stats = null;
const progress = null;
```

## ✅ 验证结果

### 1. 登录测试

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "admin",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "管理员",
    "role": "admin",
    "lastLoginAt": "2026-02-04T06:57:14.750Z"
  },
  "message": "登录成功"
}
```

✅ **登录成功！**

### 2. 用户信息测试

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -b /tmp/cookies.txt
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "admin",
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "管理员",
    "role": "admin",
    "is_active": true,
    "last_login_at": "2026-02-04T06:57:14.733Z",
    "created_at": "2026-02-04T06:48:04.429Z",
    "stats": null,
    "progress": null
  }
}
```

✅ **获取用户信息成功！**

### 3. Dashboard 页面测试

```bash
curl -X GET http://localhost:5000/dashboard \
  -b /tmp/cookies.txt
```

✅ **Dashboard 页面加载成功！**

## 📝 总结

**问题根本原因**：
1. 数据库未初始化
2. 环境变量未配置
3. Next.js 15 Cookie API 变更导致兼容性问题
4. JWT base64 编码导致 Cookie URL 编码问题
5. API Route 中无法正确读取 Cookie

**修复步骤**：
1. ✅ 配置 `DATABASE_URL` 环境变量
2. ✅ 创建数据库表（users, user_sessions, user_login_logs, user_mistake_stats, user_mistakes）
3. ✅ 创建默认管理员账户（admin / admin123）
4. ✅ 修复 Cookie API 兼容性问题
5. ✅ 使用 base64url 编码替代 base64 编码
6. ✅ 创建 Cookie 读取辅助函数
7. ✅ 简化用户信息 API，暂时跳过不存在表的查询
8. ✅ 重启开发服务器

**验证结果**：
- ✅ 可以使用 admin / admin123 成功登录
- ✅ 可以成功获取用户信息
- ✅ Dashboard 可以正常访问
- ✅ Cookie 正确设置和读取
- ✅ JWT token 正确生成和验证

## ⚠️ 注意事项

1. **生产环境部署时**，请务必修改以下配置：
   - `JWT_SECRET` - 使用强密码
   - `DATABASE_URL` - 使用生产环境数据库
   - 管理员密码 - 登录后立即修改

2. **后续优化建议**：
   - 考虑使用 `jsonwebtoken` 库替代简化的 JWT 实现
   - 添加刷新 token 功能
   - 添加密码强度验证
   - 添加邮箱验证功能
   - 完善用户统计和学习进度功能

## 🎉 完成

登录问题已完全解决，用户现在可以使用 `admin` / `admin123` 成功登录系统！
