/**
 * PaddleOCR API 工具类
 * 使用 PaddleOCR 官方 API 进行图像文字识别
 */

export interface PaddleOCRConfig {
  apiUrl: string;
  token: string;
}

export interface PaddleOCRResult {
  success: boolean;
  text: string;
  confidence: number;
  lines: {
    text: string;
    confidence: number;
    box: number[][];
  }[];
  error?: string;
}

/**
 * 默认配置（需要在环境变量或配置文件中设置）
 */
let paddleOCRConfig: PaddleOCRConfig | null = null;

/**
 * 初始化 PaddleOCR 配置
 */
export function initPaddleOCR(config: PaddleOCRConfig) {
  paddleOCRConfig = config;
  console.log('[PaddleOCR] 配置已设置:', {
    apiUrl: config.apiUrl,
    hasToken: !!config.token,
  });
}

/**
 * 从环境变量加载配置
 */
export function loadPaddleOCRFromEnv(): boolean {
  // 尝试从 window 获取配置（客户端）
  if (typeof window !== 'undefined') {
    const config = (window as any).__PADDLE_OCR_CONFIG__;
    if (config) {
      initPaddleOCR(config);
      return true;
    }

    // 尝试从环境变量读取（在构建时注入）
    const apiUrl = process?.env?.NEXT_PUBLIC_PADDLE_OCR_API_URL || '';
    const token = process?.env?.NEXT_PUBLIC_PADDLE_OCR_TOKEN || '';

    if (apiUrl && token) {
      initPaddleOCR({ apiUrl, token });
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
 * 识别图片中的文字
 * @param image 图片文件或 Base64 字符串
 * @param onProgress 进度回调（可选）
 * @returns 识别结果
 */
export async function recognizeWithPaddleOCR(
  image: File | string,
  onProgress?: (progress: number) => void
): Promise<PaddleOCRResult> {
  // 加载配置
  if (!paddleOCRConfig) {
    const loaded = loadPaddleOCRFromEnv();
    if (!loaded) {
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: 'PaddleOCR 配置未设置，请联系管理员',
      };
    }
  }

  const config = paddleOCRConfig!;

  try {
    console.log('[PaddleOCR] 开始识别图片');

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

    // 构建请求体
    const requestBody = {
      image: base64Image,
      // 可选参数
      det: true,  // 文本检测
      rec: true,  // 文本识别
      cls: true,  // 方向分类
      use_angle_cls: true,  // 使用方向分类
      lang: 'ch',  // 语言：ch=中英文，en=英文
    };

    // 发送请求到 PaddleOCR API
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    // 更新进度：处理响应
    if (onProgress) onProgress(70);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PaddleOCR] API 请求失败:', response.status, errorText);
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: `API 请求失败: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('[PaddleOCR] API 响应:', data);

    // 解析结果
    // PaddleOCR API 返回格式可能是：
    // { "results": [{ "text": "...", "confidence": 0.99, "box": [...] }] }
    // 或者其他格式
    let lines: { text: string; confidence: number; box: number[][] }[] = [];
    let fullText = '';
    let totalConfidence = 0;

    if (data.results && Array.isArray(data.results)) {
      // 格式1：results 数组
      lines = data.results.map((item: any) => ({
        text: item.text || '',
        confidence: item.confidence || 0,
        box: item.box || [],
      }));
    } else if (data.data && Array.isArray(data.data)) {
      // 格式2：data 数组
      lines = data.data.map((item: any) => ({
        text: item.text || '',
        confidence: item.confidence || 0,
        box: item.box || [],
      }));
    } else if (Array.isArray(data)) {
      // 格式3：直接是数组
      lines = data.map((item: any) => ({
        text: item.text || '',
        confidence: item.confidence || 0,
        box: item.box || [],
      }));
    } else {
      console.warn('[PaddleOCR] 无法识别的响应格式:', data);
      return {
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: '无法识别 API 响应格式',
      };
    }

    // 提取全文
    fullText = lines.map(line => line.text).join('\n');

    // 计算平均置信度
    if (lines.length > 0) {
      totalConfidence = lines.reduce((sum, line) => sum + line.confidence, 0) / lines.length;
    }

    // 更新进度：完成
    if (onProgress) onProgress(100);

    console.log('[PaddleOCR] 识别完成:', {
      success: true,
      textLength: fullText.length,
      linesCount: lines.length,
      confidence: totalConfidence,
    });

    return {
      success: true,
      text: fullText,
      confidence: totalConfidence,
      lines,
    };

  } catch (error) {
    console.error('[PaddleOCR] 识别失败:', error);
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
 * @param images 图片数组
 * @param onProgress 整体进度回调
 * @returns 识别结果数组
 */
export async function recognizeBatchWithPaddleOCR(
  images: (File | string)[],
  onProgress?: (progress: number) => void
): Promise<PaddleOCRResult[]> {
  const results: PaddleOCRResult[] = [];
  const total = images.length;

  console.log('[PaddleOCR] 开始批量识别，总图片数:', total);

  for (let i = 0; i < total; i++) {
    try {
      console.log(`[PaddleOCR] 处理第 ${i + 1}/${total} 张图片`);

      const result = await recognizeWithPaddleOCR(
        images[i],
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
      console.error(`[PaddleOCR] 第 ${i + 1} 张图片识别失败:`, error);
      results.push({
        success: false,
        text: '',
        confidence: 0,
        lines: [],
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  console.log('[PaddleOCR] 批量识别完成');
  return results;
}

/**
 * 检查配置是否已设置
 */
export function isPaddleOCRConfigured(): boolean {
  return paddleOCRConfig !== null || loadPaddleOCRFromEnv();
}
