import { CSSProperties } from 'react';

/**
 * Base cell style for grid components.
 * Used as a foundation for date cells, header cells, and data cells.
 */
export const baseCellStyle: CSSProperties = {
  border: 'var(--border-width-thin) solid var(--border-primary)',
  padding: 'var(--space-sm)',
  textAlign: 'center',
  fontSize: 'var(--font-size-sm)',
  backgroundColor: 'var(--surface-default)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
};

/**
 * Extended cell style with flex centering for content alignment.
 */
export const centeredCellStyle: CSSProperties = {
  ...baseCellStyle,
  minHeight: 'var(--row-min-height)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

/**
 * Header cell style with minimum height.
 */
export const headerCellStyle: CSSProperties = {
  ...baseCellStyle,
  minHeight: 'var(--row-min-height)',
};
