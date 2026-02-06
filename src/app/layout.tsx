import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: '初中英语学习助手',
  description: '单词背诵 · 语法学习 · 阅读理解',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <Header />
          <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
