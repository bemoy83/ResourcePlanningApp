import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adjustTooltipPosition, TOOLTIP_SPACING_PX } from "./tooltipUtils";
import { TooltipContent, TooltipState } from "./tooltipTypes";

export type { TooltipContent, TooltipState } from "./tooltipTypes";

interface TooltipProps {
  tooltip: TooltipState | null;
  locationLabel?: string;
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

export function Tooltip({ tooltip, locationLabel = "Location" }: TooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [renderPosition, setRenderPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useLayoutEffect(() => {
    if (!tooltip || !tooltip.visible || !mounted) return;
    setRenderPosition(tooltip.position);
  }, [tooltip, mounted]);

  useLayoutEffect(() => {
    if (!tooltip || !tooltip.visible || !mounted) return;
    if (!tooltipRef.current || !renderPosition) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const nextPosition = adjustTooltipPosition(
      renderPosition,
      { width: rect.width, height: rect.height },
      TOOLTIP_SPACING_PX
    );
    if (nextPosition.top !== renderPosition.top || nextPosition.left !== renderPosition.left) {
      setRenderPosition(nextPosition);
    }
  }, [tooltip, mounted, renderPosition]);

  if (!tooltip || !tooltip.visible || !mounted) return null;

  const tooltipContent = (
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        top: `${(renderPosition ?? tooltip.position).top}px`,
        left: `${(renderPosition ?? tooltip.position).left}px`,
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
        <strong>{locationLabel}:</strong> {tooltip.content.locationName}
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
