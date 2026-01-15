import { ReactNode } from 'react';

interface DateCellsContainerProps {
  timelineOriginPx: number;
  timelineWidth: number;
  height?: string | number;
  children: ReactNode;
}

/**
 * Container for date columns positioned absolutely after sticky left columns.
 * Used by all row types to ensure consistent date column positioning.
 */
export function DateCellsContainer({
  timelineOriginPx,
  timelineWidth,
  height = '100%',
  children
}: DateCellsContainerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${timelineOriginPx}px`,
        top: 0,
        height: typeof height === 'number' ? `${height}px` : height,
        width: `${timelineWidth}px`,
      }}
    >
      {children}
    </div>
  );
}
