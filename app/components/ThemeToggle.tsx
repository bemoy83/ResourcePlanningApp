"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: "8px 12px",
        backgroundColor: "var(--surface-default)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-primary)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--interactive-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface-default)";
      }}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? (
        <>
          <span style={{ fontSize: "16px" }}>🌙</span>
          <span>Dark</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: "16px" }}>☀️</span>
          <span>Light</span>
        </>
      )}
    </button>
  );
}
