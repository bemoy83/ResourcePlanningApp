/**
 * Event Import Interpreter
 *
 * Implements the Event Import Contract transformation logic
 * from raw CSV/JSON rows to ImportPreviewRow[]
 */

import {
  EventPhaseName,
  ImportPreviewRow,
  ImportPreviewResponse,
  ValidationSignal,
  PHASE_TYPES,
} from '../types/event-import';

/**
 * Interpret import rows and generate preview
 */
export function interpretImportRows(rawRows: Record<string, string>[]): ImportPreviewResponse {
  const previewRows: ImportPreviewRow[] = [];
  const globalSignals: ValidationSignal[] = [];

  // Parse and validate each row
  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const previewRow = interpretRow(i, rawRow);
    previewRows.push(previewRow);
  }

  // Detect events and locations
  const eventNames = new Set<string>();
  const locationNames = new Set<string>();

  for (const row of previewRows) {
    if (row.errors.length === 0 && row.interpreted) {
      eventNames.add(row.interpreted.eventName);
      locationNames.add(row.interpreted.locationName);
    }
  }

  // Count rows with issues
  const rowsWithErrors = previewRows.filter(r => r.errors.length > 0).length;
  const rowsWithWarnings = previewRows.filter(r => r.warnings.length > 0).length;

  // Generate global validation signals
  generateGlobalSignals(previewRows, globalSignals);

  return {
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      rowsWithErrors,
      rowsWithWarnings,
      eventsDetected: eventNames.size,
      locationsDetected: locationNames.size,
    },
    globalSignals,
  };
}

/**
 * Interpret a single row
 */
function interpretRow(index: number, rawRow: Record<string, string>): ImportPreviewRow {
  const errors: ValidationSignal[] = [];
  const warnings: ValidationSignal[] = [];

  // Extract raw values
  const eventName = rawRow.eventName || '';
  const locationName = rawRow.locationName || '';
  const phaseStr = rawRow.phase || '';
  const startDateStr = rawRow.startDate || '';
  const endDateStr = rawRow.endDate || '';

  // Validate required fields
  if (!eventName) {
    errors.push({
      type: 'EMPTY_REQUIRED_FIELD',
      severity: 'error',
      message: 'Event name is required',
      rowNumbers: [index],
      context: { field: 'eventName' },
    });
  }

  if (!locationName) {
    errors.push({
      type: 'EMPTY_REQUIRED_FIELD',
      severity: 'error',
      message: 'Location is required',
      rowNumbers: [index],
      context: { field: 'locationName' },
    });
  }

  if (!phaseStr) {
    errors.push({
      type: 'EMPTY_REQUIRED_FIELD',
      severity: 'error',
      message: 'Phase is required',
      rowNumbers: [index],
      context: { field: 'phase' },
    });
  }

  if (!startDateStr) {
    errors.push({
      type: 'EMPTY_REQUIRED_FIELD',
      severity: 'error',
      message: 'Start date is required',
      rowNumbers: [index],
      context: { field: 'startDate' },
    });
  }

  if (!endDateStr) {
    errors.push({
      type: 'EMPTY_REQUIRED_FIELD',
      severity: 'error',
      message: 'End date is required',
      rowNumbers: [index],
      context: { field: 'endDate' },
    });
  }

  // Validate phase
  let phase: EventPhaseName | null = null;
  if (phaseStr) {
    if (PHASE_TYPES.includes(phaseStr as EventPhaseName)) {
      phase = phaseStr as EventPhaseName;
    } else {
      errors.push({
        type: 'UNKNOWN_PHASE',
        severity: 'error',
        message: `Unknown phase: "${phaseStr}". Must be one of: ${PHASE_TYPES.join(', ')}`,
        rowNumbers: [index],
        context: { phase: phaseStr, allowed: PHASE_TYPES },
      });
    }
  }

  // Validate and parse dates
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (startDateStr) {
    const parsed = parseDate(startDateStr);
    if (parsed) {
      startDate = parsed;
    } else {
      errors.push({
        type: 'INVALID_DATE_FORMAT',
        severity: 'error',
        message: `Invalid start date format: "${startDateStr}". Expected YYYY-MM-DD`,
        rowNumbers: [index],
        context: { date: startDateStr, field: 'startDate' },
      });
    }
  }

  if (endDateStr) {
    const parsed = parseDate(endDateStr);
    if (parsed) {
      endDate = parsed;
    } else {
      errors.push({
        type: 'INVALID_DATE_FORMAT',
        severity: 'error',
        message: `Invalid end date format: "${endDateStr}". Expected YYYY-MM-DD`,
        rowNumbers: [index],
        context: { date: endDateStr, field: 'endDate' },
      });
    }
  }

  // Validate date range
  if (startDate && endDate && endDate < startDate) {
    errors.push({
      type: 'END_BEFORE_START',
      severity: 'error',
      message: `End date (${endDateStr}) is before start date (${startDateStr})`,
      rowNumbers: [index],
      context: { startDate: startDateStr, endDate: endDateStr },
    });
  }

  return {
    index,
    raw: rawRow,
    interpreted: errors.length === 0 ? {
      eventName,
      locationName,
      phase,
      startDate,
      endDate,
    } : undefined,
    errors,
    warnings,
  };
}

/**
 * Parse YYYY-MM-DD date string
 */
function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Basic validation
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));

  // Check if date is valid (handles invalid dates like Feb 31)
  if (date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Generate global validation signals
 */
function generateGlobalSignals(rows: ImportPreviewRow[], signals: ValidationSignal[]): void {
  // Group rows by event name
  const eventGroups = new Map<string, ImportPreviewRow[]>();

  for (const row of rows) {
    if (row.errors.length > 0 || !row.interpreted) continue; // Skip rows with errors

    const eventName = row.interpreted.eventName;
    if (!eventGroups.has(eventName)) {
      eventGroups.set(eventName, []);
    }
    eventGroups.get(eventName)!.push(row);
  }

  // Check each event group
  for (const [eventName, eventRows] of eventGroups) {
    // Check if event has at least one EVENT phase
    const eventPhases = eventRows.filter(r => r.interpreted?.phase === 'EVENT');
    if (eventPhases.length === 0) {
      signals.push({
        type: 'NO_EVENT_PHASE',
        severity: 'warning',
        message: `Event "${eventName}" has no EVENT phase, only other phases`,
        rowNumbers: eventRows.map(r => r.index),
        context: { eventName },
      });
    }

    // Check for inconsistent EVENT dates
    if (eventPhases.length > 1) {
      const dates = eventPhases.map(r => ({
        start: r.interpreted!.startDate,
        end: r.interpreted!.endDate,
      }));

      const allSame = dates.every(d =>
        d.start?.getTime() === dates[0].start?.getTime() &&
        d.end?.getTime() === dates[0].end?.getTime()
      );

      if (!allSame) {
        signals.push({
          type: 'INCONSISTENT_EVENT_DATES',
          severity: 'warning',
          message: `Event "${eventName}" has inconsistent EVENT dates across rows`,
          rowNumbers: eventPhases.map(r => r.index),
          context: { eventName },
        });
      }
    }
  }
}
