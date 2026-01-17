"use client";

import { ReactNode, CSSProperties, ButtonHTMLAttributes, useState } from "react";

type ButtonSize = "sm" | "md" | "lg";
type ButtonVariant = "default" | "primary" | "selected" | "chip-selected" | "chip" | "segmented";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  style?: CSSProperties;
  className?: string;
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: "var(--button-padding-y-sm) var(--button-padding-x-sm)",
    fontSize: "var(--button-font-size-sm)",
  },
  md: {
    padding: "var(--button-padding-y-md) var(--button-padding-x-md)",
    fontSize: "var(--button-font-size-md)",
  },
  lg: {
    padding: "var(--button-padding-y-lg) var(--button-padding-x-lg)",
    fontSize: "var(--button-font-size-lg)",
  },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  default: {
    backgroundColor: "var(--surface-default)",
    color: "var(--text-primary)",
    border: "var(--border-width-thin) solid var(--border-primary)",
  },
  primary: {
    backgroundColor: "var(--button-primary-bg)",
    color: "var(--text-inverse)",
    border: "var(--border-width-thin) solid var(--button-primary-border)",
    fontWeight: "var(--font-weight-semibold)",
  },
  selected: {
    backgroundColor: "var(--button-primary-bg)",
    color: "var(--text-inverse)",
    border: "var(--border-width-thin) solid var(--button-primary-border)",
    fontWeight: "var(--font-weight-semibold)",
  },
  "chip-selected": {
    backgroundColor: "var(--chip-selected-bg)",
    color: "var(--chip-selected-text)",
    border: "var(--border-width-thin) solid var(--chip-selected-border)",
    fontWeight: "var(--font-weight-semibold)",
  },
  chip: {
    backgroundColor: "var(--surface-default)",
    color: "var(--sticky-corner-text)",
    border: "var(--border-width-thin) solid var(--border-primary)",
  },
  segmented: {
    backgroundColor: "var(--surface-default)",
    color: "var(--text-primary)",
    border: "none",
    boxShadow: "var(--shadow-pill)",
  },
};

const hoverStyles: Record<ButtonVariant, CSSProperties> = {
  default: {
    backgroundColor: "var(--surface-hover)",
    borderColor: "var(--border-strong)",
  },
  primary: {
    backgroundColor: "var(--button-primary-hover)",
  },
  selected: {
    backgroundColor: "var(--button-primary-hover)",
  },
  "chip-selected": {
    backgroundColor: "var(--chip-selected-hover-bg)",
  },
  chip: {
    backgroundColor: "var(--surface-hover)",
    // Don't change borderColor on hover for chips - maintain subtle appearance
  },
  segmented: {
    backgroundColor: "var(--surface-hover)",
    boxShadow: "var(--shadow-pill-hover)",
  },
};

export function Button({
  children,
  size = "md",
  variant = "default",
  disabled = false,
  style,
  className,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle: CSSProperties = {
    borderRadius: "var(--radius-full)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all var(--transition-fast)",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-xs)",
    fontWeight: "var(--font-weight-medium)",
    letterSpacing: "var(--letter-spacing-tight)",
    ...sizeStyles[size],
    ...variantStyles[variant],
    // For segmented variant, handle disabled state differently
    ...(variant === "segmented" && disabled
      ? {
          backgroundColor: "transparent",
          color: "var(--text-tertiary)",
          boxShadow: "none",
          opacity: 1, // Override default disabled opacity to maintain visual clarity
        }
      : {}),
    ...(isHovered && !disabled ? hoverStyles[variant] : {}),
    // style prop is merged last, so it will override any conflicting properties above
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    onMouseLeave?.(e);
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}
