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
  variant?: "chip" | "segmented";
}

export function Chip({
  children,
  selected = false,
  onClick,
  disabled = false,
  style,
  className,
  variant = "chip",
}: ChipProps) {
  // Determine the button variant based on chip variant and selected state
  const buttonVariant = variant === "segmented" 
    ? "segmented"
    : (selected ? "chip-selected" : "chip");

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={buttonVariant}
      size="sm"
      className={className}
      style={{
        // Slightly smaller padding for chips vs buttons
        // This padding will override Button's size-based padding since style prop is merged last
        padding: "var(--space-sm) var(--button-padding-x-sm)",
        fontSize: "var(--button-font-size-sm)", // Explicitly set fontSize to match size="sm"
        minHeight: "28px", // Ensure consistent height with other buttons (no matching token)
        // For segmented variant, adjust selected state styling
        ...(variant === "segmented" && selected
          ? {
              backgroundColor: "var(--btn-selected-bg)",
              color: "var(--btn-selected-text)",
            }
          : {}),
        ...style, // Allow external style overrides
      }}
    >
      {children}
    </Button>
  );
}
