/**
 * 百度 OCR API 工具类
 * 使用百度智能云 OCR 进行图像文字识别
 */

export interface BaiduOCRConfig {
  accessToken: string;
}

export interface BaiduOCRResult {
  success: boolean;
  text: string;
  confidence: number;
  lines: {
    text: string;
    confidence: number;
    position: { left: number; top: number; width: number; height: number };
  }[];
  error?: string;
  wordsResult?: {
    words: string;
    probability?: {
      average: number;
      variance: number;
      min: number;
    };
  }[];
}

/**
 * 默认配置
 */
let baiduOCRConfig: BaiduOCRConfig | null = null;

/**
 * 初始化百度 OCR 配置
 */
export function initBaiduOCR(config: BaiduOCRConfig) {
  baiduOCRConfig = config;
  console.log('[百度 OCR] 配置已设置:', {
    hasToken: !!config.accessToken,
  });
}

/**
 * 从环境变量加载配置
 */
export function loadBaiduOCRFromEnv(): boolean {
  // 尝试从 window 获取配置（客户端）
  if (typeof window !== 'undefined') {
    const config = (window as any).__BAIDU_OCR_CONFIG__;
    if (config) {
      initBaiduOCR(config);
      return true;
    }

    // 尝试从环境变量读取
    const accessToken = process?.env?.NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN || '';

    if (accessToken) {
      initBaiduOCR({ accessToken });
      return true;
    }
  }

  return false;
}

/**
 * 将文件转换为 Base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 识别图片中的文字（通用文字识别）
 * @param image 图片文件或 Base64 字符串
 * @param options 选项
 * @param onProgress 进度回调（可选）
 * @returns 识别结果
 */
