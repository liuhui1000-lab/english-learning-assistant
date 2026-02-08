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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  CheckCircle,
  XCircle,
  FileText,
  Sparkles,
  BookOpen,
  PenTool,
  Zap,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface UploadResult {
  version: string;
  fileName: string;
  totalQuestions: number;
  summary: {
    grammar: number;
    wordFormation: number;
    reading: number;
    words: number;
  };
  results: {
    grammar: { success: number; failed: number };
    wordFormation: { success: number; failed: number };
    reading: { success: number; failed: number };
    words: { success: number; failed: number };
  };
}

export default function SmartImportPage() {
  const [uploadType, setUploadType] = useState('exam');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      setPreviewText('');

      try {
        // 检查文件类型
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
        const textFormats = ['txt', 'md', 'json', 'csv'];
        
        if (textFormats.includes(fileExt)) {
          // 纯文本文件，直接读取
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            setPreviewText(text.substring(0, 1000)); // 只显示前1000字符
          };
          reader.readAsText(selectedFile);
        } else {
          // docx 或 pdf 文件，需要解析
          // 在客户端无法直接解析，显示提示信息
          setPreviewText(`此文件类型（${fileExt.toUpperCase()}）需要上传后才能查看内容。\n\n文件名：${selectedFile.name}\n文件大小：${(selectedFile.size / 1024).toFixed(2)} KB`);
        }
      } catch (error) {
        console.error('预览文件失败:', error);
        setPreviewText('无法预览此文件，请直接上传。');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description || '');

    try {
      let endpoint = '';
      switch (uploadType) {
        case 'exam':
          endpoint = '/api/admin/exam/upload';
          break;
        case 'words':
          endpoint = '/api/admin/words/upload';
          formData.append('includeExamples', 'true');
          break;
        default:
          endpoint = '/api/admin/library/import';
          formData.append('libraryType', uploadType);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.data);
        setUploadProgress(100);
        alert('上传成功！');
      } else {
        alert(`上传失败：${data.error}`);
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      word: '单词',
      grammar: '语法',
      transformation: '词转',
      reading: '阅读',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'word':
        return <BookOpen className="w-4 h-4" />;
      case 'grammar':
        return <PenTool className="w-4 h-4" />;
      case 'transformation':
        return <Zap className="w-4 h-4" />;
      case 'reading':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">智能导入</h1>
        <p className="text-muted-foreground mt-2">
          支持多种格式的智能导入，自动识别并分配到对应的题库
        </p>
      </div>

      <Tabs value="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">文件导入</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                文件导入
              </CardTitle>
              <CardDescription>
                支持 .txt, .md, .json, .csv, .docx, .pdf 格式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 导入类型选择 */}
              <div className="space-y-2">
                <Label>导入类型</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">模拟卷（混合题型）</SelectItem>
                    <SelectItem value="words">单词库</SelectItem>
                    <SelectItem value="grammar">语法题库</SelectItem>
                    <SelectItem value="transformation">词转练习库</SelectItem>
                    <SelectItem value="reading">阅读理解库</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 文件上传 */}
              <div className="space-y-2">
                <Label>选择文件</Label>
                <Input
                  type="file"
                  accept=".txt,.md,.json,.csv,.docx,.pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  支持的格式：TXT, MD, JSON, CSV, DOCX, PDF
                </p>
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="输入版本描述（可选）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              {/* 文件预览 */}
              {previewText && !uploadResult && (
                <div className="space-y-2">
                  <Label>文件预览</Label>
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {previewText}
                      {file && previewText.length >= 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}

              {/* 上传按钮 */}
              <Button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    上传中 {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    智能导入
                  </>
                )}
              </Button>

              {/* 上传进度 */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>处理中...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* 上传结果 */}
              {uploadResult && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      导入成功
                    </CardTitle>
                    <CardDescription>
                      版本 {uploadResult.version} • 共 {uploadResult.totalQuestions} 道题
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 统计摘要 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {uploadResult.summary.grammar}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">语法题</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {uploadResult.summary.wordFormation}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">词转</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {uploadResult.summary.reading}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">阅读</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {uploadResult.summary.words}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">单词</div>
                      </div>
                    </div>

                    {/* 详细结果 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        导入详情
                      </h4>

                      <div className="grid md:grid-cols-2 gap-3">
                        {uploadResult.summary.grammar > 0 && (
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">语法题库</span>
                              <Badge variant="outline">
                                成功 {uploadResult.results.grammar.success} / 
                                失败 {uploadResult.results.grammar.failed}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              导入了 <strong>{uploadResult.summary.grammar}</strong> 道语法题 → 语法题库
                            </div>
                          </div>
                        )}

                        {uploadResult.summary.wordFormation > 0 && (
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">词转练习库</span>
                              <Badge variant="outline">
                                成功 {uploadResult.results.wordFormation.success} / 
                                失败 {uploadResult.results.wordFormation.failed}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              导入了 <strong>{uploadResult.summary.wordFormation}</strong> 道词转练习 → 词转练习库
                            </div>
                          </div>
                        )}

                        {uploadResult.summary.reading > 0 && (
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">阅读理解库</span>
                              <Badge variant="outline">
                                成功 {uploadResult.results.reading.success} / 
                                失败 {uploadResult.results.reading.failed}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              导入了 <strong>{uploadResult.summary.reading}</strong> 篇阅读理解 → 阅读理解库
                            </div>
                          </div>
                        )}

                        {uploadResult.summary.words > 0 && (
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">单词库</span>
                              <Badge variant="outline">
                                成功 {uploadResult.results.words.success} / 
                                失败 {uploadResult.results.words.failed}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              导入了 <strong>{uploadResult.summary.words}</strong> 个单词 → 单词库
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
