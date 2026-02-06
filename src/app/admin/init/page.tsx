'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminInitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [formData, setFormData] = useState({
    username: 'admin',
    email: 'admin@example.com',
    password: '',
    confirmPassword: '',
    masterKey: 'init-admin-2024',
  });
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    checkInitialization();
  }, []);

  const checkInitialization = async () => {
    try {
      const response = await fetch('/api/admin/init');
      const data = await response.json();
      if (data.success) {
        setIsInitialized(data.data.initialized);
      }
    } catch (error) {
      console.error('检查系统状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证密码
    if (formData.password.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    setIsInitializing(true);

    try {
      const response = await fetch('/api/admin/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          masterKey: formData.masterKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('系统初始化成功！管理员账户已创建。');
        router.push('/login');
      } else {
        alert(`初始化失败：${data.error}`);
      }
    } catch (error) {
      console.error('初始化失败:', error);
      alert('初始化失败');
    } finally {
      setIsInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">检查系统状态...</p>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">系统已初始化</CardTitle>
            <CardDescription>
              系统已经完成初始化，管理员账户已创建。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">初始化系统</CardTitle>
          <CardDescription>
            创建第一个管理员账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">重要提示</p>
                <p>系统尚未初始化。请创建第一个管理员账户。此操作只能执行一次。</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleInitialize} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="输入管理员用户名"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="输入管理员邮箱"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="输入密码（至少6位）"
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="再次输入密码"
                required
              />
            </div>

            <div>
              <Label htmlFor="masterKey">主密钥</Label>
              <Input
                id="masterKey"
                type="password"
                value={formData.masterKey}
                onChange={(e) => setFormData({ ...formData, masterKey: e.target.value })}
                placeholder="输入主密钥"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                默认主密钥：init-admin-2024（请在生产环境中修改）
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isInitializing}
            >
              {isInitializing ? '初始化中...' : '初始化系统'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
