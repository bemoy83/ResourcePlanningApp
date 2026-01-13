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
 * Validation Signal
 *
 * Represents a validation message (error or warning) for import preview.
 */
export interface ValidationSignal {
  /** Type of validation signal */
  type: string;
  
  /** Severity level */
  severity: 'error' | 'warning';
  
  /** Human-readable message */
  message: string;
  
  /** Row numbers affected (zero-based) */
  rowNumbers?: number[];
  
  /** Additional context */
  context?: Record<string, unknown>;
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
  index: number;

  /** Raw values as key-value pairs from the file */
  raw: Record<string, string>;

  /** Interpreted/parsed import row (if parsing succeeded) */
  interpreted?: {
    eventName: string;
    locationName: string;
    phase: EventPhaseName | null;
    startDate: Date | null;
    endDate: Date | null;
  };

  /** Warning signals for this row */
  warnings: ValidationSignal[];

  /** Error signals for this row */
  errors: ValidationSignal[];
}

/**
 * Import Preview Summary
 *
 * Summary statistics for the import preview.
 */
export interface ImportPreviewSummary {
  /** Total number of rows processed */
  totalRows: number;
  
  /** Number of rows with errors */
  rowsWithErrors: number;
  
  /** Number of rows with warnings */
  rowsWithWarnings: number;
  
  /** Number of unique events detected */
  eventsDetected: number;
  
  /** Number of unique locations detected */
  locationsDetected: number;
}

/**
 * Import Preview Response
 *
 * Complete response from import preview endpoint.
 */
export interface ImportPreviewResponse {
  /** Preview rows with validation results */
  rows: ImportPreviewRow[];
  
  /** Summary statistics */
  summary: ImportPreviewSummary;
  
  /** Global validation signals (not tied to specific rows) */
  globalSignals: ValidationSignal[];
}

/**
 * Valid phase names array (for validation)
 */
export const PHASE_TYPES: readonly EventPhaseName[] = [
  "ASSEMBLY",
  "MOVE_IN",
  "EVENT",
  "MOVE_OUT",
  "DISMANTLE",
] as const;
