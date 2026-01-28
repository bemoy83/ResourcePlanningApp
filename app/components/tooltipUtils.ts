export const TOOLTIP_DELAY_MS = 700;
export const TOOLTIP_SPACING_PX = 8;
export const DEFAULT_TOOLTIP_WIDTH = 250;
export const DEFAULT_TOOLTIP_HEIGHT = 120;

interface TooltipSize {
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
}

export function calculateTooltipPosition(
  clientX: number,
  clientY: number,
  size: TooltipSize = { width: DEFAULT_TOOLTIP_WIDTH, height: DEFAULT_TOOLTIP_HEIGHT },
  spacing: number = TOOLTIP_SPACING_PX
): TooltipPosition {
  let top = clientY;
  let left = clientX;

  if (left + size.width > window.innerWidth - spacing) {
    left = Math.max(spacing, window.innerWidth - size.width - spacing);
  }
  if (left < spacing) {
    left = spacing;
  }
  if (top + size.height > window.innerHeight - spacing) {
    top = Math.max(spacing, window.innerHeight - size.height - spacing);
  }
  if (top < spacing) {
    top = spacing;
  }

  return { top, left };
}

export function adjustTooltipPosition(
  position: TooltipPosition,
  size: TooltipSize,
  spacing: number = TOOLTIP_SPACING_PX
): TooltipPosition {
  return calculateTooltipPosition(position.left, position.top, size, spacing);
}

export function calculateDayCount(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate.split("T")[0]);
    const end = new Date(endDate.split("T")[0]);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  } catch {
    return 0;
  }
}

export function buildTooltipContent({
  eventName,
  phaseName,
  locationName,
  startDate,
  endDate,
}: {
  eventName: string;
  phaseName: string;
  locationName: string;
  startDate: string;
  endDate: string;
}) {
  return {
    eventName,
    phaseName,
    locationName,
    startDate,
    endDate,
    dayCount: calculateDayCount(startDate, endDate),
  };
}
