import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface TooltipContent {
  eventName: string;
  phaseName: string;
  locationName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
}

export interface TooltipState {
  visible: boolean;
  content: TooltipContent;
  position: { top: number; left: number };
}

interface TooltipProps {
  tooltip: TooltipState | null;
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export function Tooltip({ tooltip }: TooltipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!tooltip || !tooltip.visible || !mounted) return null;

  const tooltipContent = (
    <div
      style={{
        position: "fixed",
        top: `${tooltip.position.top}px`,
        left: `${tooltip.position.left}px`,
        backgroundColor: "var(--text-secondary)",
        color: "var(--text-inverse)",
        padding: "var(--space-sm) var(--space-md)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        zIndex: "var(--z-tooltip)" as any,
        boxShadow: "var(--shadow-md)",
        pointerEvents: "none",
        maxWidth: "250px",
        lineHeight: "var(--line-height-normal)",
        wordBreak: "break-word",
        overflowWrap: "break-word",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-xs)",
          borderBottom: "var(--border-width-thin) solid var(--border-strong)",
          paddingBottom: "var(--space-xs)",
        }}
      >
        {tooltip.content.eventName}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Phase:</strong> {tooltip.content.phaseName}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Location:</strong> {tooltip.content.locationName}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Duration:</strong> {tooltip.content.dayCount}{" "}
        {tooltip.content.dayCount === 1 ? "day" : "days"}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Dates:</strong> {formatDate(tooltip.content.startDate)} -{" "}
        {formatDate(tooltip.content.endDate)}
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
