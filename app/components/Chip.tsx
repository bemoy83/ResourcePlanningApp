"use client";

import { ReactNode, CSSProperties } from "react";

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Chip({
  children,
  selected = false,
  onClick,
  disabled = false,
  style,
  className,
}: ChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        padding: "6px var(--space-md)",
        fontSize: "var(--font-size-sm)",
        fontWeight: selected ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
        color: selected ? "var(--text-inverse)" : "var(--text-primary)",
        backgroundColor: selected ? "var(--button-primary-bg)" : "var(--surface-default)",
        border: selected
          ? "var(--border-width-medium) solid var(--button-primary-border)"
          : "var(--border-width-medium) solid var(--border-primary)",
        borderRadius: "var(--radius-full)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all var(--transition-fast)",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.backgroundColor = "var(--interactive-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.backgroundColor = "var(--surface-default)";
        }
      }}
    >
      {children}
    </button>
  );
}
