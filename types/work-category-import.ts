/**
 * Work Category Import Contract Types
 *
 * Defines the canonical schema for importing work categories from XLSX.
 */

/**
 * Work Category Import Row Contract
 *
 * Required fields:
 * - eventName: event display name
 * - phase: phase name (stored on WorkCategory)
 * - workCategoryName: work category label
 * - estimatedEffortHours: number (>= 0)
 */
export interface WorkCategoryImportRow {
  eventName: string;
  phase: string;
  workCategoryName: string;
  estimatedEffortHours: number;
}
