/**
 * Shared layout constants for planning workspace components.
 * These constants ensure consistent column widths and timeline configuration
 * across EventCalendar, PlanningBoardGrid, CrossEventContext, and workspace page.
 */

export interface LeftColumn {
  key: string;
  width: number;
}

/**
 * Left-side column configuration for planning grid.
 * These columns appear before the timeline and are sticky when scrolling horizontally.
 */
export const LEFT_COLUMNS: LeftColumn[] = [
  { key: "event", width: 200 },
  { key: "workCategory", width: 200 },
  { key: "estimate", width: 100 },
  { key: "allocated", width: 100 },
  { key: "remaining", width: 100 },
];

/**
 * Width of each date column in the timeline (in pixels).
 */
export const TIMELINE_DATE_COLUMN_WIDTH = 100;

/**
 * Horizontal offset where the timeline starts (in pixels).
 * This is the total width of all left columns.
 */
export const TIMELINE_ORIGIN_PX = LEFT_COLUMNS.reduce((sum, col) => sum + col.width, 0);

/**
 * Calculate offsets for sticky left columns.
 * Returns an array where each index corresponds to the left offset for that column.
 */
export function calculateLeftColumnOffsets(columns: LeftColumn[] = LEFT_COLUMNS): number[] {
  const offsets: number[] = [];
  let currentOffset = 0;
  for (const col of columns) {
    offsets.push(currentOffset);
    currentOffset += col.width;
  }
  return offsets;
}

/**
 * Calculate the total width of left columns.
 */
export function calculateLeftColumnsWidth(columns: LeftColumn[] = LEFT_COLUMNS): number {
  return columns.reduce((sum, col) => sum + col.width, 0);
}

/**
 * Generate CSS grid template columns string for left columns.
 */
export function generateLeftColumnsTemplate(columns: LeftColumn[] = LEFT_COLUMNS): string {
  return columns.map((col) => `${col.width}px`).join(" ");
}
