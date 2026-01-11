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
        gap: "12px",
        padding: "12px",
        backgroundColor: "#f5f5f5",
        border: "2px solid #666",
        borderRadius: "4px",
        marginBottom: "12px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: "#000",
          marginRight: "4px",
        }}
      >
        Filters:
      </span>
      {children}
    </div>
  );
}
