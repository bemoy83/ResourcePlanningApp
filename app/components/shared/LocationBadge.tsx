import { CSSProperties, ReactNode } from 'react';
import { HighlightBadge } from './HighlightBadge';

interface LocationBadgeProps {
  children: ReactNode;
  isHighlighted?: boolean;
  style?: CSSProperties;
  className?: string;
}

/**
 * A pill-shaped badge component for displaying location names.
 * Supports a highlighted state for visual emphasis (e.g., when hovering related events).
 *
 * Reusable across any page that needs to display location names with optional highlighting.
 */
export function LocationBadge({
  children,
  isHighlighted = false,
  style = {},
  className,
}: LocationBadgeProps) {
  return (
    <HighlightBadge
      isHighlighted={isHighlighted}
      style={style}
      className={className}
      highlightStyle={{
        backgroundColor: 'var(--location-badge-highlight-bg)',
        color: 'var(--location-badge-highlight-text)',
      }}
    >
      {children}
    </HighlightBadge>
  );
}
