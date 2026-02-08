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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  AlertTriangle,
  Info,
} from 'lucide-react';

interface BatchUploadProgress {
  totalWords: number;
  processedWords: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  stage: string;
  newWords: number;
  updatedWords: number;
  failedWords: number;
  status: 'parsing' | 'uploading' | 'completed' | 'error';
  error?: string;
}

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
  // 去重统计
  deduplicationStats?: {
    exactMatches: number;
    possibleMatches: number;
    confirmedByAI: number;
    falsePositives: number;
    newItems: number;
    mergedItems: number;
    skippedItems: number;
  };
}

export type MergeStrategyType = 'replace' | 'append' | 'smart_merge' | 'skip';
export type OCREngineType = 'tesseract' | 'paddleocr' | 'baidu';

export default function SmartImportPage() {
  const [uploadType, setUploadType] = useState('exam');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategyType>('smart_merge');
  const [useBatchMode, setUseBatchMode] = useState(false); // 是否使用分批模式
  const [useOCR, setUseOCR] = useState(false); // 是否使用 OCR
  const [ocrEngine, setOcrEngine] = useState<OCREngineType>('tesseract'); // OCR 引擎
  const [previewText, setPreviewText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchUploadProgress | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0); // OCR 进度

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      setPreviewText('');

      // 检查文件类型
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      const isImage = imageExtensions.includes(fileExt);
      const isPDF = fileExt === 'pdf';

      // 如果是图片，自动启用 OCR
      if (isImage && !useOCR) {
        setUseOCR(true);
      }

      // 如果是 PDF，自动关闭 OCR（PDF 不是图片，不能直接用 OCR）
      if (isPDF && useOCR) {
        setUseOCR(false);
        alert('PDF 文件不是图片格式，不能直接使用 OCR 识别。系统会自动解析 PDF 文件中的文字。');
      }

      // 如果是大文件模式且选择的是PDF，自动关闭大文件模式
      if (useBatchMode && isPDF) {
        setUseBatchMode(false);
        alert('PDF 文件不支持大文件模式，已自动切换为普通模式。建议将 PDF 转换为 DOCX 格式后使用大文件模式。');
      }

      try {
        const textFormats = ['txt', 'md', 'json', 'csv'];

        if (textFormats.includes(fileExt)) {
          // 纯文本文件，直接读取
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            setPreviewText(text.substring(0, 1000)); // 只显示前1000字符
          };
          reader.readAsText(selectedFile);
        } else if (isImage) {
          // 图片文件，提示需要 OCR 识别
          setPreviewText(`此图片需要使用 OCR 识别才能提取文字。\n\n文件名：${selectedFile.name}\n文件大小：${(selectedFile.size / 1024).toFixed(2)} KB\n\n请开启"OCR 识别"开关后点击上传。`);
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

    // 检查文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const isImage = imageExtensions.includes(fileExt);
    const isPDF = fileExt === 'pdf';

    // 检查是否同时使用 OCR 和 PDF（不允许）
    if (useOCR && isPDF) {
      alert(
        '错误：不能同时对 PDF 文件使用 OCR 识别。\n\n' +
        '原因：PDF 不是图片格式，OCR 仅用于从图片中提取文字。\n\n' +
        '解决方案：\n' +
        '1. 关闭"OCR 识别"开关，系统会自动解析 PDF 文件中的文字。\n' +
        '2. 或者将 PDF 转换为图片格式，然后使用 OCR 识别。'
      );
      return;
    }

    // 如果是图片且启用 OCR，先进行 OCR 识别
    if (isImage && useOCR) {
      await handleOCRUpload();
      return;
    }

    // 大文件模式（仅支持单词上传）
    if (uploadType === 'words' && useBatchMode) {
      await handleBatchUpload();
      return;
    }

    // 原有的上传逻辑
    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description || '');

    // 对于语法和词转，添加合并策略
    if (uploadType === 'grammar' || uploadType === 'transformation') {
      formData.append('mergeStrategy', mergeStrategy);
    }

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
          // 对于语法和词转，添加合并策略
          if (uploadType === 'grammar' || uploadType === 'transformation') {
            formData.append('mergeStrategy', mergeStrategy);
          }
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

  /**
   * OCR 上传处理
   */
  const handleOCRUpload = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      console.log(`[${ocrEngine.toUpperCase()}] 开始识别图片:`, file.name);

      let ocrResult: {
        text: string;
        confidence: number;
        lines?: any[];
      };

      // 根据选择的 OCR 引擎调用不同的函数
      if (ocrEngine === 'paddleocr') {
        // 使用 PaddleOCR API
        const { recognizeWithPaddleOCR } = await import('@/utils/paddleOCR');

        const paddleResult = await recognizeWithPaddleOCR(
          file,
          (progress) => {
            setOcrProgress(progress);
            setUploadProgress(progress * 0.5); // OCR 占总进度的 50%
          }
        );

        if (!paddleResult.success) {
          alert(`PaddleOCR 识别失败: ${paddleResult.error}`);
          return;
        }

        ocrResult = {
          text: paddleResult.text,
          confidence: paddleResult.confidence,
          lines: paddleResult.lines,
        };
      } else if (ocrEngine === 'baidu') {
        // 使用百度 OCR API
        const { recognizeWithBaiduOCR } = await import('@/utils/baiduOCR');

        const baiduResult = await recognizeWithBaiduOCR(
          file,
          {
            detectDirection: true,  // 检测图像朝向
            languageType: 'CHN_ENG',  // 中英文混合
          },
          (progress) => {
            setOcrProgress(progress);
            setUploadProgress(progress * 0.5); // OCR 占总进度的 50%
          }
        );

        if (!baiduResult.success) {
          alert(`百度 OCR 识别失败: ${baiduResult.error}`);
          return;
        }

        ocrResult = {
          text: baiduResult.text,
          confidence: baiduResult.confidence,
          lines: baiduResult.lines,
        };
      } else {
        // 使用 Tesseract.js
        const { recognizeText } = await import('@/utils/ocr');

        const tesseractResult = await recognizeText(
          file,
          { language: 'eng+chi_sim' },
          (progress) => {
            setOcrProgress(progress);
            setUploadProgress(progress * 0.5); // OCR 占总进度的 50%
          }
        );

        ocrResult = tesseractResult;
      }

      console.log(`[${ocrEngine.toUpperCase()}] 识别完成:`, ocrResult);

      if (ocrResult.text.trim().length === 0) {
        alert('OCR 识别失败，未能从图片中提取到文字。请尝试使用更清晰的图片。');
        return;
      }

      // 将识别出的文本转换为文本文件
      const textFile = new File([ocrResult.text], `${file.name}_ocr.txt`, {
        type: 'text/plain',
      });

      // 更新文件引用
      setFile(textFile);
      setPreviewText(ocrResult.text.substring(0, 1000));

      // 继续上传
      setIsUploading(false);

      // 自动触发上传
      setUploadProgress(50);

      const formData = new FormData();
      formData.append('file', textFile);
      formData.append('description', `OCR 识别 (${ocrEngine}): ${file.name}`);

      if (uploadType === 'grammar' || uploadType === 'transformation') {
        formData.append('mergeStrategy', mergeStrategy);
      }

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
          if (uploadType === 'grammar' || uploadType === 'transformation') {
            formData.append('mergeStrategy', mergeStrategy);
          }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.data);
        setUploadProgress(100);
        alert(`${ocrEngine.toUpperCase()} 识别成功！\n\n置信度: ${ocrResult.confidence.toFixed(2)}%\n${data.success ? '上传成功！' : data.error}`);
      } else {
        alert(`${ocrEngine.toUpperCase()} 识别成功，但上传失败：${data.error}`);
      }
    } catch (error) {
      console.error('OCR 上传失败:', error);
      alert(`OCR 上传失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
      setOcrProgress(0);
    }
  };

  /**
   * 大文件模式：前端分批上传
   */
  const handleBatchUpload = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    // 检查文件类型
    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // PDF 文件不支持大文件模式
      alert(
        'PDF 文件不支持大文件模式。\n\n' +
        '请将 PDF 转换为 DOCX 格式（推荐）：\n' +
        '1. 使用 Microsoft Word 打开 PDF\n' +
        '2. 另存为 Word 文档\n' +
        '3. 重新上传 DOCX 文件\n\n' +
        '或者使用普通模式上传（但可能会超时）。'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setBatchProgress(null);

    try {
      // DOCX 文件：直接在浏览器端解析
      console.log('[批量上传] 检测到 DOCX 文件，使用浏览器端解析');

      // 动态导入wordFileProcessor
      const { processWordFile } = await import('@/utils/wordFileProcessor');

      // 处理文件
      const result = await processWordFile(file, 100, (progress) => {
        setBatchProgress(progress);
        setUploadProgress(progress.percentage);
      });

      if (result.success) {
        alert(`上传成功！\n总共 ${result.totalWords} 个单词\n新增 ${result.newWords} 个\n更新 ${result.updatedWords} 个\n失败 ${result.failedWords} 个`);
      } else {
        alert('上传失败');
      }
    } catch (error) {
      console.error('批量上传失败:', error);
      alert(`上传失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
      setBatchProgress(null);
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
                  accept={
                    useOCR
                      ? '.jpg,.jpeg,.png,.gif,.bmp,.webp'
                      : uploadType === 'words' && useBatchMode
                      ? '.docx'
                      : '.txt,.md,.json,.csv,.docx,.pdf'
                  }
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  {useOCR
                    ? 'OCR 模式：支持 JPG, JPEG, PNG, GIF, BMP, WEBP 格式的图片'
                    : uploadType === 'words' && useBatchMode
                    ? '大文件模式仅支持 DOCX 格式。PDF 请转换为 DOCX 或使用普通模式。'
                    : '支持的格式：TXT, MD, JSON, CSV, DOCX, PDF（图片请使用 OCR 模式）'}
                </p>
              </div>

              {/* OCR 开关 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>OCR 识别（图片文字识别）</Label>
                    <p className="text-sm text-muted-foreground">
                      从图片中提取文字，适用于扫描件或截图
                    </p>
                  </div>
                  <Switch
                    checked={useOCR}
                    onCheckedChange={setUseOCR}
                    disabled={isUploading}
                  />
                </div>

                {/* PDF 警告 */}
                {file && file.name.toLowerCase().endsWith('.pdf') && useOCR && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>警告：</strong>PDF 文件不是图片格式，不能直接使用 OCR 识别。<br />
                      系统会自动解析 PDF 文件中的文字。请关闭"OCR 识别"开关后上传。
                    </AlertDescription>
                  </Alert>
                )}

                {useOCR && (
                  <>
                    {/* OCR 引擎选择 */}
                    <div className="space-y-2">
                      <Label>OCR 引擎</Label>
                      <Select value={ocrEngine} onValueChange={(value: any) => setOcrEngine(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tesseract">
                            Tesseract.js（免费，纯前端）
                          </SelectItem>
                          <SelectItem value="paddleocr">
                            PaddleOCR API（推荐，识别效果好）
                          </SelectItem>
                          <SelectItem value="baidu">
                            百度 OCR API（国内首选）
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {ocrEngine === 'tesseract' && '免费开源，首次使用需要加载字库（约 10MB），完全在浏览器端运行。'}
                        {ocrEngine === 'paddleocr' && '官方 API，识别效果好，支持中英文混合，速度快。需要配置 API Token。'}
                        {ocrEngine === 'baidu' && '百度智能云 OCR，国内访问速度快，识别效果优秀，支持高精度识别。需要配置 Access Token。'}
                      </p>
                    </div>

                    {/* 引擎说明 */}
                    {ocrEngine === 'baidu' && (
                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertDescription>
                          百度 OCR API 国内访问速度快，识别效果优秀，支持中英文混合识别和高精度识别。强烈推荐使用！
                        </AlertDescription>
                      </Alert>
                    )}
                    {ocrEngine === 'paddleocr' && (
                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertDescription>
                          PaddleOCR API 识别效果更好，特别是手写文字和复杂排版。建议优先使用。
                        </AlertDescription>
                      </Alert>
                    )}
                    {ocrEngine === 'tesseract' && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          OCR 识别将自动从图片中提取文字。首次使用需要加载字库（约 10MB），可能需要一些时间。
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>

              {/* 大文件模式开关 */}
              {uploadType === 'words' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>大文件模式</Label>
                      <p className="text-sm text-muted-foreground">
                        适用于大文件或大量单词，分批处理避免超时
                      </p>
                    </div>
                    <Switch
                      checked={useBatchMode}
                      onCheckedChange={setUseBatchMode}
                      disabled={isUploading}
                    />
                  </div>

                  {/* PDF 文件提示 */}
                  {file && file.name.toLowerCase().endsWith('.pdf') && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>PDF 文件支持有限：</strong><br />
                        推荐方案：将 PDF 转换为 DOCX 格式（使用 Word 或在线工具），然后重新上传。<br />
                        备选方案：使用普通模式上传（但可能超时）。
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 文件大小提示 */}
                  {file && file.size > 10 * 1024 * 1024 && !useBatchMode && !file.name.toLowerCase().endsWith('.pdf') && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        文件大小超过 10MB，建议开启"大文件模式"以避免超时错误。
                      </AlertDescription>
                    </Alert>
                  )}

                  {useBatchMode && file && !file.name.toLowerCase().endsWith('.pdf') && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        DOCX 文件将在浏览器端解析并分批上传，不受服务器超时限制。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

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

              {/* 合并策略选择（仅语法和词转显示） */}
              {(uploadType === 'grammar' || uploadType === 'transformation') && (
                <div className="space-y-2">
                  <Label>合并策略（检测到重复时）</Label>
                  <Select value={mergeStrategy} onValueChange={(v: any) => setMergeStrategy(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smart_merge">
                        <div className="flex flex-col">
                          <span className="font-medium">智能合并</span>
                          <span className="text-xs text-muted-foreground">
                            AI 辅助选择最佳内容（推荐）
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="replace">
                        <div className="flex flex-col">
                          <span className="font-medium">替换</span>
                          <span className="text-xs text-muted-foreground">
                            直接使用新内容覆盖
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="append">
                        <div className="flex flex-col">
                          <span className="font-medium">追加</span>
                          <span className="text-xs text-muted-foreground">
                            保留原有内容，添加新内容
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="skip">
                        <div className="flex flex-col">
                          <span className="font-medium">跳过</span>
                          <span className="text-xs text-muted-foreground">
                            不修改已有内容
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    当检测到重复内容时，系统会根据选择的策略进行处理
                  </p>
                </div>
              )}

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
                    <span>
                      {ocrProgress > 0 ? `OCR 识别中... ${ocrProgress.toFixed(0)}%`
                        : batchProgress ? batchProgress.stage
                        : '处理中...'}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                  {/* OCR 进度提示 */}
                  {ocrProgress > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>正在识别图片文字，首次使用需要加载字库（约 10MB），请稍候...</span>
                      </div>
                    </div>
                  )}
                  {/* 批量上传详细进度 */}
                  {batchProgress && (
                    <div className="text-xs text-muted-foreground space-y-1 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      <div className="flex justify-between">
                        <span>总单词数：</span>
                        <span className="font-medium">{batchProgress.totalWords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>已处理：</span>
                        <span className="font-medium">{batchProgress.processedWords} / {batchProgress.totalWords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>当前批次：</span>
                        <span className="font-medium">{batchProgress.currentBatch} / {batchProgress.totalBatches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>新增：</span>
                        <span className="font-medium text-green-600">{batchProgress.newWords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>更新：</span>
                        <span className="font-medium text-blue-600">{batchProgress.updatedWords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>失败：</span>
                        <span className="font-medium text-red-600">{batchProgress.failedWords}</span>
                      </div>
                    </div>
                  )}
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

                    {/* 去重统计（仅语法和词转显示） */}
                    {uploadResult.deduplicationStats && (uploadType === 'grammar' || uploadType === 'transformation') && (
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          去重统计
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                            <div className="text-lg font-bold text-blue-600">
                              {uploadResult.deduplicationStats.exactMatches}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">精确匹配</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                            <div className="text-lg font-bold text-yellow-600">
                              {uploadResult.deduplicationStats.possibleMatches}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">可能匹配</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                            <div className="text-lg font-bold text-green-600">
                              {uploadResult.deduplicationStats.confirmedByAI}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">AI 确认重复</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                            <div className="text-lg font-bold text-red-600">
                              {uploadResult.deduplicationStats.falsePositives}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">AI 排除误判</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-purple-50 dark:bg-purple-950">
                            <div className="text-lg font-bold text-purple-600">
                              {uploadResult.deduplicationStats.mergedItems}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">已合并</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                            <div className="text-lg font-bold text-gray-600">
                              {uploadResult.deduplicationStats.newItems}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">新增内容</div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          系统使用精确匹配、模糊匹配和 AI 判断三种方式检测重复内容
                        </p>
                      </div>
                    )}

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
