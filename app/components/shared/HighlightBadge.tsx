import { CSSProperties, ReactNode } from 'react';

interface HighlightBadgeProps {
  children: ReactNode;
  isHighlighted?: boolean;
  style?: CSSProperties;
  className?: string;
  highlightStyle?: CSSProperties;
  idleStyle?: CSSProperties;
}

/**
 * Reusable badge that supports a highlighted state.
 * Styling can be customized via highlightStyle/idleStyle or theme CSS variables.
 */
export function HighlightBadge({
  children,
  isHighlighted = false,
  style = {},
  className,
  highlightStyle = {},
  idleStyle = {},
}: HighlightBadgeProps) {
  const baseStyle: CSSProperties = {
    padding: 'var(--space-xxs) var(--space-sm)',
    borderRadius: 'var(--radius-full)',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
    display: 'inline-block',
  };

  const stateStyle: CSSProperties = isHighlighted
    ? {
        backgroundColor: 'var(--badge-highlight-bg, var(--location-badge-highlight-bg))',
        color: 'var(--badge-highlight-text, var(--location-badge-highlight-text))',
        ...highlightStyle,
      }
    : {
        backgroundColor: 'transparent',
        color: 'inherit',
        ...idleStyle,
      };

  return (
    <span className={className} style={{ ...baseStyle, ...stateStyle, ...style }}>
      {children}
    </span>
  );
}
