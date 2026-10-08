import { useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onEndReached?: () => void;
  threshold?: number;
}

export function useInfiniteScroll({
  onEndReached,
  threshold = 1,
}: UseInfiniteScrollOptions) {
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const isCloseToBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height < threshold;
      if (isCloseToBottom && onEndReached) {
        onEndReached();
      }
    },
    [onEndReached, threshold],
  );

  return { handleScroll };
}
