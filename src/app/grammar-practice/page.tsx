'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, BookOpen, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAutoSave } from '@/hooks/useAutoSave';

interface GrammarExercise {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
  correctAnswer: string;
  category: string;
  subcategory: string;
  source: string;
  questionNumber: string;
}

interface BatchResult {
  exerciseId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  subcategory: string;
  knowledgeLink?: {
    name: string;
    url: string;
  };
}

interface BatchResponse {
  results: BatchResult[];
  summary: {
    correctCount: number;
    totalCount: number;
    accuracy: number;
  };
}

export default function GrammarPracticePage() {
  const [exercises, setExercises] = useState<GrammarExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
  const [selectedType, setSelectedType] = useState<string>('词转题');
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);

  const GROUP_SIZE = 10; // 每组10题

  // 自动保存功能
  const { loadSavedData: loadGrammarSavedData } = useAutoSave({
    interval: 60000,
    storageKey: 'grammar-practice-progress',
    data: {
      currentGroupIndex,
      userAnswers,
      selectedType,
      savedAt: new Date().toISOString(),
    },
  });

  // 加载练习题
  const loadExercises = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/grammar/practice?limit=${GROUP_SIZE}&type=${encodeURIComponent(selectedType)}`
      );
      const data = await response.json();

      if (data.success) {
        setExercises(data.data);
        setTotalCount(data.meta.totalCount);
        setTotalAttempted(data.meta.totalAttempted);
        setOverallAccuracy(data.meta.overallAccuracy);
        setUserAnswers({});
        setBatchResult(null);
      }
    } catch (error) {
      console.error('加载练习题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取练习题
  useEffect(() => {
    loadExercises();

    // 恢复保存的进度
    const savedData = loadGrammarSavedData();
    if (savedData && savedData.grammarPractice) {
      setCurrentGroupIndex(savedData.grammarPractice.currentGroupIndex);
      setUserAnswers(savedData.grammarPractice.userAnswers || {});
      setSelectedType(savedData.grammarPractice.selectedType);
    }
  }, [selectedType]);

  // 更新答案
  const handleAnswerChange = (exerciseId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [exerciseId]: answer,
    }));
  };

  // 提交答案
  const handleSubmit = async () => {
    const submittedAnswers = exercises
      .filter(ex => userAnswers[ex.id] && userAnswers[ex.id].trim() !== '')
      .map(ex => ({
        exerciseId: ex.id,
        userAnswer: userAnswers[ex.id],
      }));

    if (submittedAnswers.length === 0) {
      alert('请先回答问题');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/grammar/practice/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissions: submittedAnswers,
          userId: 'demo_user',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBatchResult(data.data);
      }
    } catch (error) {
      console.error('提交答案失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 下一组
  const handleNextGroup = () => {
    setCurrentGroupIndex(prev => prev + 1);
    setUserAnswers({});
    setBatchResult(null);
    loadExercises();
  };

  // 重试本组
  const handleRetry = () => {
    setUserAnswers({});
    setBatchResult(null);
  };

  // 渲染题目
  const renderQuestion = (exercise: GrammarExercise, index: number) => {
    const result = batchResult?.results.find(r => r.exerciseId === exercise.id);
    const userAnswer = userAnswers[exercise.id] || '';

    return (
      <div key={exercise.id} className="border-b last:border-b-0 pb-6 last:pb-0">
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              {index + 1}. {exercise.question}
            </span>
            <Badge variant="outline">{exercise.category}</Badge>
          </div>

          {exercise.type === '词转题' && (
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg inline-block">
              提示：根据语境填入正确的词性形式
            </div>
          )}
        </div>

        {/* 选项 */}
        {exercise.options && Array.isArray(exercise.options) && exercise.options.length > 0 && (
          <RadioGroup
            value={userAnswer}
            onValueChange={(value) => handleAnswerChange(exercise.id, value)}
            disabled={batchResult !== null}
          >
            {exercise.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${exercise.id}-${idx}`} />
                  <Label
                    htmlFor={`option-${exercise.id}-${idx}`}
                    className={`flex-1 cursor-pointer p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                      result && userAnswer === option
                        ? result.isCorrect
                          ? 'bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-400'
                          : 'bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-400'
                        : ''
                    }`}
                  >
                    <span className="font-semibold mr-2">{letter}.</span>
                    {option}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}

        {/* 填空题 */}
        {(!exercise.options || exercise.options.length === 0) && (
          <div className="mt-3">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => handleAnswerChange(exercise.id, e.target.value)}
              disabled={batchResult !== null}
              placeholder="请输入答案"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                result && userAnswer
                  ? result.isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-gray-300'
              }`}
            />
          </div>
        )}

        {/* 批改结果 */}
        {result && (
          <div className="mt-4 space-y-3">
            {/* 答案反馈 */}
            <div className={`flex items-start gap-2 ${result.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {result.isCorrect ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <XCircle className="mt-0.5 h-5 w-5" />}
              <div>
                <p className="font-semibold">
                  {result.isCorrect ? '回答正确！' : '回答错误'}
                </p>
                {!result.isCorrect && (
                  <p className="text-sm mt-1">
                    正确答案：<span className="font-bold">{result.correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 详细解析 */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {result.explanation}
              </p>

              {/* 语法知识点链接 */}
              {result.knowledgeLink && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    想系统学习相关知识？
                  </p>
                  <a
                    href={result.knowledgeLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline"
                  >
                    <BookOpen className="h-4 w-4" />
                    {result.knowledgeLink.name} - 系统讲解
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">加载练习题中...</p>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>暂无练习题</CardTitle>
            <CardDescription>该题型暂无练习题</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
      {/* 导航栏 */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            返回首页
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">语法练习</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* 题型选择器 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {['词转题', '语法选择题', '句型转换题'].map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedType(type);
                setCurrentGroupIndex(0);
              }}
            >
              {type}
            </Button>
          ))}
        </div>

        {/* 总体进度 */}
        <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              总体进度：第 {currentGroupIndex + 1} 组
            </span>
            <span className="text-blue-700 dark:text-blue-300">
              已完成 {totalAttempted}/{totalCount} 题
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>总正确率：{overallAccuracy}%</span>
          </div>
        </div>

        {/* 练习题卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>第 {currentGroupIndex + 1} 组</span>
              <Badge variant="outline">{selectedType}</Badge>
            </CardTitle>
            <CardDescription>
              共 {exercises.length} 题，请完成后统一提交批改
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {exercises.map((exercise, index) => renderQuestion(exercise, index))}
            </div>

            {/* 提交按钮 */}
            {!batchResult && (
              <Button
                onClick={handleSubmit}
                className="w-full mt-6"
                size="lg"
                disabled={submitting || Object.keys(userAnswers).length === 0}
              >
                {submitting ? '批改中...' : `提交答案 (${Object.keys(userAnswers).length}/${exercises.length})`}
              </Button>
            )}

            {/* 批改结果 */}
            {batchResult && (
              <>
                {/* 成绩统计 */}
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      本组成绩
                    </p>
                    <p className="text-5xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                      {batchResult.summary.accuracy}%
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      正确 {batchResult.summary.correctCount} / {batchResult.summary.totalCount}
                    </p>
                  </div>
                </div>

                {/* 导航按钮 */}
                <div className="flex gap-2 mt-6">
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
                    className="flex-1"
                  >
                    下一组
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
