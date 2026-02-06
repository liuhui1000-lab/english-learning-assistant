'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowLeft, BookOpen, Check, X, ArrowRight, Target, Brain, TrendingUp, Clock, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type StudyMode = 'vocabulary' | 'transformation';

type StudyPhase = 'home' | 'learn' | 'meaning-quiz' | 'spelling' | 'result';

interface Word {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  difficulty: number;
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizData {
  word: {
    id: string;
    word: string;
    phonetic: string;
  };
  options: QuizOption[];
}

interface WordResult {
  wordId: string;
  meaningCorrect: boolean;
  spellingCorrect: boolean;
  skipped?: boolean;
}

export default function VocabularyPage() {
  const [studyMode, setStudyMode] = useState<StudyMode>('vocabulary');
  const [studyPhase, setStudyPhase] = useState<StudyPhase>('home');

  // 单词学习相关状态
  const [batchWords, setBatchWords] = useState<Word[]>([]);
  const [batchMode, setBatchMode] = useState<'learn' | 'review' | 'practice'>('learn'); // learn: 新词, review: 复习, practice: 随机练习
  const [currentLearnIndex, setCurrentLearnIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [quizData, setQuizData] = useState<Map<string, QuizData>>(new Map());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [spellingAnswers, setSpellingAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [spellingResults, setSpellingResults] = useState<Record<string, boolean>>({});

  // 统计相关状态
  const [stats, setStats] = useState<any>(null);
  const [learningResult, setLearningResult] = useState<any>(null);

  // 自动发音相关
  const hasAutoPlayedRef = useRef<Record<number, boolean>>({});
  const isSpeakingRef = useRef(false);

  // 获取学习统计
  useEffect(() => {
    fetch('/api/vocabulary/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data);
        }
      })
      .catch(console.error);
  }, []);

  // 自动发音：当currentLearnIndex变化时播放
  useEffect(() => {
    if (studyPhase === 'learn' && batchWords.length > 0) {
      const currentIndex = currentLearnIndex;

      // 如果还没有自动播放过
      if (!hasAutoPlayedRef.current[currentIndex]) {
        // 延迟播放，避免与页面切换冲突
        const timer = setTimeout(() => {
          if (!isSpeakingRef.current && batchWords[currentIndex]) {
            speakWord(batchWords[currentIndex].word);
            hasAutoPlayedRef.current[currentIndex] = true;
          }
        }, 300);

        return () => clearTimeout(timer);
      }
    }
  }, [currentLearnIndex, studyPhase, batchWords]);

  // 发音功能
  const speakWord = (text: string) => {
    if ('speechSynthesis' in window && !isSpeakingRef.current) {
      isSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;

      utterance.onend = () => {
        isSpeakingRef.current = false;
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };

      speechSynthesis.speak(utterance);
    }
  };

  // 下载词库
  const handleDownload = (format: 'json' | 'csv') => {
    window.location.href = `/api/vocabulary/export?userId=default-user&format=${format}`;
  };

  // 获取一批单词
  const fetchBatchWords = async () => {
    const res = await fetch('/api/vocabulary/batch?userId=default-user&batchSize=6');
    const data = await res.json();
    if (data.success) {
      setBatchWords(data.words);
      setBatchMode(data.mode);
      setStudyPhase('learn');
      setCurrentLearnIndex(0);
      setShowMeaning(false);
      // 重置自动播放记录
      hasAutoPlayedRef.current = {};
    }
  };

  // 预加载选择题
  const preloadQuizzes = async (words: Word[]) => {
    const quizMap = new Map<string, QuizData>();
    for (const word of words) {
      const res = await fetch(`/api/vocabulary/quiz/${word.id}`);
      const data = await res.json();
      if (data.success) {
        quizMap.set(word.id, data);
      }
    }
    setQuizData(quizMap);
  };

  // 学习阶段：下一个单词
  const handleNextLearn = () => {
    if (currentLearnIndex < batchWords.length - 1) {
      setCurrentLearnIndex(currentLearnIndex + 1);
      setShowMeaning(false);
    } else {
      // 完成学习阶段，预加载选择题
      preloadQuizzes(batchWords);
      setStudyPhase('meaning-quiz');
    }
  };

  // 词义选择题：提交答案
  const handleQuizSubmit = () => {
    const results: Record<string, boolean> = {};
    for (const word of batchWords) {
      const selectedOptionId = selectedAnswers[word.id];
      const quiz = quizData.get(word.id);
      if (quiz) {
        const selectedOption = quiz.options.find(opt => opt.id === selectedOptionId);
        results[word.id] = selectedOption?.isCorrect || false;
      }
    }
    setQuizResults(results);
    setStudyPhase('spelling');
  };

  // 拼写测试：提交答案
  const handleSpellingSubmit = () => {
    const results: Record<string, boolean> = {};
    for (const word of batchWords) {
      const answer = spellingAnswers[word.id] || '';
      results[word.id] = answer.trim().toLowerCase() === word.word.toLowerCase();
    }
    setSpellingResults(results);

    // 提交学习结果
    const wordResults: WordResult[] = batchWords.map(word => ({
      wordId: word.id,
      meaningCorrect: quizResults[word.id] || false,
      spellingCorrect: results[word.id] || false,
    }));

    fetch('/api/vocabulary/batch/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'default-user',
        results: wordResults,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLearningResult(data.updatedProgress);
          setStudyPhase('result');
        }
      })
      .catch(console.error);
  };

  // 重新开始
  const handleRestart = () => {
    setBatchWords([]);
    setCurrentLearnIndex(0);
    setShowMeaning(false);
    setQuizData(new Map());
    setSelectedAnswers({});
    setSpellingAnswers({});
    setQuizResults({});
    setSpellingResults({});
    setLearningResult(null);
    hasAutoPlayedRef.current = {};
    setStudyPhase('home');
  };

  // 获取模式标签文本
  const getModeLabel = () => {
    switch (batchMode) {
      case 'review':
        return { text: '复习模式', color: 'orange', icon: RefreshCw };
      case 'practice':
        return { text: '练习模式', color: 'purple', icon: Target };
      default:
        return { text: '学习模式', color: 'blue', icon: BookOpen };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-950 dark:to-slate-900">
      {/* 导航栏 */}
      <nav className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
              返回首页
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              单词背诵
            </h1>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              智能复习系统
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Tabs value={studyMode} onValueChange={(v) => setStudyMode(v as StudyMode)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="vocabulary">
                <Brain className="mr-2 h-4 w-4" />
                单词学习
              </TabsTrigger>
              <TabsTrigger value="transformation">
                <Target className="mr-2 h-4 w-4" />
                词转练习
              </TabsTrigger>
            </TabsList>

            {/* 单词学习模块 */}
            <TabsContent value="vocabulary">
              {/* 首页：显示统计 */}
              {studyPhase === 'home' && (
                <div className="space-y-6">
                  {/* 今日复习提醒 */}
                  {stats && stats.needReview > 0 && (
                    <Card className="border-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white">
                            <AlertCircle className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300">
                              今日待复习
                            </h3>
                            <p className="text-sm text-orange-700 dark:text-orange-400">
                              你有 {stats.needReview} 个单词需要复习，建议先完成复习再学习新单词
                            </p>
                          </div>
                          <Button
                            onClick={fetchBatchWords}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            开始复习
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 学习统计卡片 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                        学习统计
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950">
                            <p className="text-3xl font-bold text-blue-600">
                              {stats.stats?.totalWords || 0}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">已学单词</p>
                          </div>
                          <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
                            <p className="text-3xl font-bold text-green-600">
                              {stats.stats?.totalReview || 0}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">复习次数</p>
                          </div>
                          <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-950">
                            <p className="text-3xl font-bold text-purple-600">
                              {((stats.stats?.avgMastery || 0)).toFixed(0)}%
                            </p>
                            <p className="text-sm text-purple-700 dark:text-purple-300">平均掌握度</p>
                          </div>
                          <div className="rounded-lg bg-orange-50 p-4 text-center dark:bg-orange-950">
                            <p className="text-3xl font-bold text-orange-600">
                              {stats.needReview || 0}
                            </p>
                            <p className="text-sm text-orange-700 dark:text-orange-300">待复习</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-slate-600 dark:text-slate-400">加载中...</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 操作按钮区 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 开始学习按钮 */}
                    <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                            <BookOpen className="h-8 w-8" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                              开始学习
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                              {stats && stats.needReview > 0
                                ? '建议先完成复习再学习新单词'
                                : '学习 6 个新单词，通过词义选择题和拼写测试巩固记忆'}
                            </p>
                          </div>
                          <Button
                            onClick={fetchBatchWords}
                            size="lg"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <BookOpen className="mr-2 h-5 w-5" />
                            开始
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 下载词库按钮 */}
                    <Card className="border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white">
                            <Download className="h-8 w-8" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                              下载词库
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                              下载所有单词及其掌握度，支持离线复习
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleDownload('json')}
                              variant="outline"
                              className="flex-1"
                            >
                              JSON
                            </Button>
                            <Button
                              onClick={() => handleDownload('csv')}
                              variant="outline"
                              className="flex-1"
                            >
                              CSV
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 学习说明 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-6 w-6 text-purple-600" />
                        学习流程
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                            1
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">快速浏览</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">浏览单词的发音、释义和例句（自动播放发音）</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white font-bold">
                            2
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">词义选择题</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">从四个选项中选择正确的词义</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-bold">
                            3
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">拼写测试</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">根据释义拼写单词，巩固记忆</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white font-bold">
                            4
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">智能复习</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              系统根据艾宾浩斯遗忘曲线和错误次数，自动安排下次复习时间
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 学习阶段：浏览单词 */}
              {studyPhase === 'learn' && batchWords.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        {getModeLabel().text} {currentLearnIndex + 1} / {batchWords.length}
                      </span>
                      <Badge variant="outline" className={`bg-${getModeLabel().color}-50 text-${getModeLabel().color}-600 dark:bg-${getModeLabel().color}-950 dark:text-${getModeLabel().color}-300`}>
                        {getModeLabel().text}
                      </Badge>
                    </div>
                    <Progress
                      value={((currentLearnIndex + 1) / batchWords.length) * 100}
                      className="h-2"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                        {batchWords[currentLearnIndex].word}
                      </h2>
                      <p className="text-xl text-slate-600 dark:text-slate-400 mb-4">
                        {batchWords[currentLearnIndex].phonetic}
                      </p>
                      <Button
                        onClick={() => speakWord(batchWords[currentLearnIndex].word)}
                        variant="outline"
                        size="lg"
                        className="gap-2 mb-6"
                      >
                        <Volume2 className="h-5 w-5" />
                        再次发音
                      </Button>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">释义</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {batchWords[currentLearnIndex].meaning}
                      </p>
                    </div>

                    {batchWords[currentLearnIndex].example && (
                      <div className="rounded-lg bg-purple-50 p-6 dark:bg-purple-950">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">例句</p>
                        <p className="font-medium text-slate-900 dark:text-white mb-2">
                          {batchWords[currentLearnIndex].example}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {batchWords[currentLearnIndex].exampleTranslation}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleNextLearn}
                        className="flex-1"
                        size="lg"
                      >
                        {currentLearnIndex === batchWords.length - 1 ? '完成学习' : '下一个'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 词义选择题阶段 */}
              {studyPhase === 'meaning-quiz' && batchWords.length > 0 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>词义选择题</CardTitle>
                      <CardDescription>
                        从四个选项中选择正确的词义
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {batchWords.map((word, index) => {
                    const quiz = quizData.get(word.id);
                    const selectedOptionId = selectedAnswers[word.id];
                    const result = quizResults[word.id];

                    if (!quiz) return null;

                    return (
                      <Card key={word.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3">
                              <span className="text-slate-600 dark:text-slate-400">
                                {index + 1}.
                              </span>
                              <span className="text-3xl font-bold">
                                {word.word}
                              </span>
                              <Button
                                onClick={() => speakWord(word.word)}
                                variant="ghost"
                                size="sm"
                              >
                                <Volume2 className="h-4 w-4" />
                              </Button>
                            </CardTitle>
                            {result !== undefined && (
                              result ? (
                                <Check className="h-6 w-6 text-green-600" />
                              ) : (
                                <X className="h-6 w-6 text-red-600" />
                              )
                            )}
                          </div>
                          <CardDescription>{word.phonetic}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <RadioGroup
                            value={selectedOptionId}
                            onValueChange={(value) =>
                              setSelectedAnswers({ ...selectedAnswers, [word.id]: value })
                            }
                            disabled={result !== undefined}
                          >
                            {quiz.options.map((option) => {
                              const isSelected = selectedOptionId === option.id;
                              const showResult = result !== undefined;
                              const isCorrect = option.isCorrect;

                              return (
                                <div
                                  key={option.id}
                                  className={`flex items-center space-x-2 rounded-lg border p-4 transition-colors ${
                                    showResult
                                      ? isCorrect
                                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                        : isSelected
                                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                                        : 'border-slate-200 dark:border-slate-700'
                                      : isSelected
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <RadioGroupItem value={option.id} id={option.id} />
                                  <Label
                                    htmlFor={option.id}
                                    className="flex-1 cursor-pointer text-slate-900 dark:text-white"
                                  >
                                    {option.text}
                                  </Label>
                                  {showResult && isCorrect && (
                                    <Check className="h-5 w-5 text-green-600" />
                                  )}
                                  {showResult && !isCorrect && isSelected && (
                                    <X className="h-5 w-5 text-red-600" />
                                  )}
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Button
                    onClick={handleQuizSubmit}
                    className="w-full"
                    size="lg"
                    disabled={Object.keys(selectedAnswers).length < batchWords.length}
                  >
                    提交答案
                  </Button>
                </div>
              )}

              {/* 拼写测试阶段 */}
              {studyPhase === 'spelling' && batchWords.length > 0 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>拼写测试</CardTitle>
                      <CardDescription>
                        根据释义拼写单词
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {batchWords.map((word, index) => {
                    const answer = spellingAnswers[word.id] || '';
                    const result = spellingResults[word.id];

                    return (
                      <Card key={word.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600 dark:text-slate-400">
                                {index + 1}.
                              </span>
                              <Badge variant="outline">
                                难度 {word.difficulty}
                              </Badge>
                            </div>
                            {result !== undefined && (
                              result ? (
                                <Check className="h-6 w-6 text-green-600" />
                              ) : (
                                <X className="h-6 w-6 text-red-600" />
                              )
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950">
                            <p className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-1">
                              释义：
                            </p>
                            <p className="text-slate-900 dark:text-white">
                              {word.meaning}
                            </p>
                          </div>

                          <Input
                            value={answer}
                            onChange={(e) =>
                              setSpellingAnswers({
                                ...spellingAnswers,
                                [word.id]: e.target.value,
                              })
                            }
                            placeholder="输入英文单词"
                            className="text-lg text-center"
                            disabled={result !== undefined}
                          />

                          {result !== undefined && !result && (
                            <div className="text-center">
                              <p className="text-red-600 mb-1">拼写错误</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                正确答案：<span className="font-semibold">{word.word}</span>
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Button
                    onClick={handleSpellingSubmit}
                    className="w-full"
                    size="lg"
                    disabled={Object.keys(spellingAnswers).length < batchWords.length}
                  >
                    提交答案
                  </Button>
                </div>
              )}

              {/* 结果总结 */}
              {studyPhase === 'result' && learningResult && (
                <div className="space-y-6">
                  <Card className="border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="pt-6 text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check className="h-10 w-10" />
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        学习完成！
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400">
                        恭喜你完成了本轮学习
                      </p>
                    </CardContent>
                  </Card>

                  {/* 详细结果 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>学习详情</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {batchWords.map((word, index) => {
                          const result = learningResult.find((r: any) => r.wordId === word.id);
                          const quizCorrect = quizResults[word.id];
                          const spellingCorrect = spellingResults[word.id];

                          return (
                            <div
                              key={word.id}
                              className="flex items-center justify-between rounded-lg border p-4"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {index + 1}.
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {word.word}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {word.meaning}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={quizCorrect ? 'default' : 'destructive'}>
                                  词义: {quizCorrect ? '✓' : '✗'}
                                </Badge>
                                <Badge variant={spellingCorrect ? 'default' : 'destructive'}>
                                  拼写: {spellingCorrect ? '✓' : '✗'}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 掌握度变化 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>掌握度更新</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {learningResult.map((item: any) => {
                          const word = batchWords.find(w => w.id === item.wordId);
                          return (
                            <div key={item.wordId} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {word?.word}
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                  掌握度: <span className="font-bold">{item.masteryLevel}%</span>
                                </span>
                              </div>
                              <Progress value={item.masteryLevel} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRestart}
                      variant="outline"
                      className="flex-1"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      继续学习
                    </Button>
                    <Button
                      onClick={() => {
                        handleRestart();
                        fetch('/api/vocabulary/stats')
                          .then(res => res.json())
                          .then(data => {
                            if (data.success) {
                              setStats(data);
                            }
                          });
                      }}
                      className="flex-1"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      查看统计
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 词转练习模块 */}
            <TabsContent value="transformation">
              <Card>
                <CardHeader>
                  <CardTitle>词转练习</CardTitle>
                  <CardDescription>
                    使用所给词的正确形式填空（上海中考题型）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4 py-8">
                    <Target className="mx-auto h-16 w-16 text-purple-600" />
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        词形转换练习
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        练习单词的各种变形形式，包括名词、动词时态、形容词、副词等
                      </p>
                    </div>
                    <Button asChild size="lg">
                      <Link href="/transformation">
                        <Target className="mr-2 h-5 w-5" />
                        开始练习
                      </Link>
                    </Button>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2 mt-6">
                      <p>✓ 练习模式：随机词形转换练习</p>
                      <p>✓ 错题本：记录和管理错题</p>
                      <p>✓ 薄弱分析：统计薄弱知识点</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
