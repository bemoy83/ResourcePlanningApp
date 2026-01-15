import { ReactNode, CSSProperties } from 'react';

interface StickyLeftCellProps {
  leftOffset: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/**
 * Reusable sticky left column cell.
 * Sticks to the left during horizontal scrolling.
 */
export function StickyLeftCell({
  leftOffset,
  children,
  style = {},
  className,
}: StickyLeftCellProps) {
  return (
    <div
      className={className}
      style={{
        position: 'sticky',
        left: `${leftOffset}px`,
        zIndex: 'var(--z-sticky-column)' as any,
        backgroundColor: 'var(--sticky-column-bg)',
        border: '1px solid var(--sticky-column-border)',
        color: 'var(--sticky-column-text)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
