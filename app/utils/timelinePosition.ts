interface SpanPosition {
  /** Left offset in pixels from timeline origin */
  leftOffset: number;
  /** Width of the span in pixels */
  width: number;
  /** Start index (clamped to visible range) */
  startIndex: number;
  /** End index (clamped to visible range) */
  endIndex: number;
  /** Number of days the span covers */
  spanLength: number;
}

/**
 * Calculates the pixel position and dimensions for a date span on the timeline.
 * Handles spans that extend beyond the visible date range by clamping to visible bounds.
 *
 * @param startDate - ISO date string for span start (YYYY-MM-DD or with time)
 * @param endDate - ISO date string for span end (YYYY-MM-DD or with time)
 * @param dates - Array of visible date strings
 * @param columnWidth - Width of each date column in pixels
 * @returns Position info, or null if span is completely outside visible range
 */
export function calculateSpanPosition(
  startDate: string,
  endDate: string,
  dates: string[],
  columnWidth: number
): SpanPosition | null {
  // Normalize dates to YYYY-MM-DD format (strip time portion if present)
  const normalizedStart = startDate.split('T')[0];
  const normalizedEnd = endDate.split('T')[0];

  const rawStartIndex = dates.indexOf(normalizedStart);
  const rawEndIndex = dates.indexOf(normalizedEnd);

  // Skip spans completely outside visible range
  if (rawStartIndex === -1 && rawEndIndex === -1) {
    // Check if span might wrap around the visible range
    if (normalizedEnd < dates[0] || normalizedStart > dates[dates.length - 1]) {
      return null;
    }
  }

  // Clamp to visible range
  const startIndex = rawStartIndex === -1 ? 0 : Math.max(rawStartIndex, 0);
  const endIndex = rawEndIndex === -1
    ? dates.length - 1
    : Math.min(rawEndIndex, dates.length - 1);

  const spanLength = endIndex - startIndex + 1;
  const leftOffset = startIndex * columnWidth;
  const width = spanLength * columnWidth;

  return {
    leftOffset,
    width,
    startIndex,
    endIndex,
    spanLength,
  };
}

/**
 * Calculates vertical centering offset for a bar within a row.
 *
 * @param rowHeight - Total height of the row in pixels
 * @param barHeight - Height of the bar in pixels
 * @returns Vertical offset to center the bar
 */
export function calculateVerticalCenter(rowHeight: number, barHeight: number): number {
  return (rowHeight - barHeight) / 2;
}
