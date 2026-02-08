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

  console.log('[wordFileProcessor] 文本总行数:', lines.length);
  console.log('[wordFileProcessor] 前 10 行内容:', lines.slice(0, 10));

  const words: WordData[] = [];

  for (const line of lines) {
    // 跳过太短的行
    if (line.length < 3) continue;

    // 跳过纯中文行（标题、说明等）
    if (/^[\u4e00-\u9fa5\s（）()]+$/.test(line)) continue;

    // 尝试匹配多种格式

    // 格式1：填空格式（带下划线）
    // 例如：1.________['ɑ:ftə] prep.在…之后
    // 注意：填空格式没有单词信息，直接跳过
    const fillBlankMatch = line.match(/^\d+\.\s*_+/);
    if (fillBlankMatch) {
      // 跳过填空格式，等待后面完整清单
      continue;
    }

    // 格式2：带序号格式（标准格式）
    // 例如：1. after ['ɑ:ftə] prep.在…之后
    const numberedMatch = line.match(/^\d+\.\s*(.+)/);
    if (numberedMatch) {
      const content = numberedMatch[1].trim();
      console.log('[wordFileProcessor] 检测到序号格式:', content);

      const wordInfo = extractWordInfo(content);
      if (wordInfo && wordInfo.word) {
        words.push(wordInfo);
      }
      continue;
    }

    // 格式3：简化格式：单词 + 任意分隔符 + 中文词义
    // 支持的分隔符：空格、制表符、-、：、: 、、、. ，，
    const match = line.match(/^([a-zA-Z]+)[\s\t\-：:：、.,，]+([\u4e00-\u9fa5\s\w\p{P}]+)$/u);

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
      } else {
        // 尝试提取行首的第一个英文单词
        const firstWordMatch = line.match(/^([a-zA-Z]+)/);
        if (firstWordMatch && firstWordMatch[1].length > 1) {
          // 检查行中是否有中文
          const hasChinese = /[\u4e00-\u9fa5]/.test(line);
          if (hasChinese) {
            // 提取中文部分作为词义
            const chinesePart = line.substring(firstWordMatch[0].length).replace(/^[^\u4e00-\u9fa5]+/, '').trim();
            if (chinesePart.length > 0) {
              words.push({
                word: firstWordMatch[1].toLowerCase(),
                definition: chinesePart,
              });
            }
          } else {
            // 没有中文，只保存单词
            words.push({
              word: firstWordMatch[1].toLowerCase(),
            });
          }
        }
      }
    }
  }

  console.log('[wordFileProcessor] 提取结果:', {
    总行数: lines.length,
    提取单词数: words.length,
    前5个单词: words.slice(0, 5),
  });

  return words;
}

/**
 * 从一行内容中提取单词信息
 * 支持格式：
 * - word ['ipa'] pos.中文
 * - word [ipa] 中文
 * - word pos.中文
 * - word 中文
 * - 支持词组（多个单词）
 */
function extractWordInfo(content: string): WordData | null {
  // 格式1：word ['ipa'] pos.中文（支持词组）
  const match1 = content.match(/^([a-zA-Z\s\-']+)\s*\[([^\]]+)\]\s*(n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|num\.|art\.|interj\.)\s*([\u4e00-\u9fa5\s\w\p{P}]+)$/u);
  if (match1) {
    const [, word, pronunciation, partOfSpeech, definition] = match1;
    return {
      word: word.trim().toLowerCase(),
      pronunciation: pronunciation.trim(),
      partOfSpeech: partOfSpeech.trim(),
      definition: definition.trim(),
    };
  }

  // 格式2：word ['ipa'] 中文（无词性，支持词组）
  const match2 = content.match(/^([a-zA-Z\s\-']+)\s*\[([^\]]+)\]\s*([\u4e00-\u9fa5\s\w\p{P}]+)$/u);
  if (match2) {
    const [, word, pronunciation, definition] = match2;
    return {
      word: word.trim().toLowerCase(),
      pronunciation: pronunciation.trim(),
      definition: definition.trim(),
    };
  }

  // 格式3：word pos.中文（无音标，支持词组）
  const match3 = content.match(/^([a-zA-Z\s\-']+)\s*(n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|num\.|art\.|interj\.)\s*([\u4e00-\u9fa5\s\w\p{P}]+)$/u);
  if (match3) {
    const [, word, partOfSpeech, definition] = match3;
    return {
      word: word.trim().toLowerCase(),
      partOfSpeech: partOfSpeech.trim(),
      definition: definition.trim(),
    };
  }

  // 格式4：word 中文（只有单词和中文，支持词组）
  const match4 = content.match(/^([a-zA-Z\s\-']+)\s+([\u4e00-\u9fa5\s\w\p{P}]+)$/u);
  if (match4) {
    const [, word, definition] = match4;
    return {
      word: word.trim().toLowerCase(),
      definition: definition.trim(),
    };
  }

  // 格式5：word pos.中文（词性可能是中英文混合，支持词组）
  const match5 = content.match(/^([a-zA-Z\s\-']+)\s*([^\s]+)\s*([\u4e00-\u9fa5\s\w\p{P}]+)$/u);
  if (match5) {
    const [, word, posOrDef, definition] = match5;
    // 检查第二部分是否是词性
    const isPartOfSpeech = /^n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|num\.|art\.|interj\.$/.test(posOrDef);

    if (isPartOfSpeech && definition) {
      return {
        word: word.trim().toLowerCase(),
        partOfSpeech: posOrDef.trim(),
        definition: definition.trim(),
      };
    } else if (posOrDef && /[\u4e00-\u9fa5]/.test(posOrDef)) {
      // 如果第二部分是中文，作为词义
      return {
        word: word.trim().toLowerCase(),
        definition: (posOrDef + ' ' + (definition || '')).trim(),
      };
    }
  }

  // 格式6：纯英文单词或词组
  const pureWordMatch = content.match(/^([a-zA-Z\s\-']+)$/);
  if (pureWordMatch && pureWordMatch[1].trim().length > 1) {
    return {
      word: pureWordMatch[1].trim().toLowerCase(),
    };
  }

  // 尝试提取第一个英文单词或词组（直到遇到中文字符）
  const firstWordMatch = content.match(/^([a-zA-Z\s\-']+)/);
  if (firstWordMatch && firstWordMatch[1].trim().length > 1) {
    // 提取后面的中文部分
    const rest = content.substring(firstWordMatch[0].length);
    const chinesePart = rest.replace(/^[^\u4e00-\u9fa5]+/, '').trim();

    if (chinesePart.length > 0) {
      return {
        word: firstWordMatch[1].trim().toLowerCase(),
        definition: chinesePart,
      };
    } else {
      return {
        word: firstWordMatch[1].trim().toLowerCase(),
      };
    }
  }

  return null;
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
