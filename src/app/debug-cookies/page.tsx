'use client';

import { useEffect, useState } from 'react';

export default function DebugCookiesPage() {
  const [cookies, setCookies] = useState<any>(null);
  const [authMe, setAuthMe] = useState<any>(null);
  const [allCookies, setAllCookies] = useState<string>('');

  useEffect(() => {
    // 检查 document.cookie
    setAllCookies(document.cookie);

    // 调用 /api/auth/me
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setAuthMe(data))
      .catch(err => setAuthMe({ error: String(err) }));
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cookie 调试页面</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">document.cookie</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
          {allCookies || '(空)'}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">/api/auth/me 响应</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
          {JSON.stringify(authMe, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">浏览器 Cookie 信息</h2>
        <p className="text-gray-600">
          注意：HttpOnly Cookie 无法通过 JavaScript 访问（document.cookie 中看不到）<br/>
          但可以在浏览器开发者工具的 Application -> Cookies 中查看
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">测试链接</h2>
        <div className="space-y-2">
          <a href="/" className="block text-blue-600 hover:underline">首页（自动跳转）</a>
          <a href="/dashboard" className="block text-blue-600 hover:underline">Dashboard</a>
          <a href="/login" className="block text-blue-600 hover:underline">登录页</a>
        </div>
      </div>
    </div>
  );
}
