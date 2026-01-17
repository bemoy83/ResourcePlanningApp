"use client";

import { ReactNode, CSSProperties } from "react";
import { Button } from "./Button";

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
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={selected ? "selected" : "default"}
      size="sm"
      className={className}
      style={{
        // Slightly smaller padding for chips vs buttons
        padding: "6px 14px",
        ...style,
      }}
    >
      {children}
    </Button>
  );
}
