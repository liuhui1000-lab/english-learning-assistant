'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function DebugAllUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/debug/users');
        const data = await response.json();

        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error || '加载失败');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  if (loading) {
    return <div className="p-8">加载中...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">数据库中的所有用户（调试页面）</h1>
      <p className="text-gray-600 mb-4">
        总计: <span className="font-bold text-blue-600">{users.length}</span> 个用户
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 p-2 text-left">ID</th>
              <th className="border border-gray-200 p-2 text-left">用户名</th>
              <th className="border border-gray-200 p-2 text-left">邮箱</th>
              <th className="border border-gray-200 p-2 text-left">姓名</th>
              <th className="border border-gray-200 p-2 text-left">角色</th>
              <th className="border border-gray-200 p-2 text-left">状态</th>
              <th className="border border-gray-200 p-2 text-left">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-2 text-xs">{user.id}</td>
                <td className="border border-gray-200 p-2">{user.username}</td>
                <td className="border border-gray-200 p-2">{user.email}</td>
                <td className="border border-gray-200 p-2">{user.full_name || '-'}</td>
                <td className="border border-gray-200 p-2">
                  <span className={`px-2 py-1 rounded ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="border border-gray-200 p-2">
                  <span className={`px-2 py-1 rounded ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? '活跃' : '禁用'}
                  </span>
                </td>
                <td className="border border-gray-200 p-2 text-sm">
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
