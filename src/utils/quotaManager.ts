/**
 * Gemini API 配额管理器
 * 跟踪 API 使用情况，处理免费额度限制
 */

interface QuotaUsage {
  date: string; // YYYY-MM-DD
  totalCalls: number;
  documentCalls: number; // 文档分析调用
  mistakeCalls: number; // 错题分析调用
  lastCallAt: string;
}

interface QuotaInfo {
  dailyLimit: number;
  used: number;
  remaining: number;
  percentage: number;
  resetTime: string; // 下次重置时间（UTC）
  canCall: boolean;
  canRetryAt: string | null; // 建议重试时间
  message: string;
}

export class QuotaManager {
  private static readonly DAILY_LIMIT = 1500;
  private static readonly DAILY_LIMIT_RESET_HOUR = 0; // UTC 时间（北京时间 8:00）
  private static usage: Map<string, QuotaUsage> = new Map();

  /**
   * 获取今日配额信息
   */
  static async getQuotaInfo(): Promise<QuotaInfo> {
    const today = this.getTodayDateString();
    const usage = this.usage.get(today) || {
      date: today,
      totalCalls: 0,
      documentCalls: 0,
      mistakeCalls: 0,
      lastCallAt: new Date().toISOString(),
    };

    const used = usage.totalCalls;
    const remaining = this.DAILY_LIMIT - used;
    const percentage = (used / this.DAILY_LIMIT) * 100;
    const canCall = remaining > 0;

    // 计算下次重置时间（UTC）
    const resetTime = this.calculateResetTime();

    // 如果额度用完，计算建议重试时间
    let canRetryAt: string | null = null;
    if (!canCall) {
      canRetryAt = resetTime.toISOString();
    }

    return {
      dailyLimit: this.DAILY_LIMIT,
      used,
      remaining,
      percentage,
      resetTime: resetTime.toISOString(),
      canCall,
      canRetryAt,
      message: this.generateQuotaMessage(used, remaining, percentage, resetTime),
    };
  }

  /**
   * 跟踪 API 调用
   */
  static async trackCall(
    type: 'document' | 'mistake' | 'batch'
  ): Promise<{ success: boolean; error?: string; retryAfter?: string }> {
    const quota = await this.getQuotaInfo();

    if (!quota.canCall) {
      return {
        success: false,
        error: `免费额度已用完（${quota.used}/${quota.dailyLimit} 次）`,
        retryAfter: quota.canRetryAt || undefined,
      };
    }

    // 更新使用情况
    const today = this.getTodayDateString();
    const usage = this.usage.get(today) || {
      date: today,
      totalCalls: 0,
      documentCalls: 0,
      mistakeCalls: 0,
      lastCallAt: new Date().toISOString(),
    };

    usage.totalCalls++;
    usage.lastCallAt = new Date().toISOString();

    if (type === 'document') {
      usage.documentCalls++;
    } else if (type === 'mistake') {
      usage.mistakeCalls++;
    }

    this.usage.set(today, usage);

    return { success: true };
  }

  /**
   * 处理 API 错误
   */
  static handleApiError(error: any): {
    isQuotaError: boolean;
    message: string;
    retryAfter?: string;
    userMessage: string;
  } {
    // 检查是否为配额错误
    const isQuotaError = this.isQuotaError(error);

    if (isQuotaError) {
      const quota = this.getQuotaInfoSync();
      
      return {
        isQuotaError: true,
        message: '免费额度已用完',
        retryAfter: quota.canRetryAt || undefined,
        userMessage: this.generateQuotaErrorMessage(quota),
      };
    }

    // 其他错误
    return {
      isQuotaError: false,
      message: error.message || '未知错误',
      userMessage: '分析失败，请稍后重试',
    };
  }

