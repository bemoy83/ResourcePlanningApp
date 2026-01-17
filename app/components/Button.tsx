"use client";

import { ReactNode, CSSProperties, ButtonHTMLAttributes, useState } from "react";

type ButtonSize = "sm" | "md" | "lg";
type ButtonVariant = "default" | "primary" | "selected";

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
    boxShadow: "var(--shadow-pill)",
  },
  primary: {
    backgroundColor: "var(--button-primary-bg)",
    color: "var(--text-inverse)",
    border: "var(--border-width-thin) solid var(--button-primary-border)",
    fontWeight: "var(--font-weight-semibold)",
    boxShadow: "var(--shadow-primary-glow)",
  },
  selected: {
    backgroundColor: "var(--button-primary-bg)",
    color: "var(--text-inverse)",
    border: "var(--border-width-thin) solid var(--button-primary-border)",
    fontWeight: "var(--font-weight-semibold)",
    boxShadow: "var(--shadow-primary-glow)",
  },
};

const hoverStyles: Record<ButtonVariant, CSSProperties> = {
  default: {
    backgroundColor: "var(--surface-hover)",
    boxShadow: "var(--shadow-pill-hover)",
    transform: "translateY(-1px)",
  },
  primary: {
    backgroundColor: "var(--button-primary-hover)",
    transform: "translateY(-1px)",
  },
  selected: {
    backgroundColor: "var(--button-primary-hover)",
    transform: "translateY(-1px)",
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
  const [isPressed, setIsPressed] = useState(false);

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
    ...(isHovered && !disabled ? hoverStyles[variant] : {}),
    ...(isPressed && !disabled ? { transform: "scale(0.98)" } : {}),
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    setIsPressed(false);
    onMouseLeave?.(e);
  };

  const handleMouseDown = () => {
    if (!disabled) setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </button>
  );
}
