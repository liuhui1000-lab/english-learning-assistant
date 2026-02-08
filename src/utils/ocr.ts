/**
 * OCR 工具类
 * 使用 Tesseract.js 进行图像文字识别
 */

import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  lines: {
    text: string;
    confidence: number;
  }[];
}

/**
 * OCR 配置
 */
export interface OCROptions {
  language?: 'eng' | 'chi_sim' | 'chi_tra' | string;
  // 支持的语言代码：
  // eng: 英语
  // chi_sim: 简体中文
  // chi_tra: 繁体中文
  // 可以组合使用，如 'eng+chi_sim'
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: OCROptions = {
  language: 'eng+chi_sim', // 中英混合
};

/**
 * OCR 单例，避免重复创建 Worker
 */
let ocrWorker: Tesseract.Worker | null = null;

/**
 * 初始化 OCR Worker
 */
async function initWorker(language: string): Promise<Tesseract.Worker> {
  if (ocrWorker) {
    return ocrWorker;
  }

  console.log('[OCR] 初始化 Worker，语言:', language);
  ocrWorker = await Tesseract.createWorker(language);

  // 设置日志级别
  ocrWorker.setParameters({
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        console.log(`[OCR] 识别进度: ${(m.progress * 100).toFixed(1)}%`);
      }
    },
  });

  return ocrWorker;
}

/**
 * 终止 OCR Worker
 */
export async function terminateWorker(): Promise<void> {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
    console.log('[OCR] Worker 已终止');
  }
}

/**
 * 从图像识别文字
 * @param image 图像（可以是 File、Blob、URL 或图像元素）
 * @param options OCR 配置
 * @param onProgress 进度回调
 * @returns 识别结果
 */
export async function recognizeText(
  image: File | Blob | string | HTMLImageElement | HTMLCanvasElement,
  options: OCROptions = {},
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const language = options.language || DEFAULT_OPTIONS.language || 'eng+chi_sim';

  console.log('[OCR] 开始识别文字，语言:', language);

  try {
    // 初始化 Worker
    const worker = await initWorker(language);

    // 识别文字
    const result = await worker.recognize(image);

    console.log('[OCR] 识别完成，置信度:', result.data.confidence);

    // 解析行数据
    const lines = (result.data as any).lines.map((line: any) => ({
      text: line.text.trim(),
      confidence: line.confidence,
    })).filter((line: any) => line.text.length > 0);

    // 更新进度
    if (onProgress) {
      onProgress(100);
    }

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      lines,
    };
  } catch (error) {
    console.error('[OCR] 识别失败:', error);
    throw new Error(`OCR 识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从多个图像批量识别文字
 * @param images 图像数组
 * @param options OCR 配置
 * @param onProgress 进度回调（整体进度）
 * @returns 识别结果数组
 */
export async function recognizeBatch(
  images: (File | Blob | string)[],
  options: OCROptions = {},
  onProgress?: (progress: number) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];
  const total = images.length;

  console.log('[OCR] 开始批量识别，总图像数:', total);

  for (let i = 0; i < total; i++) {
    try {
      console.log(`[OCR] 处理第 ${i + 1}/${total} 张图像`);

      const result = await recognizeText(
        images[i],
        options,
        (progress) => {
          // 计算整体进度
          const overallProgress = ((i + progress / 100) / total) * 100;
          if (onProgress) {
            onProgress(overallProgress);
          }
        }
      );

      results.push(result);
    } catch (error) {
      console.error(`[OCR] 第 ${i + 1} 张图像识别失败:`, error);
      // 失败时添加空结果
      results.push({
        text: '',
        confidence: 0,
        lines: [],
      });
    }
  }

  console.log('[OCR] 批量识别完成');
  return results;
}

/**
 * 清理 OCR 资源
 */
export async function cleanupOCR(): Promise<void> {
  await terminateWorker();
}

/**
 * 检测图像中的文字语言
 * @param text 识别出的文字
 * @returns 语言代码
 */
export function detectLanguage(text: string): 'eng' | 'chi_sim' | 'chi_tra' | 'eng+chi_sim' {
  // 统计中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 统计英文字符
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

  // 根据比例判断
  if (chineseChars > englishChars * 0.5) {
    // 主要是中文，检测是否包含简体或繁体
    const simplified = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const traditional = (text.match(/[\u9fa6-\u9fff]/g) || []).length;

    if (simplified > traditional) {
      return englishChars > 0 ? 'eng+chi_sim' : 'chi_sim';
    } else {
      return englishChars > 0 ? 'eng+chi_sim' : 'chi_tra';
    }
  } else {
    // 主要是英文
    return englishChars > 0 ? 'eng' : 'eng+chi_sim';
  }
}
