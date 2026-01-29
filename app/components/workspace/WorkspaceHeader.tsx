"use client";

import Link from "next/link";
import { TooltipToggle } from "../TooltipToggle";
import { ThemeToggle } from "../ThemeToggle";

interface WorkspaceHeaderProps {
  tooltipsEnabled: boolean;
  onTooltipsChange: (enabled: boolean) => void;
}

export function WorkspaceHeader({
  tooltipsEnabled,
  onTooltipsChange,
}: WorkspaceHeaderProps) {
  return (
    <div
      style={{
        marginBottom: "var(--space-xl)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            marginBottom: "var(--space-xs)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Resource Planning
        </div>
        <h1
          style={{
            margin: "0 0 var(--space-sm) 0",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          Planning Workspace
        </h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        <Link
          href="/planning/work/gantt"
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-full)",
            border: "var(--border-width-thin) solid var(--border-primary)",
            textDecoration: "none",
            color: "var(--text-primary)",
            backgroundColor: "var(--surface-default)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          Work Gantt
        </Link>
        <Link
          href="/planning/work"
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-full)",
            border: "var(--border-width-thin) solid var(--border-primary)",
            textDecoration: "none",
            color: "var(--text-primary)",
            backgroundColor: "var(--surface-default)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          Add Work
        </Link>
        <TooltipToggle enabled={tooltipsEnabled} onChange={onTooltipsChange} />
        <ThemeToggle />
      </div>
    </div>
  );
}
