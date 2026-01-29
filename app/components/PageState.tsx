"use client";

import { ReactNode } from "react";

interface PageStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  children: ReactNode;
}

function CenteredMessage({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "error";
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          padding: "var(--space-xl) var(--space-2xl)",
          backgroundColor: "var(--surface-default)",
          border: `var(--border-width-thin) solid ${
            variant === "error" ? "var(--status-error)" : "var(--border-secondary)"
          }`,
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          color: variant === "error" ? "var(--status-error)" : "var(--text-secondary)",
          fontSize: "var(--font-size-md)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PageState({
  loading,
  error,
  empty,
  emptyMessage = "No data available",
  loadingMessage = "Loading...",
  children,
}: PageStateProps) {
  if (loading) {
    return <CenteredMessage>{loadingMessage}</CenteredMessage>;
  }

  if (error) {
    return <CenteredMessage variant="error">Error: {error}</CenteredMessage>;
  }

  if (empty) {
    return <CenteredMessage>{emptyMessage}</CenteredMessage>;
  }

  return <>{children}</>;
}
