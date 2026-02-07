'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationButtonsProps {
  showBack?: boolean;
  backLabel?: string;
  showHome?: boolean;
}

export function NavigationButtons({
  showBack = true,
  backLabel = '返回上一页',
  showHome = true,
}: NavigationButtonsProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.push('/');
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      {showBack && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      )}
      {showHome && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleHome}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          返回首页
        </Button>
      )}
    </div>
  );
}
