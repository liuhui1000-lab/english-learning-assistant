/**
 * 前端单词解析器
 * 在浏览器端解析大文件，分批处理
 */

import mammoth from 'mammoth';

export interface WordData {
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definition?: string;
  example?: string;
  exampleTranslation?: string;
}

export interface BatchUploadProgress {
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

/**
 * 解析 Word 文档
 */
export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * 从文本中提取单词（简化版规则解析）
 */
export function extractWordsFromText(text: string): WordData[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const words: WordData[] = [];

  for (const line of lines) {
    // 跳过太短的行
    if (line.length < 3) continue;

    // 跳过纯中文行
    if (/^[\u4e00-\u9fa5\s]+$/.test(line)) continue;

    // 尝试匹配简化格式：单词 + 分隔符 + 中文词义
    const spaceMatch = line.match(/^([a-zA-Z]+)\s+([\u4e00-\u9fa5\s].+)$/);
    const separatorMatch = line.match(/^([a-zA-Z]+)\s*[-：:、]\s*(.+)$/);

    let match = spaceMatch || separatorMatch;

    if (match) {
      const [, word, definition] = match;
      const cleanDefinition = definition.replace(/[\s\r\n]+/g, ' ').trim();

      words.push({
        word: word.toLowerCase(),
        definition: cleanDefinition,
      });
    } else {
      // 检查是否是纯英文单词
      const pureWordMatch = line.match(/^([a-zA-Z]+)$/);
      if (pureWordMatch) {
        words.push({
          word: pureWordMatch[1].toLowerCase(),
        });
      }
    }
  }

  return words;
}

/**
 * 分批上传单词
 * @param words 单词列表
 * @param batchSize 每批大小（默认 100）
 * @param onProgress 进度回调
 * @returns 上传结果
 */
export async function uploadWordsInBatches(
  words: WordData[],
  batchSize: number = 100,
  onProgress?: (progress: BatchUploadProgress) => void
): Promise<{
  success: boolean;
  totalWords: number;
  uploadedWords: number;
  newWords: number;
  updatedWords: number;
  failedWords: number;
}> {
  const totalBatches = Math.ceil(words.length / batchSize);
  let uploadedWords = 0;
  let newWords = 0;
  let updatedWords = 0;
  let failedWords = 0;

  // 分批上传
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, words.length);
    const batch = words.slice(start, end);

    // 更新进度
    onProgress?.({
      totalWords: words.length,
      processedWords: uploadedWords,
      currentBatch: i + 1,
      totalBatches,
      percentage: Math.round((uploadedWords / words.length) * 100),
      stage: `正在上传第 ${i + 1} 批`,
      newWords,
      updatedWords,
      failedWords,
      status: 'uploading',
    });

    try {
      const response = await fetch('/api/admin/words/batch-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          words: batch,
          batchNumber: i + 1,
          totalBatches,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '批量上传失败');
      }

      const result = await response.json();

      uploadedWords += batch.length;
      newWords += result.data.newWords || 0;
      updatedWords += result.data.updatedWords || 0;
      failedWords += result.data.failedWords || 0;

      // 更新进度
      onProgress?.({
        totalWords: words.length,
        processedWords: uploadedWords,
        currentBatch: i + 1,
        totalBatches,
        percentage: Math.round((uploadedWords / words.length) * 100),
        stage: `正在上传第 ${i + 1} 批`,
        newWords,
        updatedWords,
        failedWords,
        status: 'uploading',
      });

    } catch (error) {
      console.error(`批次 ${i + 1} 上传失败:`, error);
      failedWords += batch.length;

      // 更新进度
      onProgress?.({
        totalWords: words.length,
        processedWords: uploadedWords,
        currentBatch: i + 1,
        totalBatches,
        percentage: Math.round((uploadedWords / words.length) * 100),
        stage: `上传第 ${i + 1} 批失败`,
        newWords,
        updatedWords,
        failedWords,
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  // 完成进度
  onProgress?.({
    totalWords: words.length,
    processedWords: uploadedWords,
    currentBatch: totalBatches,
    totalBatches,
    percentage: 100,
    stage: '上传完成',
    newWords,
    updatedWords,
    failedWords,
    status: 'completed',
  });

  return {
    success: true,
    totalWords: words.length,
    uploadedWords,
    newWords,
    updatedWords,
    failedWords,
  };
}

/**
 * 完整的文件处理流程
 */
export async function processWordFile(
  file: File,
  batchSize: number = 100,
  onProgress?: (progress: BatchUploadProgress) => void
): Promise<{
  success: boolean;
  totalWords: number;
  uploadedWords: number;
  newWords: number;
  updatedWords: number;
  failedWords: number;
}> {
  try {
    // 1. 更新进度：解析中
    onProgress?.({
      totalWords: 0,
      processedWords: 0,
      currentBatch: 0,
      totalBatches: 0,
      percentage: 0,
      stage: '正在解析文件',
      newWords: 0,
      updatedWords: 0,
      failedWords: 0,
      status: 'parsing',
    });

    // 2. 解析文件
    console.log('[前端处理] 开始解析文件:', file.name);
    const text = await parseDocxFile(file);
    console.log('[前端处理] 文件解析完成，文本长度:', text.length);

    // 3. 提取单词
    console.log('[前端处理] 开始提取单词');
    const words = extractWordsFromText(text);
    console.log('[前端处理] 提取完成，共', words.length, '个单词');

    if (words.length === 0) {
      throw new Error('未能从文件中提取到单词');
    }

    // 4. 分批上传
    console.log('[前端处理] 开始分批上传，批次大小:', batchSize);
    const result = await uploadWordsInBatches(words, batchSize, onProgress);
    console.log('[前端处理] 上传完成:', result);

    return result;

  } catch (error) {
    console.error('[前端处理] 处理失败:', error);

    onProgress?.({
      totalWords: 0,
      processedWords: 0,
      currentBatch: 0,
      totalBatches: 0,
      percentage: 0,
      stage: '处理失败',
      newWords: 0,
      updatedWords: 0,
      failedWords: 0,
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    });

    throw error;
  }
}
