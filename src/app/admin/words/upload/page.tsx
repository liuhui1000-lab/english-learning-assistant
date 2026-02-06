'use client';

import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Volume2,
  Clock,
  FileText,
  Sparkles,
} from 'lucide-react';

interface UploadedWord {
  id: number;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
}

interface UploadResult {
  version: string;
  fileName: string;
  totalWords: number;
  insertedWords: number;
  words: UploadedWord[];
}

export default function WordUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [includeExamples, setIncludeExamples] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 预览状态
  const [previewText, setPreviewText] = useState('');

  // 格式说明
  const formatExamples = [
    {
      name: '简化格式（推荐）',
      description: '单词 + 词义，系统自动补充发音和词性',
      example: 'adventure - 冒险\nbravery - 勇气\ncourage - 勇敢',
    },
    {
      name: '完整格式',
      description: '包含所有信息，系统直接使用',
      example: 'adventure /ədˈventʃər/ n. 冒险\nHe went on an adventure.\n他去冒险了。',
    },
    {
      name: '单词列表',
      description: '只有单词，系统自动生成所有信息',
      example: 'adventure\nbravery\ncourage',
    },
  ];

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

  // 上传单词
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
    formData.append('description', description);
    formData.append('includeExamples', includeExamples.toString());

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

      const response = await fetch('/api/admin/words/upload', {
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
            单词智能导入
          </h1>
          <p className="text-gray-600 mt-1">
            支持多种格式，自动补充发音和词性，省时省力
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
                  上传单词文档
                </CardTitle>
                <CardDescription>
                  支持 .txt、.md、.json、.csv 格式
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文件选择 */}
                <div className="space-y-2">
                  <Label>选择文件</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".txt,.md,.json,.csv"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </div>
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
                    placeholder="例如：v1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                {/* 描述 */}
                <div className="space-y-2">
                  <Label>描述（可选）</Label>
                  <Textarea
                    placeholder="例如：初二上册单词"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isUploading}
                    rows={2}
                  />
                </div>

                {/* 选项 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeExamples"
                      checked={includeExamples}
                      onCheckedChange={(checked) => setIncludeExamples(checked as boolean)}
                      disabled={isUploading}
                    />
                    <Label htmlFor="includeExamples" className="cursor-pointer">
                      自动获取例句（速度稍慢）
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 pl-6">
                    勾选后，系统会为每个单词添加英文例句
                  </p>
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
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      开始导入
                    </>
                  )}
                </Button>

                {/* 上传进度 */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>处理进度</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
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

            {/* 格式说明卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5" />
                  支持的格式
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formatExamples.map((format, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        {format.name.split('（')[0]}
                      </Badge>
                      {index === 0 && (
                        <span className="text-xs text-blue-600 font-medium">推荐</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{format.description}</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {format.example}
                    </pre>
                  </div>
                ))}
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
                    {previewText}
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
                    导入成功
                  </CardTitle>
                  <CardDescription>
                    版本 {uploadResult.version} • 共 {uploadResult.insertedWords} 个单词
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 统计信息 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {uploadResult.totalWords}
                      </div>
                      <div className="text-sm text-gray-600">解析单词</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResult.insertedWords}
                      </div>
                      <div className="text-sm text-gray-600">成功导入</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {uploadResult.words.filter(w => w.phonetic).length}
                      </div>
                      <div className="text-sm text-gray-600">含发音</div>
                    </div>
                  </div>

                  {/* 单词列表 */}
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      导入的单词
                    </h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {uploadResult.words.map((word) => (
                        <div
                          key={word.id}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-lg">{word.word}</span>
                                {word.phonetic && (
                                  <span className="text-gray-500 text-sm flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" />
                                    {word.phonetic}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mt-1">{word.meaning}</p>
                              {word.example && (
                                <p className="text-sm text-gray-600 mt-1 italic">
                                  "{word.example}"
                                </p>
                              )}
                              {word.exampleTranslation && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {word.exampleTranslation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 提示信息 */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">温馨提示</p>
                      <p className="text-sm text-blue-600 mt-1">
                        单词已成功导入到单词库。您可以在"单词学习"模块中开始学习。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 空状态 */}
            {!previewText && !uploadResult && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    请在左侧选择文件上传，或查看支持的格式示例
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
