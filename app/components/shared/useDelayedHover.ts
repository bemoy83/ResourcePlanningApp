import { useCallback, useEffect, useRef } from 'react';

interface UseDelayedHoverOptions<T> {
  delayMs: number;
  onHover: (value: T | null) => void;
}

export function useDelayedHover<T>({ delayMs, onHover }: UseDelayedHoverOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelHover = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleHover = useCallback((value: T | null) => {
    cancelHover();
    timeoutRef.current = setTimeout(() => {
      onHover(value);
    }, delayMs);
  }, [cancelHover, delayMs, onHover]);

  const clearHover = useCallback(() => {
    cancelHover();
    onHover(null);
  }, [cancelHover, onHover]);

  useEffect(() => {
    return () => {
      cancelHover();
    };
  }, [cancelHover]);

  return { scheduleHover, clearHover, cancelHover };
}
