'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Target, FileText, AlertCircle, Lightbulb, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Collocation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  category: string;
  difficulty: number;
  note?: string;
}

export default function GrammarPage() {
  const [collocations, setCollocations] = useState<Collocation[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取固定搭配数据
  useEffect(() => {
    fetch('/api/collocations')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCollocations(data.collocations);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 按类别分组
  const collocationGroups = collocations.reduce((groups: Record<string, Collocation[]>, collocation) => {
    const category = collocation.category || '其他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(collocation);
    return groups;
  }, {});

  // 易混淆搭配组
  const confusingCollocations = collocations.filter(c => c.category === '易混淆对比');
  const regularCollocations = collocations.filter(c => c.category !== '易混淆对比');

  // 将易混淆搭配按主题分组
  const confusingGroups = confusingCollocations.reduce((groups: Record<string, Collocation[]>, collocation) => {
    // 根据关键词分组
    let key = '其他';
    if (collocation.phrase.includes('arrive') || collocation.phrase.includes('reach') || collocation.phrase.includes('get to')) {
      key = '到达（arrive/reach/get to）';
    } else if (collocation.phrase.includes('spend') || collocation.phrase.includes('take') || collocation.phrase.includes('It takes')) {
      key = '花费（spend/take）';
    } else if (collocation.phrase.includes('say') || collocation.phrase.includes('talk') || collocation.phrase.includes('tell') || collocation.phrase.includes('speak')) {
      key = '说（say/talk/tell/speak）';
    } else if (collocation.phrase.includes('listen') || collocation.phrase.includes('hear')) {
      key = '听（listen/hear）';
    } else if (collocation.phrase.includes('look') || collocation.phrase.includes('see') || collocation.phrase.includes('watch')) {
      key = '看（look/see/watch）';
    } else if (collocation.phrase.includes('borrow') || collocation.phrase.includes('lend')) {
      key = '借（borrow/lend）';
    } else if (collocation.phrase.includes('bring') || collocation.phrase.includes('take') || collocation.phrase.includes('fetch')) {
      key = '带（bring/take/fetch）';
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(collocation);
    return groups;
  }, {});

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '动词短语': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      '易混淆对比': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      '其他': 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    };
    return colors[category] || colors['其他'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900">
      {/* 导航栏 */}
      <nav className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
              返回首页
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              语法学习
            </h1>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              固定搭配：{collocations.length} 个
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="confusing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="confusing">
                <Scale className="mr-2 h-4 w-4" />
                易混淆对比
              </TabsTrigger>
              <TabsTrigger value="regular">
                <BookOpen className="mr-2 h-4 w-4" />
                常用搭配
              </TabsTrigger>
              <TabsTrigger value="mistakes">
                <FileText className="mr-2 h-4 w-4" />
                错题库
              </TabsTrigger>
            </TabsList>

            {/* 易混淆对比 */}
            <TabsContent value="confusing" className="space-y-6">
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-6 w-6 text-red-600" />
                    <CardTitle>易混淆固定搭配对比</CardTitle>
                  </div>
                  <CardDescription>
                    这些搭配看起来相似，但用法有细微差异，需要特别注意！
                  </CardDescription>
                </CardHeader>
              </Card>

              {Object.entries(confusingGroups).map(([groupName, groupItems]) => (
                <Card key={groupName} className="border-red-200 dark:border-red-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <Lightbulb className="h-5 w-5" />
                      {groupName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {groupItems.map((item) => (
                      <div key={item.id} className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                        <div className="mb-2 flex items-start justify-between">
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            易混淆
                          </Badge>
                          {item.note && (
                            <Badge variant="outline" className="text-xs">
                              {item.note}
                            </Badge>
                          )}
                        </div>
                        <div className="mb-2">
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {item.phrase}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {item.meaning}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {item.example}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {item.exampleTranslation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 常用搭配 */}
            <TabsContent value="regular" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>常用固定搭配</CardTitle>
                  <CardDescription>
                    这些是初二阶段需要掌握的核心固定搭配，请完整记忆！
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {regularCollocations.map((collocation) => (
                  <Card key={collocation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {collocation.phrase}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {collocation.meaning}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-sm text-slate-900 dark:text-white">
                          {collocation.example}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {collocation.exampleTranslation}
                        </p>
                      </div>
                      {collocation.note && (
                        <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                          💡 {collocation.note}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 错题库 */}
            <TabsContent value="mistakes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    错题录入
                  </CardTitle>
                  <CardDescription>
                    录入错题，AI 自动分析语法知识点
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                      <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        点击或拖拽上传错题图片
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        支持 JPG、PNG 格式
                      </p>
                    </div>
                    <Button className="w-full">
                      手动录入错题
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>错题列表</CardTitle>
                  <CardDescription>按语法知识点分类整理</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    暂无错题，开始录入吧！
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
