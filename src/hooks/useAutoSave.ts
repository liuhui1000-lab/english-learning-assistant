import { useEffect, useRef } from 'react';

interface AutoSaveOptions {
  /**
   * 保存间隔（毫秒）
   * 默认 60000ms (1分钟)
   */
  interval?: number;
  /**
   * localStorage的key
   */
  storageKey: string;
  /**
   * 要保存的数据
   */
  data: any;
  /**
   * 是否启用自动保存
   * 默认 true
   */
  enabled?: boolean;
}

/**
 * 自动保存Hook
 * 定期将数据保存到localStorage
 */
export function useAutoSave({
  interval = 60000,
  storageKey,
  data,
  enabled = true,
}: AutoSaveOptions) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<any>(null);

  // 保存数据到localStorage
  const saveData = () => {
    if (!enabled) return;

    try {
      // 只在数据变化时保存
      const dataStr = JSON.stringify(data);
      if (dataStr === JSON.stringify(lastDataRef.current)) {
        return;
      }

      localStorage.setItem(storageKey, dataStr);
      lastDataRef.current = { ...data };
      console.log(`[自动保存] 已保存到 ${storageKey}`);
    } catch (error) {
      console.error('[自动保存] 保存失败:', error);
    }
  };

  // 立即保存
  const saveNow = () => {
    saveData();
  };

  // 加载保存的数据
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[自动保存] 加载失败:', error);
    }
    return null;
  };

  // 清除保存的数据
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      lastDataRef.current = null;
      console.log(`[自动保存] 已清除 ${storageKey}`);
    } catch (error) {
      console.error('[自动保存] 清除失败:', error);
    }
  };

  // 定期保存
  useEffect(() => {
    if (!enabled) return;

    // 立即保存一次
    saveData();

    // 定期保存
    saveTimeoutRef.current = setInterval(() => {
      saveData();
    }, interval);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
    };
  }, [data, interval, storageKey, enabled]);

  // 页面卸载时保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 卸载时也保存一次
      saveData();
    };
  }, [data]);

  return {
    saveNow,
    loadSavedData,
    clearSavedData,
  };
}

/**
 * 保存的进度数据接口
 */
export interface SavedProgress {
  // 单词背诵进度
  vocabulary?: {
    currentLearnIndex: number;
    batchIndex: number;
    wordIds: string[];
    studyPhase: 'learn' | 'test' | 'review' | 'completed';
    score: { correct: number; total: number };
  };
  // 词转练习进度
  transformation?: {
    currentGroupIndex: number;
    transformationAnswers: Record<string, string>;
    activeTab: string;
  };
  // 语法练习进度
  grammarPractice?: {
    currentIndex: number;
    selectedAnswer: string;
    selectedType: string;
    score: { correct: number; total: number };
  };
  // 保存时间
  savedAt: string;
}
