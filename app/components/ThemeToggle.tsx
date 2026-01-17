"use client";

import { useTheme } from "./ThemeProvider";
import { Button } from "./Button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="chip"
      size="sm"
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      style={{
        padding: "6px 14px",
        fontSize: "var(--button-font-size-sm)",
      }}
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
    </Button>
  );
}
