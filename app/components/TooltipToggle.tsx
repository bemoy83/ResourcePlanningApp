"use client";

import { useState, useEffect } from "react";

interface TooltipToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function TooltipToggle({ enabled, onChange }: TooltipToggleProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        fontSize: "12px",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          cursor: "pointer",
          width: "16px",
          height: "16px",
        }}
      />
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--text-tertiary)",
        }}
      >
        Show Tooltips
      </span>
    </label>
  );
}

// Hook to manage tooltip preference with localStorage persistence
export function useTooltipPreference() {
  const [tooltipsEnabled, setTooltipsEnabled] = useState<boolean>(() => {
    // Default to true, but check localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("eventCalendarTooltipsEnabled");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  useEffect(() => {
    // Save to localStorage whenever it changes
    localStorage.setItem("eventCalendarTooltipsEnabled", String(tooltipsEnabled));
  }, [tooltipsEnabled]);

  return [tooltipsEnabled, setTooltipsEnabled] as const;
}
