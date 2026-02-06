'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookMarked,
  GraduationCap,
  BookOpen,
  Upload,
  TrendingUp,
  Users,
  Settings,
  FileText,
  Shield,
  Database,
  Bot,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface UserInfo {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  name?: string;
}

interface Stats {
  vocabulary: number;
  grammar: number;
  reading: number;
  mistakes: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    vocabulary: 0,
    grammar: 0,
    reading: 0,
    mistakes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // 加载用户信息
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userData.success) {
        // 未登录，跳转到登录页
        router.push('/login');
        return;
      }

      setUserInfo(userData.data);

      // 加载统计数据
      const statsRes = await fetch('/api/user/stats');
      const statsData = await statsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 普通用户模块
  const userModules = [
    {
      icon: <BookMarked className="h-8 w-8 text-blue-500" />,
      title: '单词背诵',
      description: '艾宾浩斯记忆曲线，智能安排复习计划',
      path: '/vocabulary',
      color: 'bg-blue-50 dark:bg-blue-950',
      stats: `${stats.vocabulary} 个单词`,
    },
    {
      icon: <GraduationCap className="h-8 w-8 text-green-500" />,
      title: '语法练习',
      description: '错题智能归类，针对薄弱知识点强化',
      path: '/grammar-practice',
      color: 'bg-green-50 dark:bg-green-950',
      stats: `${stats.grammar} 道题`,
    },
    {
      icon: <FileText className="h-8 w-8 text-orange-500" />,
      title: '词转练习',
      description: '用所给词的正确形式填空，掌握词形变化规律',
      path: '/transformation',
      color: 'bg-orange-50 dark:bg-orange-950',
      stats: '269组练习',
    },
    {
      icon: <BookOpen className="h-8 w-8 text-purple-500" />,
      title: '阅读理解',
      description: '分级阅读材料，长难句智能分析',
      path: '/reading',
      color: 'bg-purple-50 dark:bg-purple-950',
      stats: `${stats.reading} 篇文章`,
    },
    {
      icon: <Upload className="h-8 w-8 text-indigo-500" />,
      title: '错题上传',
      description: '上传错题图片，AI智能识别并归类',
      path: '/mistakes/upload',
      color: 'bg-indigo-50 dark:bg-indigo-950',
      stats: `${stats.mistakes} 道错题`,
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-pink-500" />,
      title: '固定搭配专项',
      description: '针对高频搭配的专门训练',
      path: '/collocations',
      color: 'bg-pink-50 dark:bg-pink-950',
      stats: '500+ 搭配',
    },
  ];

  // 管理员模块
  const adminModules = [
    {
      icon: <Users className="h-8 w-8 text-red-500" />,
      title: '用户管理',
      description: '管理用户账号、权限和学习进度',
      path: '/admin/users',
      color: 'bg-red-50 dark:bg-red-950',
      stats: undefined,
    },
    {
      icon: <Sparkles className="h-8 w-8 text-green-500" />,
      title: '智能导入',
      description: '统一导入单词、语法、模拟卷等数据',
      path: '/admin/smart-import',
      color: 'bg-green-50 dark:bg-green-950',
      stats: undefined,
    },
    {
      icon: <Bot className="h-8 w-8 text-purple-500" />,
      title: 'AI配置',
      description: '配置AI服务提供商',
      path: '/admin/ai-providers',
      color: 'bg-purple-50 dark:bg-purple-950',
      stats: undefined,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!userInfo) {
    return null; // 会自动跳转到登录页
  }

  const isAdmin = userInfo.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-2">
            欢迎回来，{userInfo.name || userInfo.email}！
          </h1>
          <p className="text-blue-100">
            {isAdmin ? '管理员模式 - 管理系统资源和用户' : '开始今天的学习吧！'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 用户角色标识 */}
        <div className="mb-6 flex items-center gap-2">
          {isAdmin ? (
            <Badge variant="default" className="bg-red-500">
              <Shield className="h-3 w-3 mr-1" />
              管理员
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              学生
            </Badge>
          )}
        </div>

        {/* 学习/管理数据统计 */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                {isAdmin ? '总用户数' : '今日学习'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {isAdmin ? '0' : stats.vocabulary}
                </span>
                <span className="text-sm text-slate-500">
                  {isAdmin ? '人' : '个单词'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                {isAdmin ? '今日活跃' : '语法错题'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-600">
                  {isAdmin ? '0' : stats.grammar}
                </span>
                <span className="text-sm text-slate-500">道</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                {isAdmin ? '题目总数' : '阅读文章'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-600">
                  {isAdmin ? '0' : stats.reading}
                </span>
                <span className="text-sm text-slate-500">篇</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                {isAdmin ? '错题总数' : '错题数量'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-600">
                  {isAdmin ? '0' : stats.mistakes}
                </span>
                <span className="text-sm text-slate-500">道</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 功能模块 */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
            {isAdmin ? '管理功能' : '学习模块'}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(isAdmin ? adminModules : userModules).map((module) => (
              <Link key={module.path} href={module.path}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
                  <CardHeader>
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl ${module.color}`}>
                      {module.icon}
                    </div>
                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  {module.stats && (
                    <CardContent>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {module.stats}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* 使用提示 */}
        <div className="mt-12 rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
          <h3 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
            💡 {isAdmin ? '管理员提示' : '学习提示'}
          </h3>
          <ul className="list-inside list-disc space-y-2 text-sm text-blue-800 dark:text-blue-200">
            {isAdmin ? (
              <>
                <li>管理用户账号和学习进度</li>
                <li>导入题库数据（单词、语法题、模拟卷）</li>
                <li>配置AI服务提供商</li>
                <li>定期查看系统统计数据</li>
              </>
            ) : (
              <>
                <li>建议每天安排 30 分钟进行单词复习</li>
                <li>错题本会自动记录你的错误，定期回顾有助于提高成绩</li>
                <li>完成语法练习后，查看错题分析</li>
                <li>阅读理解文章时，注意长难句分析</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
