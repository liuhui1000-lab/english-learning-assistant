'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, User, LogOut, Settings, Shield, Key } from 'lucide-react';

interface UserInfo {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  name?: string;
}

export function Header() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserInfo();

    // 监听 auth-changed 事件（登录/登出）
    const handleAuthChange = () => {
      loadUserInfo();
    };

    // 监听 storage 事件（处理多标签页登录/登出）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        loadUserInfo();
        // 如果 token 被清除，跳转到登录页
        if (!e.newValue) {
          router.push('/login');
        }
      }
    };

    window.addEventListener('auth-changed', handleAuthChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  const loadUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success) {
        setUserInfo(data.data);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUserInfo(null);
      // 通知其他组件用户已登出
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: { loggedIn: false } }));
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const getUserInitials = () => {
    if (!userInfo) return '?';
    if (userInfo.name) {
      return userInfo.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return userInfo.email.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = () => {
    if (!userInfo) return null;
    return userInfo.role === 'admin' ? '管理员' : '用户';
  };

  return (
    <nav className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              初中英语学习助手
            </span>
          </Link>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-4">
            {/* 加载中 */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                加载中...
              </div>
            )}

            {/* 未登录 */}
            {!loading && !userInfo && (
              <div className="flex gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    登录
                  </Button>
                </Link>
              </div>
            )}

            {/* 已登录 */}
            {!loading && userInfo && (
              <>
                {/* 用户下拉菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:block text-left">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {userInfo.name || userInfo.email}
                        </div>
                        <div className="text-xs text-slate-500">
                          {getRoleBadge()}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userInfo.name || userInfo.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userInfo.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* 普通用户菜单项 */}
                    <DropdownMenuItem asChild>
                      <Link href="/vocabulary" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        <span>学习记录</span>
                      </Link>
                    </DropdownMenuItem>

                    {/* 管理员菜单项 */}
                    {userInfo.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          管理员功能
                        </DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/users" className="flex items-center gap-2 cursor-pointer">
                            <Shield className="h-4 w-4" />
                            <span>用户管理</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/library" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            <span>题库管理</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/ai-providers" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            <span>AI配置</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/change-password" className="flex items-center gap-2 cursor-pointer">
                            <Key className="h-4 w-4" />
                            <span>修改密码</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 cursor-pointer text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>登出</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
