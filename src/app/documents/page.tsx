'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type DocumentType = 'vocabulary' | 'grammar' | 'transformation';

interface UploadResult {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface AnalysisResult {
  documentType: DocumentType;
  extractedData: {
    items: any[];
    addedCount: number;
    skippedCount: number;
    addedItems?: string[];
    skippedItems?: string[];
  };
  summary: {
    totalItems: number;
    addedCount: number;
    skippedCount: number;
  };
}

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

export default function DocumentUploadPage() {
  const [selectedType, setSelectedType] = useState<DocumentType>('vocabulary');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const documentTypes = [
    {
      id: 'vocabulary' as DocumentType,
      name: '单词文档',
      description: '上传包含英语单词的文档，自动提取单词、释义和例句',
      icon: FileText,
    },
    {
      id: 'grammar' as DocumentType,
      name: '语法题文档',
      description: '上传包含语法选择题的文档，自动提取题目、答案和解析',
      icon: FileText,
    },
    {
      id: 'transformation' as DocumentType,
      name: '词转题文档',
      description: '上传包含词转题的文档，自动提取题目和变形规律',
      icon: FileText,
    },
  ];

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    if (uploadStatus === 'uploading' || uploadStatus === 'analyzing') {
      return;
    }

    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus('error');
      setErrorMessage('不支持的文件类型，仅支持 PDF、Word 文档');
      return;
    }

    // 验证文件大小
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setUploadStatus('error');
      setErrorMessage('文件大小不能超过20MB');
      return;
    }

    // 开始上传
    setUploadStatus('uploading');
    setUploadResult(null);
    setAnalysisResult(null);
    setErrorMessage('');
    setProgress(0);

    try {
      // 上传文件
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || '上传失败');
      }

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData.data);
      setProgress(50);

      // 分析文档
      setUploadStatus('analyzing');
      const analyzeResponse = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileKey: uploadData.data.fileKey,
          documentType: selectedType,
        }),
      });

      if (!analyzeResponse.ok) {
        const error = await analyzeResponse.json();
        throw new Error(error.error || '分析失败');
      }

      const analyzeData = await analyzeResponse.json();
      setAnalysisResult(analyzeData.data);
      setProgress(100);
      setUploadStatus('success');
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '操作失败');
    }
  }, [selectedType, uploadStatus]);

  // 处理拖拽上传
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // 重置
  const handleReset = () => {
    setUploadStatus('idle');
    setUploadResult(null);
    setAnalysisResult(null);
    setErrorMessage('');
    setProgress(0);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">文档上传</h1>
          <p className="mt-2 text-lg text-gray-600">
            上传文档，自动提取单词、语法题或词转题
          </p>
        </div>

        {/* 文档类型选择 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>选择文档类型</CardTitle>
            <CardDescription>
              选择你要上传的文档类型，系统会自动识别并提取相关内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {documentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{type.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">{type.description}</p>
                      </div>
                      {selectedType === type.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle>上传文档</CardTitle>
            <CardDescription>
              支持上传 PDF、Word 文档，最大20MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 拖拽上传区域 */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              } ${uploadStatus === 'uploading' || uploadStatus === 'analyzing' ? 'opacity-50' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'analyzing'}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer ${
                  uploadStatus === 'uploading' || uploadStatus === 'analyzing'
                    ? 'pointer-events-none'
                    : ''
                }`}
              >
                <Upload className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <p className="mb-2 text-lg font-medium text-gray-700">
                  点击或拖拽文件到此处上传
                </p>
                <p className="text-sm text-gray-500">
                  支持 PDF、Word 文档，最大20MB
                </p>
              </label>
            </div>

            {/* 上传进度 */}
            {uploadStatus === 'uploading' || uploadStatus === 'analyzing' ? (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {uploadStatus === 'uploading' ? '上传中...' : '分析中...'}
                  </span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* 错误提示 */}
            {uploadStatus === 'error' && errorMessage && (
              <Alert className="mt-6" variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* 成功结果 */}
            {uploadStatus === 'success' && analysisResult && (
              <div className="mt-6 space-y-4">
                {/* 上传信息 */}
                {uploadResult && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      文件 <strong>{uploadResult.fileName}</strong> ({formatFileSize(uploadResult.fileSize)})
                      上传成功！
                    </AlertDescription>
                  </Alert>
                )}

                {/* 分析结果 */}
                <Card>
                  <CardHeader>
                    <CardTitle>分析结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex items-center gap-4">
                      <Badge variant="outline" className="text-base">
                        总计：{analysisResult.summary.totalItems} 项
                      </Badge>
                      <Badge variant="default" className="text-base">
                        新增：{analysisResult.summary.addedCount} 项
                      </Badge>
                      <Badge variant="secondary" className="text-base">
                        跳过：{analysisResult.summary.skippedCount} 项（已存在）
                      </Badge>
                    </div>

                    {analysisResult.extractedData.addedItems &&
                    analysisResult.extractedData.addedItems.length > 0 ? (
                      <div>
                        <h4 className="mb-2 font-medium text-gray-900">新增内容：</h4>
                        <ul className="max-h-60 overflow-y-auto rounded-md bg-gray-50 p-3 text-sm">
                          {analysisResult.extractedData.addedItems.slice(0, 10).map((item, index) => (
                            <li key={index} className="mb-1 text-gray-700">
                              {index + 1}. {item}
                            </li>
                          ))}
                          {analysisResult.extractedData.addedItems.length > 10 && (
                            <li className="mt-2 text-gray-500">
                              ... 还有 {analysisResult.extractedData.addedItems.length - 10} 项
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {analysisResult.extractedData.skippedItems &&
                    analysisResult.extractedData.skippedItems.length > 0 ? (
                      <div className="mt-4">
                        <h4 className="mb-2 font-medium text-gray-900">跳过内容（已存在）：</h4>
                        <ul className="max-h-40 overflow-y-auto rounded-md bg-gray-50 p-3 text-sm">
                          {analysisResult.extractedData.skippedItems.slice(0, 5).map((item, index) => (
                            <li key={index} className="mb-1 text-gray-700">
                              {index + 1}. {item}
                            </li>
                          ))}
                          {analysisResult.extractedData.skippedItems.length > 5 && (
                            <li className="mt-2 text-gray-500">
                              ... 还有 {analysisResult.extractedData.skippedItems.length - 5} 项
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Button onClick={handleReset} className="w-full">
                  上传其他文档
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                <span>支持的文件格式：PDF、Word (.doc, .docx)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                <span>文件大小限制：最大20MB</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                <span>系统会自动识别文档中的内容并提取到相应的题库</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                <span>已存在的内容会自动跳过，不会重复添加</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span>建议文档内容清晰、格式规范，以获得最佳识别效果</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
