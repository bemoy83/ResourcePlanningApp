import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleTrapKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    if (!modalRef.current) return;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type=\"hidden\"])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex=\"-1\"])",
    ];
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(","))
    ).filter((el) => el.getClientRects().length > 0);

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !active) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return { modalRef, handleTrapKeyDown };
}
