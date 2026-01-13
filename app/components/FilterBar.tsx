"use client";

import { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        backgroundColor: "var(--bg-tertiary)",
        border: "var(--border-width-medium) solid var(--border-strong)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--text-primary)",
          marginRight: "var(--space-xs)",
        }}
      >
        Filters:
      </span>
      {children}
    </div>
  );
}