export async function recognizeWithBaiduOCR(
  image: File | string,
  options?: {
    detectDirection?: boolean;  // 是否检测图像朝向
    languageType?: 'CHN_ENG' | 'ENG' | 'POR' | 'FRE' | 'GER' | 'ITA' | 'SPA' | 'RUS' | 'JAP' | 'KOR';  // 识别语言类型
    detectLanguage?: boolean;  // 是否检测语言
  },
  onProgress?: (progress: number) => void
): Promise<BaiduOCRResult> {
  // 加载配置
  if (!baiduOCRConfig) {
    const loaded = loadBaiduOCRFromEnv();
    if (!loaded) {
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: '百度 OCR 配置未设置，请联系管理员',
      };
    }
  }

  const config = baiduOCRConfig!;

  try {
    console.log('[百度 OCR] 开始识别图片');

    // 更新进度：准备中
    if (onProgress) onProgress(10);

    // 转换图片为 Base64
    let base64Image: string;
    if (typeof image === 'string') {
      base64Image = image.startsWith('data:image')
        ? image.split(',')[1]
        : image;
    } else {
      base64Image = await fileToBase64(image);
    }

    // 更新进度：发送请求
    if (onProgress) onProgress(30);

    // 构建请求参数
    const params = new URLSearchParams();
    params.append('image', base64Image);

    if (options?.detectDirection !== undefined) {
      params.append('detect_direction', options.detectDirection ? 'true' : 'false');
    }

    if (options?.languageType) {
      params.append('language_type', options.languageType);
    }

    if (options?.detectLanguage !== undefined) {
      params.append('detect_language', options.detectLanguage ? 'true' : 'false');
    }

    // 发送请求到百度 OCR API
    // 通用文字识别（标准版）
    const apiUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${config.accessToken}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // 更新进度：处理响应
    if (onProgress) onProgress(70);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[百度 OCR] API 请求失败:', response.status, errorText);

      let errorMsg = `API 请求失败: ${response.status}`;
      if (response.status === 401) {
        errorMsg = 'Access Token 无效或已过期，请检查配置';
      } else if (response.status === 429) {
        errorMsg = '调用次数超出限制，请稍后重试';
      }

      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: errorMsg,
      };
    }

    const data = await response.json();
    console.log('[百度 OCR] API 响应:', data);

    // 解析结果
    // 百度 OCR 返回格式：
    // {
    //   "words_result": [
    //     { "words": "识别出的文字" },
    //     ...
    //   ]
    // }

    if (data.error_code) {
      const errorMsg = data.error_msg || `错误码: ${data.error_code}`;
      console.error('[百度 OCR] API 返回错误:', data.error_code, errorMsg);

      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: errorMsg,
      };
    }

    const wordsResult: Array<{
      words: string;
      probability?: { average: number; variance: number; min: number };
    }> = data.words_result || [];

    if (wordsResult.length === 0) {
      console.warn('[百度 OCR] 未识别到文字');
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: '未识别到文字，请尝试使用更清晰的图片',
      };
    }

    // 提取全文
    const fullText = wordsResult.map(item => item.words).join('\n');

    // 计算置信度
    let totalConfidence = 0;
    const lines: {
      text: string;
      confidence: number;
      position: { left: number; top: number; width: number; height: number };
    }[] = [];

    wordsResult.forEach((item, index) => {
      const confidence = item.probability?.average || 0.95; // 如果没有概率信息，默认 0.95
      totalConfidence += confidence;

      lines.push({
        text: item.words,
        confidence,
        position: {
          left: 0,
          top: index * 20,
          width: 100,
          height: 20,
        },
      });
    });

    const averageConfidence = wordsResult.length > 0
      ? totalConfidence / wordsResult.length
      : 0;

    // 更新进度：完成
    if (onProgress) onProgress(100);

    console.log('[百度 OCR] 识别完成:', {
      success: true,
      textLength: fullText.length,
      linesCount: wordsResult.length,
      confidence: averageConfidence,
    });

    return {
      success: true,
      text: fullText,
      confidence: averageConfidence,
      lines,
      wordsResult,
    };

  } catch (error) {
    console.error('[百度 OCR] 识别失败:', error);
    return {
      success: false,
      text: '',
      confidence: 0,
      lines: [],
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 识别图片中的文字（高精度版）
 * 适用于对识别精度要求更高的场景
 */
export async function recognizeWithBaiduOCRAccurate(
  image: File | string,
  onProgress?: (progress: number) => void
): Promise<BaiduOCRResult> {
  // 加载配置
  if (!baiduOCRConfig) {
    const loaded = loadBaiduOCRFromEnv();
    if (!loaded) {
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: '百度 OCR 配置未设置，请联系管理员',
      };
    }
  }

  const config = baiduOCRConfig!;

  try {
    console.log('[百度 OCR] 开始高精度识别');

    if (onProgress) onProgress(10);

    // 转换图片为 Base64
    let base64Image: string;
    if (typeof image === 'string') {
      base64Image = image.startsWith('data:image')
        ? image.split(',')[1]
        : image;
    } else {
      base64Image = await fileToBase64(image);
    }

    if (onProgress) onProgress(30);

    // 构建请求参数
    const params = new URLSearchParams();
    params.append('image', base64Image);

    // 发送请求到百度 OCR API
    // 通用文字识别（高精度版）
    const apiUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${config.accessToken}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (onProgress) onProgress(70);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[百度 OCR] 高精度 API 请求失败:', response.status, errorText);

      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: `API 请求失败: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('[百度 OCR] 高精度 API 响应:', data);

    if (data.error_code) {
      const errorMsg = data.error_msg || `错误码: ${data.error_code}`;
      console.error('[百度 OCR] API 返回错误:', data.error_code, errorMsg);

      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: errorMsg,
      };
    }

    const wordsResult: Array<{
      words: string;
      probability?: { average: number; variance: number; min: number };
    }> = data.words_result || [];

    if (wordsResult.length === 0) {
      console.warn('[百度 OCR] 高精度识别未识别到文字');
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: '未识别到文字，请尝试使用更清晰的图片',
      };
    }

    // 提取全文
    const fullText = wordsResult.map(item => item.words).join('\n');

    // 计算置信度
    let totalConfidence = 0;
    const lines: {
      text: string;
      confidence: number;
      position: { left: number; top: number; width: number; height: number };
    }[] = [];

    wordsResult.forEach((item, index) => {
      const confidence = item.probability?.average || 0.95;
      totalConfidence += confidence;

      lines.push({
        text: item.words,
        confidence,
        position: {
          left: 0,
          top: index * 20,
          width: 100,
          height: 20,
        },
      });
    });

    const averageConfidence = wordsResult.length > 0
      ? totalConfidence / wordsResult.length
      : 0;

    if (onProgress) onProgress(100);

    console.log('[百度 OCR] 高精度识别完成:', {
      success: true,
      textLength: fullText.length,
      linesCount: wordsResult.length,
      confidence: averageConfidence,
    });

    return {
      success: true,
      text: fullText,
      confidence: averageConfidence,
      lines,
      wordsResult,
    };

  } catch (error) {
    console.error('[百度 OCR] 高精度识别失败:', error);
    return {
      success: false,
      text: '',
      confidence: 0,
      lines: [],
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量识别多张图片
 */
export async function recognizeBatchWithBaiduOCR(
  images: (File | string)[],
  onProgress?: (progress: number) => void
): Promise<BaiduOCRResult[]> {
  const results: BaiduOCRResult[] = [];
  const total = images.length;

  console.log('[百度 OCR] 开始批量识别，总图片数:', total);

  for (let i = 0; i < total; i++) {
    try {
      console.log(`[百度 OCR] 处理第 ${i + 1}/${total} 张图片`);

      const result = await recognizeWithBaiduOCR(
        images[i],
        {}, // options
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
      console.error(`[百度 OCR] 第 ${i + 1} 张图片识别失败:`, error);
      results.push({
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  console.log('[百度 OCR] 批量识别完成');
  return results;
}

/**
 * 检查配置是否已设置
 */
export function isBaiduOCRConfigured(): boolean {
  return baiduOCRConfig !== null || loadBaiduOCRFromEnv();
}
