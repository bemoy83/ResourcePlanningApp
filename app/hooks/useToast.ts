"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseToastOptions {
  /** Auto-dismiss duration in milliseconds. Defaults to 2500ms. */
  duration?: number;
}

interface UseToastReturn {
  /** Current toast message, or null if no toast is showing. */
  message: string | null;
  /** Display a toast message. Replaces any existing toast. */
  showToast: (message: string) => void;
  /** Manually dismiss the current toast. */
  hideToast: () => void;
}

/**
 * Hook for managing toast notifications with auto-dismiss.
 * Handles timeout cleanup and prevents stacking of multiple toasts.
 */
export function useToast({ duration = 2500 }: UseToastOptions = {}): UseToastReturn {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const hideToast = useCallback(() => {
    setMessage(null);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (msg: string) => {
      setMessage(msg);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setMessage(null);
        timeoutRef.current = null;
      }, duration);
    },
    [duration]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, showToast, hideToast };
}
