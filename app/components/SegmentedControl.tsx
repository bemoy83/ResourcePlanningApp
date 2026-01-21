"use client";

import { ReactNode, CSSProperties, HTMLAttributes } from "react";

interface SegmentedControlProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * A segmented control container component that provides a pill-shaped
 * background with consistent spacing for grouped interactive elements.
 * 
 * Use this to wrap buttons, chips, or other controls that should appear
 * as a unified segmented control group.
 */
export function SegmentedControl({ children, className, style, ...props }: SegmentedControlProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        padding: "var(--space-xs)",
        backgroundColor: "var(--bg-tertiary)",
        borderRadius: "var(--radius-full)",
        transition: "background-color var(--transition-normal)",
        minHeight: "36px", // Ensure consistent height across all SegmentedControls (no matching token)
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
