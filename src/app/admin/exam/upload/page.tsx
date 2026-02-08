'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  CheckCircle,
  XCircle,
  FileText,
  Sparkles,
  BookOpen,
  PenTool,
  Eye,
  Clock,
  BookOpen as BookOpenIcon,
  Zap,
} from 'lucide-react';

interface UploadResult {
  version: string;
  fileName: string;
  totalQuestions: number;
  summary: {
    grammar: number;
    wordFormation: number;
    reading: number;
  };
  results: {
    grammar: { success: number; failed: number };
    wordFormation: { success: number; failed: number };
    reading: { success: number; failed: number };
  };
}

export default function ExamUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [version, setVersion] = useState('');
  const [grade, setGrade] = useState('8年级');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 预览状态
  const [previewText, setPreviewText] = useState('');

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);

      // 读取文件内容进行预览
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPreviewText(text);
      };
      reader.readAsText(file);
    }
  };

  // 上传模拟卷
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('请选择文件');
      return;
    }

    if (!version.trim()) {
      setError('请输入版本号');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('version', version);
    formData.append('grade', grade);
    formData.append('description', description);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/admin/exam/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.data);
      } else {
        setError(data.error || '上传失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-500" />
            模拟卷智能导入
          </h1>
          <p className="text-gray-600 mt-1">
            支持混合题型，自动识别并分配到不同模块
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：上传表单 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 上传卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  上传模拟卷
                </CardTitle>
                <CardDescription>
                  支持混合题型的智能识别和自动分配
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文件选择 */}
                <div className="space-y-2">
                  <Label>选择文件</Label>
                  <Input
                    type="file"
                    accept=".txt,.md,.json"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                      <Badge variant="secondary">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                  )}
                </div>

                {/* 版本号 */}
                <div className="space-y-2">
                  <Label>版本号 *</Label>
                  <Input
                    placeholder="例如：2024-03"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                {/* 年级 */}
                <div className="space-y-2">
                  <Label>年级 *</Label>
                  <Select value={grade} onValueChange={setGrade} disabled={isUploading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6年级">6年级</SelectItem>
                      <SelectItem value="7年级">7年级</SelectItem>
                      <SelectItem value="8年级">8年级</SelectItem>
                      <SelectItem value="9年级">9年级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 描述 */}
                <div className="space-y-2">
                  <Label>描述（可选）</Label>
                  <Textarea
                    placeholder="例如：初二下学期模拟卷"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isUploading}
                    rows={2}
                  />
                </div>

                {/* 上传按钮 */}
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile}
                  className="w-full"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      智能分析中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      开始智能导入
                    </>
                  )}
                </Button>

                {/* 上传进度 */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>智能识别进度</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-gray-500 text-center">
                      正在使用AI智能识别题型...
                    </p>
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">上传失败</p>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 支持的题型 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5" />
                  支持的题型
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <PenTool className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">语法题</p>
                    <p className="text-xs text-gray-600">自动识别语法知识点</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <BookOpenIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">词转练习</p>
                    <p className="text-xs text-gray-600">自动提取基础词和转换类型</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">阅读理解</p>
                    <p className="text-xs text-gray-600">自动提取文章和子问题</p>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">✨ 智能提示</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    系统会自动识别题目类型并分配到对应模块，无需手动分类
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：预览和结果 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 预览卡片 */}
            {previewText && !uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    文件预览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-x-auto max-h-96">
                    {previewText.substring(0, 2000)}
                    {previewText.length > 2000 && '\n... (已截断)'}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* 上传结果卡片 */}
            {uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    智能导入成功
                  </CardTitle>
                  <CardDescription>
                    版本 {uploadResult.version} • 共 {uploadResult.totalQuestions} 道题
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 统计概览 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {uploadResult.summary.grammar}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                        <PenTool className="w-3 h-3" />
                        语法题
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResult.summary.wordFormation}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                        <BookOpenIcon className="w-3 h-3" />
                        词转练习
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {uploadResult.summary.reading}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        阅读理解
                      </div>
                    </div>
                  </div>

                  {/* 详细结果 */}
                  <Tabs defaultValue="all">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">全部</TabsTrigger>
                      <TabsTrigger value="grammar">
                        语法题 ({uploadResult.summary.grammar})
                      </TabsTrigger>
                      <TabsTrigger value="wordFormation">
                        词转 ({uploadResult.summary.wordFormation})
                      </TabsTrigger>
                      <TabsTrigger value="reading">
                        阅读 ({uploadResult.summary.reading})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-800">✨ 智能分配结果</p>
                        <p className="text-sm text-blue-600 mt-2">
                          系统已自动识别题型并分配到对应模块：
                        </p>
                        <ul className="text-sm text-blue-600 mt-2 space-y-1 list-disc list-inside">
                          <li>
                            <strong>{uploadResult.summary.grammar}</strong> 道语法题 → 语法题库
                          </li>
                          <li>
                            <strong>{uploadResult.summary.wordFormation}</strong> 道词转练习 → 词转练习库
                          </li>
                          <li>
                            <strong>{uploadResult.summary.reading}</strong> 道阅读理解 → 阅读理解库
                          </li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">语法题库</p>
                          <p className="text-xs text-green-600 mt-1">
                            成功 {uploadResult.results.grammar.success} / 
                            失败 {uploadResult.results.grammar.failed}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">词转练习库</p>
                          <p className="text-xs text-green-600 mt-1">
                            成功 {uploadResult.results.wordFormation.success} / 
                            失败 {uploadResult.results.wordFormation.failed}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">阅读理解库</p>
                          <p className="text-xs text-green-600 mt-1">
                            成功 {uploadResult.results.reading.success} / 
                            失败 {uploadResult.results.reading.failed}
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="grammar" className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">
                          已分配到语法题库
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          可以在"语法学习"模块中使用
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {uploadResult.results.grammar.success}
                          </p>
                          <p className="text-sm text-gray-600">成功导入</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {uploadResult.results.grammar.failed}
                          </p>
                          <p className="text-sm text-gray-600">导入失败</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="wordFormation" className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          已分配到词转练习库
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          可以在"词转练习"模块中使用
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {uploadResult.results.wordFormation.success}
                          </p>
                          <p className="text-sm text-gray-600">成功导入</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {uploadResult.results.wordFormation.failed}
                          </p>
                          <p className="text-sm text-gray-600">导入失败</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="reading" className="space-y-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-purple-800">
                          已分配到阅读理解库
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          可以在"阅读理解"模块中使用
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {uploadResult.results.reading.success}
                          </p>
                          <p className="text-sm text-gray-600">成功导入</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {uploadResult.results.reading.failed}
                          </p>
                          <p className="text-sm text-gray-600">导入失败</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* 空状态 */}
            {!previewText && !uploadResult && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    请在左侧选择文件上传，或查看支持的题型
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
