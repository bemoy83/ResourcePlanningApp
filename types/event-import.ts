/**
 * Event Import Contract Types
 *
 * Defines the canonical schema for importing events declaratively.
 * Phase 0 + Phase 1: Structure only, no logic.
 */

/**
 * Event Phase Names
 *
 * Explicit enum of allowed phase types for import.
 */
export type EventPhaseName =
  | "ASSEMBLY"
  | "MOVE_IN"
  | "EVENT"
  | "MOVE_OUT"
  | "DISMANTLE";

/**
 * Event Import Row Contract
 *
 * Canonical shape for one declarative span from an import file.
 *
 * Rules:
 * - One row = one contiguous span
 * - Rows are declarative, not ordered
 * - No inference or auto-generation
 * - Dates are inclusive (YYYY-MM-DD format)
 * - startDate and endDate define the full span of the phase/event
 */
export interface EventImportRow {
  /** Name of the event (grouping key) */
  eventName: string;

  /** Name of the location where this span occurs */
  locationName: string;

  /** Phase type for this span */
  phase: EventPhaseName;

  /** Start date in YYYY-MM-DD format (inclusive) */
  startDate: string;

  /** End date in YYYY-MM-DD format (inclusive) */
  endDate: string;
}

/**
 * Import Preview Row
 *
 * Represents one row from the import file with interpretation results.
 * Used for read-only preview of parsed data before import.
 *
 * This is a preview-only type - no validation logic attached.
 */
export interface ImportPreviewRow {
  /** Zero-based row index from the import file */
  rowIndex: number;

  /** Raw values as key-value pairs from the file */
  raw: Record<string, string>;

  /** Interpreted/parsed import row (if parsing succeeded) */
  interpreted?: EventImportRow;

  /** Warning messages for this row */
  warnings: string[];

  /** Error messages for this row */
  errors: string[];
}