  /**
   * 生成配额提示信息
   */
  private static generateQuotaMessage(
    used: number,
    remaining: number,
    percentage: number,
    resetTime: Date
  ): string {
    const resetTimeStr = this.formatDateTime(resetTime, 'Asia/Shanghai');
    
    if (remaining <= 0) {
      return `免费额度已用完（${used}/${this.DAILY_LIMIT} 次），将在 ${resetTimeStr} 重置`;
    } else if (percentage > 90) {
      return `免费额度即将用完（剩余 ${remaining} 次），将在 ${resetTimeStr} 重置`;
    } else if (percentage > 75) {
      return `免费额度已使用 ${percentage.toFixed(1)}%（剩余 ${remaining} 次）`;
    } else {
      return `免费额度充足（剩余 ${remaining} / ${this.DAILY_LIMIT} 次）`;
    }
  }

  /**
   * 生成配额错误提示（面向用户）
   */
  private static generateQuotaErrorMessage(quota: QuotaInfo): string {
    const resetTimeStr = this.formatDateTime(new Date(quota.resetTime), 'Asia/Shanghai');
    const now = new Date();
    const resetDate = new Date(quota.resetTime);
    const hoursLeft = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    return `免费额度已用完（今日 ${quota.used}/${quota.dailyLimit} 次）\n\n` +
           `将在 ${resetTimeStr} 重置（约 ${hoursLeft} 小时后）\n\n` +
           `建议明天再试，或联系管理员升级配额`;
  }

  /**
   * 判断是否为配额错误
   */
  private static isQuotaError(error: any): boolean {
    if (!error) return false;
    
    const errorStr = JSON.stringify(error).toLowerCase();
    
    // 检查常见的配额错误关键词
    const quotaKeywords = [
      'quota',
      'limit',
      'exceeded',
      '429',
      'rate limit',
      'daily limit',
      'free tier',
    ];
    
    return quotaKeywords.some(keyword => errorStr.includes(keyword));
  }

  /**
   * 计算下次重置时间
   */
  private static calculateResetTime(): Date {
    const now = new Date();
    const utcNow = new Date(now.toUTCString());
    
    // 计算明天 00:00 UTC（北京时间 08:00）
    const resetTime = new Date(utcNow);
    resetTime.setUTCHours(0, 0, 0, 0);
    resetTime.setDate(resetTime.getDate() + 1);
    
    return resetTime;
  }

  /**
   * 获取今日日期字符串
   */
  private static getTodayDateString(): string {
    const now = new Date();
    const utcDate = new Date(now.toUTCString());
    return utcDate.toISOString().split('T')[0];
  }

  /**
   * 同步获取配额信息（用于错误处理）
   */
  private static getQuotaInfoSync(): QuotaInfo {
    const today = this.getTodayDateString();
    const usage = this.usage.get(today) || {
      date: today,
      totalCalls: 0,
      documentCalls: 0,
      mistakeCalls: 0,
      lastCallAt: new Date().toISOString(),
    };

    const used = usage.totalCalls;
    const remaining = this.DAILY_LIMIT - used;
    const percentage = (used / this.DAILY_LIMIT) * 100;
    const canCall = remaining > 0;
    const resetTime = this.calculateResetTime();

    return {
      dailyLimit: this.DAILY_LIMIT,
      used,
      remaining,
      percentage,
      resetTime: resetTime.toISOString(),
      canCall,
      canRetryAt: canCall ? null : resetTime.toISOString(),
      message: this.generateQuotaMessage(used, remaining, percentage, resetTime),
    };
  }

  /**
   * 格式化日期时间
   */
  private static formatDateTime(date: Date, timezone: string): string {
    return date.toLocaleString('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 重置配额（用于测试）
   */
  static resetQuota() {
    this.usage.clear();
  }

  /**
   * 获取使用情况（用于统计）
   */
  static getUsageHistory(): QuotaUsage[] {
    return Array.from(this.usage.values()).sort((a, b) => 
      b.date.localeCompare(a.date)
    );
  }
}
