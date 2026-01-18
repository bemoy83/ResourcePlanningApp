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
 * 
 * Total width must remain constant (currently 700px) to keep TIMELINE_ORIGIN_PX consistent.
 * Adjust individual widths as needed, but ensure the sum stays the same.
 */
export const LEFT_COLUMNS: LeftColumn[] = [
  { key: "event", width: 220 },
  { key: "workCategory", width: 120 },
  { key: "estimate", width: 120 },
  { key: "allocated", width: 120 },
  { key: "remaining", width: 120 },
];

/**
 * Left-side column configuration for CrossEventContext.
 * Single 700px column for labels - simpler since first 4 columns are empty.
 * Total width must match LEFT_COLUMNS (700px) to keep date columns aligned.
 */
export const CROSS_EVENT_LEFT_COLUMNS: LeftColumn[] = [
  { key: "label", width: 700 }, // Single column for "Total Demand" and "Total Capacity" labels
];

/**
 * Width of each date column in the timeline (in pixels).
 */
export const TIMELINE_DATE_COLUMN_WIDTH = 100;

/**
 * Calendar header row heights (in pixels).
 */
export const CALENDAR_MONTH_HEADER_HEIGHT = 28;
export const CALENDAR_WEEK_HEADER_HEIGHT = 24;
export const CALENDAR_DATE_ROW_HEIGHT = 46; // Matches --row-min-height CSS variable

/**
 * Total height of the calendar header section.
 */
export const CALENDAR_HEADER_HEIGHT =
  CALENDAR_MONTH_HEADER_HEIGHT + CALENDAR_WEEK_HEADER_HEIGHT + CALENDAR_DATE_ROW_HEIGHT;

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
