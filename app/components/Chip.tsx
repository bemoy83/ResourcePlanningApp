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
      variant={selected ? "chip-selected" : "chip"}
      size="sm"
      className={className}
      style={{
        // Slightly smaller padding for chips vs buttons
        // This padding will override Button's size-based padding since style prop is merged last
        padding: "6px 14px",
        fontSize: "var(--button-font-size-sm)", // Explicitly set fontSize to match size="sm"
        ...style, // Allow external style overrides
      }}
    >
      {children}
    </Button>
  );
}
