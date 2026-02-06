'use client';

import { useState, useEffect } from 'react';
import { Volume2, ArrowLeft, Target, Check, X, AlertTriangle, TrendingDown, BarChart3, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { useAutoSave } from '@/hooks/useAutoSave';

interface TransformationItem {
  word: string;
  meaning: string;
  type: string;
  sentence: string;
}

interface WordTransformation {
  id: string;
  baseWord: string;
  baseMeaning: string;
  transformations: TransformationItem[];
  difficulty: number;
}

interface MistakeAnalysis {
  transformation: {
    totalMistakes: number;
    uniqueWords: number;
    masteredCount: number;
    weakTypes: Array<{
      type: string;
      count: number;
      errorCount: number;
      masteredCount: number;
    }>;
    frequentMistakes: Array<{
      id: string;
      word: string;
      type: string;
      sentence: string;
      wrongAnswer: string;
      correctAnswer: string;
      errorCount: number;
    }>;
  };
  grammar: any;
  summary: any;
}

export default function TransformationPractice() {
  const [transformations, setTransformations] = useState<WordTransformation[]>([]);
  const [currentGroup, setCurrentGroup] = useState<WordTransformation[]>([]);  // 当前组（5个单词）
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);  // 当前是第几组
  const [loading, setLoading] = useState(true);
  const [transformationAnswers, setTransformationAnswers] = useState<Record<string, string>>({});
  const [transformationResults, setTransformationResults] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);  // 是否显示结果
  const [analysis, setAnalysis] = useState<MistakeAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'practice' | 'mistakes' | 'analysis' | 'review'>('practice');
  const [submittedCount, setSubmittedCount] = useState(0);  // 已填写的题目数

  // 错题复习相关状态
  const [reviewTasks, setReviewTasks] = useState<WordTransformation[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  // 自动保存功能 - 每1分钟保存一次
  const { loadSavedData: loadTransformationSavedData, clearSavedData: clearTransformationSavedData } = useAutoSave({
    interval: 60000, // 1分钟
    storageKey: 'transformation-practice-progress',
    data: {
      currentGroupIndex,
      transformationAnswers,
      activeTab,
      savedAt: new Date().toISOString(),
    },
  });

  // 页面加载时恢复进度
  useEffect(() => {
    const savedData = loadTransformationSavedData();
    if (savedData && savedData.transformation) {
      // 恢复进度
      setCurrentGroupIndex(savedData.transformation.currentGroupIndex);
      setTransformationAnswers(savedData.transformation.transformationAnswers);
      setActiveTab(savedData.transformation.activeTab);
      console.log('[词转练习] 已恢复保存的进度');
    }
  }, []);

  // 计算当前组的总题目数
  const totalQuestionsInGroup = currentGroup.reduce(
    (sum, item) => sum + item.transformations.length,
    0
  );

  // 从 API 获取词转数据（一次加载所有，然后分组）
  useEffect(() => {
    setLoading(true);
    fetch('/api/vocabulary/transformations')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mappedData = data.transformations.map((item: any) => ({
            ...item,
            baseWord: item.base_word,
            baseMeaning: item.base_meaning,
          }));
          // 过滤掉没有变形的单词
          const validData = mappedData.filter((item: WordTransformation) =>
            item.transformations && item.transformations.length > 0
          );
          setTransformations(validData);
          // 加载第一组
          loadGroup(0, validData);
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 加载指定组
  const loadGroup = (groupIndex: number, allTransformations?: WordTransformation[]) => {
    const data = allTransformations || transformations;
    const startIndex = groupIndex * 5;
    const group = data.slice(startIndex, startIndex + 5);
    setCurrentGroup(group);
    setCurrentGroupIndex(groupIndex);
    setTransformationAnswers({});
    setTransformationResults({});
    setShowResults(false);
    setSubmittedCount(0);
  };

  // 获取错题分析
  useEffect(() => {
    fetch('/api/vocabulary/transformations/analysis?userId=default-user&type=all')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalysis(data.data);
        }
      })
      .catch(console.error);
  }, []);

  // 更新已填写数量
  useEffect(() => {
    setSubmittedCount(Object.keys(transformationAnswers).filter(
      key => transformationAnswers[key]?.trim() !== ''
    ).length);
  }, [transformationAnswers]);

  // 加载错题复习任务
  const loadReviewTasks = async () => {
    setReviewLoading(true);
    try {
      const response = await fetch('/api/vocabulary/transformations/progress?userId=default-user&limit=10');
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setReviewTasks(data.data.map((item: any) => ({
          id: item.id,
          baseWord: item.word,
          baseMeaning: item.baseMeaning || '',
          transformations: item.transformations || [],
          difficulty: 1,
        })));
      } else {
        setReviewTasks([]);
      }
    } catch (error) {
      console.error('加载复习任务失败:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  // 切换到错题复习Tab时加载复习任务
  useEffect(() => {
    if (activeTab === 'review') {
      loadReviewTasks();
    }
  }, [activeTab]);

  // 批改答案并记录错题（统一批改）
  const handleSubmit = async () => {
    const newResults: Record<string, boolean> = {};
    const mistakesToRecord: any[] = [];
    const progressRecords: any[] = [];  // 学习进度记录

    currentGroup.forEach((groupItem, groupIdx) => {
      groupItem.transformations.forEach((transformation, idx) => {
        const answerKey = `${groupIdx}-${idx}`;
        const userAnswer = transformationAnswers[answerKey] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === transformation.word.toLowerCase();
        newResults[answerKey] = isCorrect;

        // 记录学习进度（根据艾宾浩斯记忆曲线）
        progressRecords.push({
          userId: 'default-user',
          transformationId: groupItem.id,
          word: transformation.word,
          isCorrect,
          userAnswer,
        });

        // 记录错题
        if (!isCorrect && userAnswer.trim() !== '') {
          mistakesToRecord.push({
            userId: 'default-user',
            transformationId: groupItem.id,
            word: transformation.word,
            type: transformation.type,
            sentence: transformation.sentence,
            wrongAnswer: userAnswer,
            correctAnswer: transformation.word,
            mistakeType: '变形错误',
            explanation: `正确答案是 "${transformation.word}"，这是${transformation.type}`,
          });
        }
      });
    });

    setTransformationResults(newResults);
    setShowResults(true);

    // 提交学习进度记录（根据艾宾浩斯记忆曲线）
    Promise.all(
      progressRecords.map(record =>
        fetch('/api/vocabulary/transformations/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
      )
    ).catch(console.error);

    // 提交错题记录
    if (mistakesToRecord.length > 0) {
      Promise.all(
        mistakesToRecord.map(mistake =>
          fetch('/api/vocabulary/transformations/mistakes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mistake),
          })
        )
      ).catch(console.error);
    }
  };

  // 加载下一组
  const handleNextGroup = () => {
    loadGroup(currentGroupIndex + 1);
  };

  // 重新开始当前组
  const handleRetry = () => {
    setTransformationAnswers({});
    setTransformationResults({});
    setShowResults(false);
    setSubmittedCount(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

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
              词转练习
            </h1>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              词库：{transformations.length} 组
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="practice">
                <Target className="mr-2 h-4 w-4" />
                练习
              </TabsTrigger>
              <TabsTrigger value="review">
                <RefreshCw className="mr-2 h-4 w-4" />
                错题复习
              </TabsTrigger>
              <TabsTrigger value="mistakes">
                <AlertTriangle className="mr-2 h-4 w-4" />
                错题本
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <BarChart3 className="mr-2 h-4 w-4" />
                薄弱分析
              </TabsTrigger>
            </TabsList>

            {/* 练习模式 */}
            <TabsContent value="practice">
              {transformations.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <Target className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      暂无词转练习题
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      词库中没有有效的词形转换题目，请先添加练习题
                    </p>
                  </CardContent>
                </Card>
              ) : currentGroup.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-6 w-6 text-purple-600" />
                          词形转换练习
                        </CardTitle>
                        <CardDescription>
                          用所给词的正确形式填空（上海中考题型）
                        </CardDescription>
                      </div>
                      {!showResults && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          已填写 {submittedCount} / {totalQuestionsInGroup} 题
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 分组进度 */}
                    {!showResults && (
                      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-blue-700 dark:text-blue-300 font-medium">
                            当前进度：第 {currentGroupIndex + 1} 组 / 共 {Math.ceil(transformations.length / 5)} 组
                          </span>
                          <span className="text-blue-700 dark:text-blue-300">
                            ({currentGroupIndex * 5 + 1} - {Math.min((currentGroupIndex + 1) * 5, transformations.length)} 词)
                          </span>
                        </div>
                        <Progress value={((currentGroupIndex + 1) / Math.ceil(transformations.length / 5)) * 100} className="h-2" />
                      </div>
                    )}

                    {/* 显示当前组的所有单词 */}
                    {currentGroup.map((groupItem, groupIdx) => (
                      <div key={groupIdx} className="rounded-lg border-2 border-purple-200 bg-white dark:border-purple-800 dark:bg-slate-800 overflow-hidden">
                        {/* 单词卡片头部 */}
                        <div className="bg-purple-50 p-4 dark:bg-purple-950">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                                单词 {currentGroupIndex * 5 + groupIdx + 1} / {transformations.length}
                              </p>
                              <div className="flex items-baseline gap-3">
                                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                                  {groupItem.baseWord}
                                </p>
                                <p className="text-slate-600 dark:text-slate-400">
                                  {groupItem.baseMeaning}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-white dark:bg-slate-700">
                              {groupItem.transformations.length} 个变形
                            </Badge>
                          </div>
                        </div>

                        {/* 变形题目 */}
                        <div className="p-4 space-y-4">
                          {groupItem.transformations.map((transformation, idx) => {
                            const answerKey = `${groupIdx}-${idx}`;
                            const userAnswer = transformationAnswers[answerKey] || '';
                            const result = transformationResults[answerKey];

                            return (
                              <div
                                key={idx}
                                className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-700"
                              >
                                <div className="mb-3">
                                  <p className="font-medium text-slate-900 dark:text-white mb-1">
                                    {idx + 1}. 用所给词的正确形式填空
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    {transformation.type}
                                  </p>
                                  <div className="rounded-lg bg-white p-3 dark:bg-slate-600">
                                    <p className="text-slate-900 dark:text-white leading-relaxed">
                                      {(() => {
                                        const parts = transformation.sentence.split('_____');
                                        return (
                                          <>
                                            {parts[0]}
                                            <span className="inline-flex items-center">
                                              {showResults ? (
                                                <span className={`font-bold px-2 py-1 rounded ${
                                                  result ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                  {result ? transformation.word : userAnswer}
                                                </span>
                                              ) : (
                                                <input
                                                  type="text"
                                                  value={userAnswer}
                                                  onChange={(e) =>
                                                    setTransformationAnswers({
                                                      ...transformationAnswers,
                                                      [answerKey]: e.target.value,
                                                    })
                                                  }
                                                  className="min-w-[120px] bg-white border-2 border-purple-400 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium text-slate-900"
                                                  placeholder="请输入"
                                                  autoComplete="off"
                                                />
                                              )}
                                            </span>
                                            {parts[1] || ''}
                                          </>
                                        );
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                {showResults && (
                                  <div className="mt-3 space-y-3">
                                    {/* 答案反馈 */}
                                    {!result && (
                                      <p className="text-sm text-red-600 font-medium">
                                        ✗ 正确答案：{transformation.word}
                                      </p>
                                    )}
                                    {result && (
                                      <p className="text-sm text-green-600 font-medium">
                                        ✓ 回答正确！
                                      </p>
                                    )}

                                    {/* 详细解析 */}
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                                      <div className="space-y-2">
                                        {/* 本题变形 */}
                                        <div>
                                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            本题变形：
                                          </p>
                                          <p className="font-bold text-purple-700 dark:text-purple-300">
                                            {transformation.word}
                                          </p>
                                          {transformation.meaning && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                              {transformation.meaning}
                                            </p>
                                          )}
                                          <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {transformation.type}
                                          </p>
                                        </div>

                                        {/* 相关变形（举一反三） */}
                                        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                            💡 举一反三：{groupItem.baseWord} 的其他变形
                                          </p>
                                          <div className="space-y-1">
                                            {groupItem.transformations
                                              .filter((t, ti) => ti !== idx) // 排除当前题
                                              .map((otherTrans, otherIdx) => (
                                                <div
                                                  key={otherIdx}
                                                  className="flex items-center gap-2 text-xs"
                                                >
                                                  <span className="font-bold text-purple-700 dark:text-purple-300">
                                                    {otherTrans.word}
                                                  </span>
                                                  <span className="text-slate-600 dark:text-slate-400">
                                                    - {otherTrans.type}
                                                  </span>
                                                  {otherTrans.meaning && (
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                      ({otherTrans.meaning})
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* 提交按钮 */}
                    {!showResults && (
                      <Button
                        onClick={handleSubmit}
                        className="w-full mt-4"
                        size="lg"
                        disabled={submittedCount < totalQuestionsInGroup}
                      >
                        提交答案 ({submittedCount}/{totalQuestionsInGroup})
                      </Button>
                    )}
                    {/* 批改后显示导航按钮 */}
                    {showResults && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          className="flex-1"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          重试本组
                        </Button>
                        <Button
                          onClick={handleNextGroup}
                          disabled={currentGroupIndex >= Math.ceil(transformations.length / 5) - 1}
                          className="flex-1"
                        >
                          下一组
                          <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <Target className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      练习完成！
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      你已经完成了所有词转练习
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 错题本 */}
            <TabsContent value="mistakes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                    错题本
                  </CardTitle>
                  <CardDescription>
                    查看和管理你的错题记录
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis?.transformation?.frequentMistakes &&
                   analysis.transformation.frequentMistakes.length > 0 ? (
                    <div className="space-y-4">
                      {analysis.transformation.frequentMistakes.map((mistake, idx) => (
                        <div
                          key={mistake.id}
                          className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <Badge variant="destructive">
                              错误 {mistake.errorCount} 次
                            </Badge>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {mistake.type}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white mb-2">
                            {mistake.sentence.replace('_____', mistake.correctAnswer)}
                          </p>
                          <div className="space-y-1 text-sm">
                            <p className="text-red-600">
                              你的答案：{mistake.wrongAnswer || '未填写'}
                            </p>
                            <p className="text-green-600">
                              正确答案：{mistake.correctAnswer}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Check className="mx-auto h-12 w-12 text-green-600 mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">
                        暂无错题记录，继续加油！
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 薄弱分析 */}
            <TabsContent value="analysis">
              <div className="space-y-6">
                {/* 总体统计 */}
                {analysis?.summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        学习总结
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-blue-600">
                            {analysis.summary.totalMistakes}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            总错题数
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">
                            {analysis.summary.masteredCount}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            已掌握
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-orange-600">
                            {analysis.summary.pendingCount}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            待巩固
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            掌握率
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {analysis.summary.masteryRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={analysis.summary.masteryRate} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 薄弱变形类型 */}
                {analysis?.transformation?.weakTypes && analysis.transformation.weakTypes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-6 w-6 text-red-600" />
                        薄弱知识点
                      </CardTitle>
                      <CardDescription>
                        按错误频率排序的变形类型
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analysis.transformation.weakTypes.map((weakType, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={idx < 3 ? 'destructive' : 'outline'}
                                  className="text-sm"
                                >
                                  {idx + 1}
                                </Badge>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {weakType.type}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  错误 {weakType.count} 次
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  已掌握 {weakType.masteredCount} 个
                                </p>
                              </div>
                            </div>
                            <Progress
                              value={
                                weakType.count > 0
                                  ? ((weakType.count - weakType.masteredCount) / weakType.count) * 100
                                  : 0
                              }
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 学习建议 */}
                <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                          学习建议
                        </h3>
                        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                          <li>
                            • 优先练习错误次数多的变形类型，重点突破薄弱环节
                          </li>
                          <li>
                            • 对于高频错题，建议反复练习直到完全掌握
                          </li>
                          <li>
                            • 注意变形规则的记忆，避免拼写错误
                          </li>
                          <li>
                            • 定期回顾错题本，巩固已掌握的知识点
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 错题复习 */}
            <TabsContent value="review">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-6 w-6 text-purple-600" />
                    错题复习（艾宾浩斯记忆曲线）
                  </CardTitle>
                  <CardDescription>
                    根据艾宾浩斯记忆曲线，在最佳时间点复习错题，巩固记忆
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reviewLoading ? (
                    <p className="text-center text-slate-600 dark:text-slate-400 py-12">
                      加载中...
                    </p>
                  ) : reviewTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="mx-auto h-16 w-16 text-green-400 mb-4" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        暂无需要复习的题目
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        太棒了！你已经掌握了所有题目，继续加油！
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviewTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-lg border-2 border-purple-200 bg-white dark:border-purple-800 dark:bg-slate-800 overflow-hidden"
                        >
                          {/* 单词卡片头部 */}
                          <div className="bg-purple-50 p-4 dark:bg-purple-950">
                            <div className="flex items-baseline gap-3">
                              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {task.baseWord}
                              </p>
                              <p className="text-slate-600 dark:text-slate-400">
                                {task.baseMeaning}
                              </p>
                            </div>
                          </div>

                          {/* 变形题目 */}
                          <div className="p-4 space-y-4">
                            {task.transformations.map((transformation, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-700"
                              >
                                <div className="mb-3">
                                  <p className="font-medium text-slate-900 dark:text-white mb-1">
                                    {idx + 1}. 用所给词的正确形式填空
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    {transformation.type}
                                  </p>
                                  <div className="rounded-lg bg-white p-3 dark:bg-slate-600">
                                    <p className="text-slate-900 dark:text-white leading-relaxed">
                                      {transformation.sentence}
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    本题变形：
                                  </p>
                                  <p className="font-bold text-purple-700 dark:text-purple-300">
                                    {transformation.word}
                                  </p>
                                  {transformation.meaning && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      {transformation.meaning}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {transformation.type}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={loadReviewTasks}
                        className="w-full"
                        variant="outline"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        刷新复习任务
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
