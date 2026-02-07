'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * 首页 - 根据登录状态重定向
 * 用户已登录时跳转到 dashboard，未登录时跳转到登录页
 */
export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (data.success && data.data) {
          // 用户已登录，跳转到 dashboard
          router.replace('/dashboard');
        } else {
          // 用户未登录，跳转到登录页
          router.replace('/login');
        }
      } catch (error) {
        // 出错时跳转到登录页
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">加载中...</p>
      </div>
    </div>
  );
}
