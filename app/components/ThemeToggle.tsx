"use client";

import { useTheme } from "./ThemeProvider";
import { Button } from "./Button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="default"
      size="sm"
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
    </Button>
  );
}
