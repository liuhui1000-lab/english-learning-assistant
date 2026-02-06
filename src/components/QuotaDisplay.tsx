'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Clock,
  XCircle 
} from 'lucide-react';

interface QuotaInfo {
  dailyLimit: number;
  used: number;
  remaining: number;
  percentage: number;
  resetTime: string;
  canCall: boolean;
  retryAfter?: string;
}

interface QuotaDisplayProps {
  show?: boolean;
}

export function QuotaDisplay({ show = true }: QuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuota = async () => {
    try {
      const response = await fetch('/api/admin/quota');
      const data = await response.json();
      
      if (data.success) {
        setQuota(data.data);
      }
    } catch (error) {
      console.error('加载配额信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadQuota();
      // 每 30 秒刷新一次
      const interval = setInterval(loadQuota, 30000);
      return () => clearInterval(interval);
    }
  }, [show]);

  if (!show || loading) return null;

  if (!quota) return null;

  // 配额状态
  const isLow = quota.percentage > 75 && quota.percentage < 90;
  const isCritical = quota.percentage >= 90;

  return (
    <Card className={isCritical ? 'border-red-500' : isLow ? 'border-yellow-500' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isCritical ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : isLow ? (
            <Info className="w-5 h-5 text-yellow-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
          Gemini API 配额使用
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 进度条 */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              今日使用
            </span>
            <span className="text-sm font-bold">
              {quota.used} / {quota.dailyLimit} 次
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                isCritical 
                  ? 'bg-red-500' 
                  : isLow 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
              }`}
              style={{ width: `${quota.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              剩余：{quota.remaining} 次
            </span>
            <span className="text-xs font-semibold">
              {quota.percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 提示信息 */}
        <Alert 
          variant={isCritical ? 'destructive' : isLow ? 'default' : 'default'}
          className={
            isLow ? 'bg-yellow-50 border-yellow-200' : 
            !isCritical ? 'bg-green-50 border-green-200' : ''
          }
        >
          <Clock className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {isCritical ? '配额即将用完' : isLow ? '配额使用较高' : '配额充足'}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {isCritical 
              ? `将在 ${formatResetTime(quota.resetTime)} 重置，约 ${getHoursUntilReset(quota.resetTime)} 小时后`
              : isLow
              ? `剩余 ${quota.remaining} 次，将在 ${formatResetTime(quota.resetTime)} 重置`
              : `剩余 ${quota.remaining} 次，可以在 ${formatResetTime(quota.resetTime)} 重置`
            }
          </AlertDescription>
        </Alert>

        {/* 刷新按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={loadQuota}
          className="w-full"
        >
          刷新配额信息
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 配额错误提示组件
 */
interface QuotaErrorAlertProps {
  error: {
    code: string;
    message: string;
    isQuotaError: boolean;
    retryAfter?: string;
    userMessage: string;
  };
  onRetry?: () => void;
}

export function QuotaErrorAlert({ error, onRetry }: QuotaErrorAlertProps) {
  if (!error.isQuotaError) {
    return null;
  }

  const hoursUntilReset = error.retryAfter 
    ? getHoursUntilReset(error.retryAfter) 
    : 0;

  return (
    <Alert variant="destructive" className="mb-4">
      <XCircle className="h-4 w-4" />
      <AlertTitle className="font-semibold">
        免费额度已用完
      </AlertTitle>
      <AlertDescription className="mt-2 whitespace-pre-line">
        {error.userMessage}
      </AlertDescription>
      
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={hoursUntilReset > 0}
          >
            {hoursUntilReset > 0 
              ? `${hoursUntilReset} 小时后可重试`
              : '立即重试'
            }
          </Button>
        </div>
      )}
    </Alert>
  );
}

/**
 * 通用错误提示组件
 */
interface ErrorAlertProps {
  error: {
    code?: string;
    message: string;
    isQuotaError?: boolean;
    userMessage?: string;
  };
  title?: string;
}

export function ErrorAlert({ error, title = '操作失败' }: ErrorAlertProps) {
  // 如果是配额错误，使用专门的组件
  if (error.isQuotaError) {
    return <QuotaErrorAlert error={error as any} />;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {error.userMessage || error.message}
      </AlertDescription>
    </Alert>
  );
}

/**
 * 格式化重置时间
 */
function formatResetTime(resetTime: string): string {
  const date = new Date(resetTime);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 计算距离重置还有多少小时
 */
function getHoursUntilReset(resetTime: string): number {
  const resetDate = new Date(resetTime);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}
