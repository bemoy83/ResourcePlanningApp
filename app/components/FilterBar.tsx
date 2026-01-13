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
        flexWrap: "wrap",
        marginBottom: "var(--space-md)",
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
