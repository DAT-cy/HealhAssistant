import { useCallback } from 'react';
import { debounce as debounceFn } from '@/utils/performance';

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(debounceFn(fn, delay), [fn, delay]);
}
