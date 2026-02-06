'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, FileText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ReadingPage() {
  // 示例阅读材料
  const articles = [
    {
      id: 1,
      title: 'A Trip to Shanghai',
      level: '中等',
      wordCount: 250,
      readTime: 5,
      description: '了解上海这座美丽城市的魅力',
      category: '城市介绍',
    },
    {
      id: 2,
      title: 'My Best Friend',
      level: '简单',
      wordCount: 180,
      readTime: 3,
      description: '关于我最好的朋友的故事',
      category: '人物故事',
    },
    {
      id: 3,
      title: 'Healthy Eating Habits',
      level: '中等',
      wordCount: 220,
      readTime: 4,
      description: '培养健康的饮食习惯',
      category: '生活健康',
    },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case '简单':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case '中等':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case '困难':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-950 dark:to-slate-900">
      {/* 导航栏 */}
      <nav className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
              返回首页
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              阅读理解
            </h1>
            <div className="w-24" />
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* 统计信息 */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <BookOpen className="h-4 w-4" />
                  已读文章
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">0</p>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  累计阅读
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-pink-600">0</p>
                <p className="text-xs text-slate-500">分钟</p>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <Star className="h-4 w-4" />
                  平均正确率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-indigo-600">0%</p>
              </CardContent>
            </Card>
          </div>

          {/* 文章列表 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              推荐文章
            </h2>

            {articles.map((article) => (
              <Card
                key={article.id}
                className="transition-all hover:shadow-lg"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{article.title}</CardTitle>
                      <CardDescription>{article.description}</CardDescription>
                    </div>
                    <Badge className={getLevelColor(article.level)}>
                      {article.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {article.wordCount} 词
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {article.readTime} 分钟
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {article.category}
                      </span>
                    </div>
                    <Button size="sm">
                      开始阅读
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
