/**
 * Event Import Parser
 *
 * Pure, deterministic parser that converts CSV or JSON input into EventImportRow[].
 * No validation beyond correctness. No side effects. No inference.
 */

import { parse as papaParse } from "papaparse";
import { EventImportRow, EventPhaseName } from "../../types/event-import";

/**
 * Result of parsing an import file
 */
export interface ParsedImportResult {
  /** Successfully parsed rows */
  rows: EventImportRow[];

  /** Errors encountered during parsing (per-row) */
  errors: {
    rowIndex: number;
    message: string;
  }[];
}

/**
 * Valid phase names for validation
 */
const VALID_PHASES: Set<string> = new Set<EventPhaseName>([
  "ASSEMBLY",
  "MOVE_IN",
  "EVENT",
  "MOVE_OUT",
  "DISMANTLE",
]);

/**
 * Required columns for CSV input
 */
const REQUIRED_COLUMNS = [
  "eventName",
  "locationName",
  "phase",
  "startDate",
  "endDate",
] as const;

/**
 * Parse event import data from CSV or JSON format
 *
 * @param input - Raw file text
 * @param format - Explicitly specified format ("csv" | "json")
 * @returns ParsedImportResult with valid rows and any errors
 */
export function parseEventImport(
  input: string,
  format: "csv" | "json"
): ParsedImportResult {
  if (format === "csv") {
    return parseCSV(input);
  } else {
    return parseJSON(input);
  }
}

/**
 * Parse CSV input
 *
 * Rules:
 * - First row = header
 * - Required columns: eventName, locationName, phase, startDate, endDate
 * - Extra columns are ignored
 * - Blank rows are skipped
 * - Trim all string values
 */
function parseCSV(input: string): ParsedImportResult {
  const rows: EventImportRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  // Parse CSV with papaparse
  const parsed = papaParse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  // Check for parsing errors
  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      errors.push({
        rowIndex: error.row ?? 0,
        message: `CSV parse error: ${error.message}`,
      });
    }
  }

  // Validate and transform each row
  parsed.data.forEach((rawRow, index) => {
    const validation = validateRow(rawRow, index);

    if (validation.valid && validation.row) {
      rows.push(validation.row);
    } else if (validation.error) {
      errors.push(validation.error);
    }
  });

  return { rows, errors };
}

/**
 * Parse JSON input
 *
 * Rules:
 * - Input must be EventImportRow[]
 * - Reject anything else
 */
function parseJSON(input: string): ParsedImportResult {
  const rows: EventImportRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  let parsed: unknown;

  // Parse JSON
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    errors.push({
      rowIndex: 0,
      message: `JSON parse error: ${err instanceof Error ? err.message : "Invalid JSON"}`,
    });
    return { rows, errors };
  }

  // Must be an array
  if (!Array.isArray(parsed)) {
    errors.push({
      rowIndex: 0,
      message: "JSON input must be an array of EventImportRow objects",
    });
    return { rows, errors };
  }

  // Validate each row
  parsed.forEach((rawRow, index) => {
    const validation = validateRow(rawRow, index);

    if (validation.valid && validation.row) {
      rows.push(validation.row);
    } else if (validation.error) {
      errors.push(validation.error);
    }
  });

  return { rows, errors };
}

/**
 * Validate a single row and convert to EventImportRow
 *
 * Required field validation (parser-level only):
 * - All required fields must be present
 * - phase must match EventPhaseName
 * - startDate and endDate must be valid ISO YYYY-MM-DD and parseable by Date
 */
function validateRow(
  rawRow: unknown,
  rowIndex: number
): {
  valid: boolean;
  row?: EventImportRow;
  error?: { rowIndex: number; message: string };
} {
  // Must be an object
  if (typeof rawRow !== "object" || rawRow === null) {
    return {
      valid: false,
      error: {
        rowIndex,
        message: "Row must be an object",
      },
    };
  }

  const row = rawRow as Record<string, unknown>;

  // Check required fields are present
  for (const field of REQUIRED_COLUMNS) {
    if (!(field in row) || row[field] === undefined || row[field] === null) {
      return {
        valid: false,
        error: {
          rowIndex,
          message: `Missing required field: ${field}`,
        },
      };
    }
  }

  // Extract and validate field values
  const eventName = String(row.eventName).trim();
  const locationName = String(row.locationName).trim();
  const phase = String(row.phase).trim();
  const startDate = String(row.startDate).trim();
  const endDate = String(row.endDate).trim();

  // Check for empty strings
  if (eventName === "") {
    return {
      valid: false,
      error: { rowIndex, message: "eventName cannot be empty" },
    };
  }

  if (locationName === "") {
    return {
      valid: false,
      error: { rowIndex, message: "locationName cannot be empty" },
    };
  }

  // Validate phase
  if (!VALID_PHASES.has(phase)) {
    return {
      valid: false,
      error: {
        rowIndex,
        message: `Invalid phase: "${phase}". Must be one of: ASSEMBLY, MOVE_IN, EVENT, MOVE_OUT, DISMANTLE`,
      },
    };
  }

  // Validate date format (YYYY-MM-DD) and parseability
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateFormatRegex.test(startDate)) {
    return {
      valid: false,
      error: {
        rowIndex,
        message: `Invalid startDate format: "${startDate}". Must be YYYY-MM-DD`,
      },
    };
  }

  if (!dateFormatRegex.test(endDate)) {
    return {
      valid: false,
      error: {
        rowIndex,
        message: `Invalid endDate format: "${endDate}". Must be YYYY-MM-DD`,
      },
    };
  }

  // Check if dates are parseable
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    return {
      valid: false,
      error: {
        rowIndex,
        message: `startDate is not a valid date: "${startDate}"`,
      },
    };
  }

  if (isNaN(endDateObj.getTime())) {
    return {
      valid: false,
      error: {
        rowIndex,
        message: `endDate is not a valid date: "${endDate}"`,
      },
    };
  }

  // All validations passed
  return {
    valid: true,
    row: {
      eventName,
      locationName,
      phase: phase as EventPhaseName,
      startDate,
      endDate,
    },
  };
}
