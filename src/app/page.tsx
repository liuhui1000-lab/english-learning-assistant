'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * 首页 - 重定向到登录页
 * 用户未登录时跳转到登录页
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到登录页
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">正在跳转到登录页...</p>
      </div>
    </div>
  );
}
