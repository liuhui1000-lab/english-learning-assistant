'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DebugLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const colorClass = type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : type === 'warning' ? 'text-orange-600' : 'text-blue-600';
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogs([]);
    addLog('========== 开始登录流程 ==========');
    addLog(`用户名: ${username}`);
    addLog(`密码: ${password}`);

    try {
      addLog('准备发送登录请求...');

      const requestData = { username, password };
      addLog(`请求数据: ${JSON.stringify(requestData)}`);

      const fetchStart = performance.now();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      const fetchEnd = performance.now();

      addLog(`请求耗时: ${(fetchEnd - fetchStart).toFixed(2)}ms`);
      addLog(`响应状态: ${response.status} ${response.statusText}`);

      // 获取所有响应头
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      addLog(`响应头: ${JSON.stringify(headers, null, 2)}`);

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      addLog(`响应类型: ${contentType}`);

      // 解析响应
      let data;
      try {
        data = await response.json();
        addLog(`响应数据: ${JSON.stringify(data, null, 2)}`);
      } catch (parseError) {
        addLog(`解析响应失败: ${(parseError as Error).message}`, 'warning');
        const text = await response.text();
        addLog(`原始响应文本: ${text}`, 'warning');
        throw new Error('无法解析响应数据');
      }

      if (data.success) {
        addLog('✅ 登录成功！', 'success');
        addLog(`用户ID: ${data.data.id}`);
        addLog(`用户名: ${data.data.username}`);
        addLog(`角色: ${data.data.role}`);
        addLog(`消息: ${data.message}`);
        addLog('');
        addLog('========== 测试后续功能 ==========');
        addLog('1. 测试用户信息 API...');

        try {
          const meResponse = await fetch('/api/auth/me');
          addLog(`用户信息 API 响应: ${meResponse.status}`);
          const meData = await meResponse.json();
          addLog(`用户信息: ${JSON.stringify(meData, null, 2)}`);

          if (meData.success) {
            addLog('✅ 用户信息获取成功！', 'success');
          } else {
            addLog(`❌ 用户信息获取失败: ${meData.error}`, 'error');
          }
        } catch (meError) {
          addLog(`❌ 用户信息 API 调用失败: ${(meError as Error).message}`, 'error');
        }

        addLog('');
        addLog('========== 跳转建议 ==========');
        addLog('如果以上测试都成功，可以访问:');
        addLog('- Dashboard: http://localhost:5000/dashboard');
      } else {
        addLog('❌ 登录失败', 'error');
        addLog(`错误信息: ${data.error}`);
      }
    } catch (error) {
      addLog('❌ 网络错误', 'error');
      addLog(`错误类型: ${(error as Error).name}`);
      addLog(`错误消息: ${(error as Error).message}`);

      // 检查是否是 fetch 错误
      if ((error as Error).name === 'TypeError' && (error as Error).message.includes('fetch')) {
        addLog('提示: 可能是网络连接问题，请检查:');
        addLog('- 1. 服务器是否正在运行 (http://localhost:5000)');
        addLog('- 2. 浏览器控制台是否有 CORS 错误');
        addLog('- 3. 网络连接是否正常');
      }
    }

    addLog('========== 登录流程结束 ==========');
  };

  const checkLoginStatus = async () => {
    addLog('检查登录状态...');
    try {
      const statusResponse = await fetch('/api/debug/login-status');
      const statusData = await statusResponse.json();
      addLog(`登录状态: ${JSON.stringify(statusData, null, 2)}`);
    } catch (error) {
      addLog(`检查登录状态失败: ${(error as Error).message}`, 'warning');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-2">🔍 登录调试工具</h1>
          <p className="text-gray-600 mb-6">
            使用此工具排查登录问题。所有操作都会显示详细的日志。
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                用户名
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="输入用户名"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showPasswordCheckbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="showPasswordCheckbox" className="text-sm text-gray-600">
                显示密码
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
              >
                测试登录
              </button>
              <button
                type="button"
                onClick={checkLoginStatus}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
              >
                检查登录状态
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">调试日志</h2>
              <button
                onClick={() => setLogs([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                清空日志
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500">点击"测试登录"按钮开始调试...</p>
              ) : (
                logs.map((log, index) => (
                  <p key={index} className="mb-1">{log}</p>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">💡 使用说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 默认管理员账户: admin / admin123</li>
              <li>• 勾选"显示密码"可以确认输入是否正确</li>
              <li>• 点击"测试登录"会自动测试完整的登录流程</li>
              <li>• 点击"检查登录状态"可以查看当前的 Cookie 情况</li>
              <li>• 如果登录成功，可以访问 <Link href="/dashboard" className="text-indigo-600 hover:underline">Dashboard</Link></li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 如果仍然无法登录</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. 打开浏览器开发者工具（按 F12）</li>
              <li>2. 查看 Console 标签页是否有错误信息</li>
              <li>3. 查看 Network 标签页，检查 /api/auth/login 请求</li>
              <li>4. 查看 Application &gt; Cookies，检查是否有 auth_token</li>
              <li>5. 将上面的日志截图发送给我</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
