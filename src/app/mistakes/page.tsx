'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Target, TrendingDown, RotateCcw } from 'lucide-react';

interface MistakeRecord {
  recordId: string;
  question: string;
  type: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  subcategory: string;
  source: string;
  questionNumber: string;
  createdAt: string;
}

interface WeakPoint {
  category: string;
  subcategory: string;
  errorCount: number;
  accuracy: number;
  weakLevel: number;
}

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMistakeData();
  }, []);

  const loadMistakeData = async () => {
    try {
      const response = await fetch('/api/grammar/mistakes?userId=demo_user');
      const data = await response.json();
      if (data.success) {
        setMistakes(data.data.mistakes);
        setWeakPoints(data.data.weakPoints);
      }
    } catch (error) {
      console.error('加载错题数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeakLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-red-100 text-red-800';
      case 4: return 'bg-red-200 text-red-900';
      case 5: return 'bg-red-300 text-red-950';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWeakLevelText = (level: number) => {
    switch (level) {
      case 1: return '需加强';
      case 2: return '薄弱';
      case 3: return '较薄弱';
      case 4: return '薄弱';
      case 5: return '严重薄弱';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>加载错题数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">错题本</h1>
          <p className="text-gray-600">系统整理你的错题，针对性强化薄弱知识点</p>
        </div>

        <Tabs defaultValue="mistakes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="mistakes">
              错题记录 ({mistakes.length})
            </TabsTrigger>
            <TabsTrigger value="weakness">
              薄弱点分析 ({weakPoints.length})
            </TabsTrigger>
          </TabsList>

          {/* 错题记录 */}
          <TabsContent value="mistakes" className="space-y-4">
            {mistakes.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-xl">还没有错题</CardTitle>
                  <CardDescription className="text-center">
                    开始练习后，错题会自动记录在这里
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4">
                {mistakes.map((mistake) => (
                  <Card key={mistake.recordId}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {mistake.questionNumber}. {mistake.question}
                          </CardTitle>
                          <CardDescription>
                            <Badge variant="outline" className="mr-2">{mistake.category}</Badge>
                            <Badge variant="secondary">{mistake.subcategory}</Badge>
                          </CardDescription>
                        </div>
                        <div className="text-xs text-gray-500">{mistake.source}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-medium text-red-900 mb-1">你的答案：</p>
                          <p className="text-red-700 font-semibold">{mistake.userAnswer}</p>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-medium text-green-900 mb-1">正确答案：</p>
                          <p className="text-green-700 font-semibold">{mistake.correctAnswer}</p>
                        </div>
                      </div>

                      {/* 语法讲解 */}
                      <Alert>
                        <BookOpen className="h-4 w-4" />
                        <AlertDescription className="ml-2">
                          <span className="font-medium">{mistake.category} - {mistake.subcategory}：</span>
                          {mistake.explanation}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 薄弱点分析 */}
          <TabsContent value="weakness" className="space-y-4">
            {weakPoints.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-xl">暂无薄弱点数据</CardTitle>
                  <CardDescription className="text-center">
                    继续练习，系统会自动分析你的薄弱知识点
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                {/* 薄弱点概览 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>总错题数</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{mistakes.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>薄弱知识点</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{weakPoints.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>平均正确率</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {weakPoints.length > 0
                          ? Math.round(weakPoints.reduce((sum, wp) => sum + wp.accuracy, 0) / weakPoints.length)
                          : 0}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 薄弱点列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="mr-2 h-5 w-5" />
                      薄弱知识点详情
                    </CardTitle>
                    <CardDescription>根据你的错题记录自动生成的薄弱点分析</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weakPoints
                        .sort((a, b) => b.weakLevel - a.weakLevel)
                        .map((wp, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <h3 className="font-semibold mr-2">
                                  {wp.category} - {wp.subcategory}
                                </h3>
                                <Badge className={getWeakLevelColor(wp.weakLevel)}>
                                  {getWeakLevelText(wp.weakLevel)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                错误 {wp.errorCount} 次 · 正确率 {wp.accuracy}%
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              强化练习
                            </Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* 快速操作 */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => window.location.href = '/grammar-practice'}
            size="lg"
            className="mr-4"
          >
            开始新练习
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.href = '/'}
          >
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
