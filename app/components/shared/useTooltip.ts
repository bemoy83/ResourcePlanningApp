import { useCallback, useEffect, useRef, useState } from "react";
import { TooltipContent, TooltipState } from "../tooltipTypes";

interface UseTooltipOptions {
  enabled: boolean;
  delayMs: number;
  getPosition: (clientX: number, clientY: number) => { top: number; left: number };
}

export function useTooltip({ enabled, delayMs, getPosition }: UseTooltipOptions) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearShowTimeout = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const scheduleShow = useCallback(
    (content: TooltipContent, clientX: number, clientY: number) => {
      clearShowTimeout();
      if (!enabled) {
        return;
      }

      const mouseX = clientX;
      const mouseY = clientY;

      showTimeoutRef.current = setTimeout(() => {
        setTooltip({
          visible: true,
          content,
          position: getPosition(mouseX, mouseY),
        });
      }, delayMs);
    },
    [clearShowTimeout, delayMs, enabled, getPosition]
  );

  const move = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) {
        return;
      }
      setTooltip((prevTooltip) => {
        if (!prevTooltip || !prevTooltip.visible) return prevTooltip;
        return {
          ...prevTooltip,
          position: getPosition(clientX, clientY),
        };
      });
    },
    [enabled, getPosition]
  );

  const hide = useCallback(() => {
    clearShowTimeout();
    setTooltip(null);
  }, [clearShowTimeout]);

  useEffect(() => {
    if (!enabled) {
      hide();
    }
  }, [enabled, hide]);

  useEffect(() => {
    return () => {
      clearShowTimeout();
    };
  }, [clearShowTimeout]);

  return { tooltip, scheduleShow, move, hide };
}
