/**
 * PaddleOCR 配置
 * 请在部署环境中配置以下环境变量
 */

// 从环境变量获取 PaddleOCR 配置
export const PADDLE_OCR_CONFIG = {
  // PaddleOCR API 地址
  apiUrl: process.env.NEXT_PUBLIC_PADDLE_OCR_API_URL || '',

  // PaddleOCR API Token
  token: process.env.NEXT_PUBLIC_PADDLE_OCR_TOKEN || '',

  // 是否启用 PaddleOCR
  enabled: !!(process.env.NEXT_PUBLIC_PADDLE_OCR_API_URL && process.env.NEXT_PUBLIC_PADDLE_OCR_TOKEN),
};

/**
 * 初始化 PaddleOCR 配置
 * 在客户端加载时调用
 */
export function initPaddleOCRConfig() {
  if (typeof window !== 'undefined' && PADDLE_OCR_CONFIG.enabled) {
    // 将配置注入到 window 对象
    (window as any).__PADDLE_OCR_CONFIG__ = {
      apiUrl: PADDLE_OCR_CONFIG.apiUrl,
      token: PADDLE_OCR_CONFIG.token,
    };

    console.log('[PaddleOCR] 配置已初始化:', {
      apiUrl: PADDLE_OCR_CONFIG.apiUrl,
      hasToken: !!PADDLE_OCR_CONFIG.token,
    });
  }
}

/**
 * 检查 PaddleOCR 是否已配置
 */
export function isPaddleOCRConfigured(): boolean {
  return PADDLE_OCR_CONFIG.enabled;
}
