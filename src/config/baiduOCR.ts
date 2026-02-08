/**
 * 百度 OCR 配置
 * 请在部署环境中配置以下环境变量
 */

// 从环境变量获取百度 OCR 配置
export const BAIDU_OCR_CONFIG = {
  // 百度 OCR Access Token
  accessToken: process.env.NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN || '',

  // 是否启用百度 OCR
  enabled: !!process.env.NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN,
};

/**
 * 初始化百度 OCR 配置
 * 在客户端加载时调用
 */
export function initBaiduOCRConfig() {
  if (typeof window !== 'undefined' && BAIDU_OCR_CONFIG.enabled) {
    // 将配置注入到 window 对象
    (window as any).__BAIDU_OCR_CONFIG__ = {
      accessToken: BAIDU_OCR_CONFIG.accessToken,
    };

    console.log('[百度 OCR] 配置已初始化:', {
      hasToken: !!BAIDU_OCR_CONFIG.accessToken,
    });
  }
}

/**
 * 检查百度 OCR 是否已配置
 */
export function isBaiduOCRConfigured(): boolean {
  return BAIDU_OCR_CONFIG.enabled;
}
