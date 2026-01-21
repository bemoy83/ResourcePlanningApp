import { CSSProperties, ReactNode } from 'react';

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
  const badgeStyle: CSSProperties = isHighlighted
    ? {
        backgroundColor: 'var(--location-badge-highlight-bg)',
        color: 'var(--location-badge-highlight-text)',
        padding: 'var(--space-xxs) var(--space-sm)',
        borderRadius: 'var(--radius-full)',
        transition: 'background-color var(--transition-fast), color var(--transition-fast)',
        display: 'inline-block',
        ...style,
      }
    : {
        backgroundColor: 'transparent',
        color: 'inherit',
        padding: 'var(--space-xxs) var(--space-sm)',
        borderRadius: 'var(--radius-full)',
        transition: 'background-color var(--transition-fast), color var(--transition-fast)',
        display: 'inline-block',
        ...style,
      };

  return (
    <span className={className} style={badgeStyle}>
      {children}
    </span>
  );
}
