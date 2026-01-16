"use client";

import { ReactNode, CSSProperties, ButtonHTMLAttributes } from "react";

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
    border: "var(--border-width-medium) solid var(--border-primary)",
  },
  primary: {
    backgroundColor: "var(--button-primary-bg)",
    color: "var(--text-inverse)",
    border: "var(--border-width-medium) solid var(--button-primary-border)",
    fontWeight: "var(--font-weight-bold)",
  },
  selected: {
    backgroundColor: "var(--button-primary-bg)",
    color: "var(--text-inverse)",
    border: "var(--border-width-medium) solid var(--button-primary-border)",
    fontWeight: "var(--font-weight-bold)",
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
  const baseStyle: CSSProperties = {
    borderRadius: "var(--radius-full)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all var(--transition-fast)",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && variant === "default") {
      e.currentTarget.style.backgroundColor = "var(--interactive-hover)";
    }
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && variant === "default") {
      e.currentTarget.style.backgroundColor = "var(--surface-default)";
    }
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
