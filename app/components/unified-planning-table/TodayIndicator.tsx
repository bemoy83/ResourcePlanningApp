import { memo } from 'react';

interface TodayIndicatorProps {
  todayIndex: number;
  dateColumnWidth: number;
  timelineOriginPx: number;
  topOffset?: number;
}

/**
 * Renders a vertical line indicator for today's date.
 * Positioned absolutely within the scroll container, starting from topOffset.
 */
export const TodayIndicator = memo(function TodayIndicator({
  todayIndex,
  dateColumnWidth,
  timelineOriginPx,
  topOffset = 0,
}: TodayIndicatorProps) {
  if (todayIndex < 0) {
    return null;
  }

  // Position the line at the center of today's column
  const leftPosition = timelineOriginPx + todayIndex * dateColumnWidth + dateColumnWidth / 2;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${topOffset}px`,
        left: `${leftPosition}px`,
        width: 'var(--today-line-width)',
        height: topOffset > 0 ? `calc(100% - ${topOffset}px)` : '100%',
        backgroundColor: 'var(--today-line)',
        zIndex: 'var(--z-today-indicator)' as any,
        pointerEvents: 'none',
        transform: 'translateX(-50%)',
      }}
    />
  );
});
