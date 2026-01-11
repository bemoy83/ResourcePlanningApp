/**
 * Event Import Interpreter
 *
 * Implements the Event Import Contract transformation logic
 * from EventImportRow[] to ImportPreviewRow[]
 */

import {
  EventImportRow,
  ImportPreviewRow,
  ImportPreviewResponse,
  ValidationSignal,
  ValidationSeverity,
  ValidationSignalType,
  SPAN_TYPES,
  SpanType,
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
    if (row.errors.length === 0) {
      eventNames.add(row.interpreted.eventName);
      locationNames.add(row.interpreted.location);
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
  const location = rawRow.location || '';
  const spanTypeStr = rawRow.spanType || '';
  const startDateStr = rawRow.startDate || '';
  const endDateStr = rawRow.endDate || '';

  const raw: EventImportRow = {
    eventName,
    location,
    spanType: spanTypeStr as any,
    startDate: startDateStr,
    endDate: endDateStr,
  };

  // Validate required fields
  if (!eventName) {
    errors.push({
      type: ValidationSignalType.EMPTY_REQUIRED_FIELD,
      severity: 'error',
      message: 'Event name is required',
      rowNumbers: [index],
      context: { field: 'eventName' },
    });
  }

  if (!location) {
    errors.push({
      type: ValidationSignalType.EMPTY_REQUIRED_FIELD,
      severity: 'error',
      message: 'Location is required',
      rowNumbers: [index],
      context: { field: 'location' },
    });
  }

  if (!spanTypeStr) {
    errors.push({
      type: ValidationSignalType.EMPTY_REQUIRED_FIELD,
      severity: 'error',
      message: 'Span type is required',
      rowNumbers: [index],
      context: { field: 'spanType' },
    });
  }

  if (!startDateStr) {
    errors.push({
      type: ValidationSignalType.EMPTY_REQUIRED_FIELD,
      severity: 'error',
      message: 'Start date is required',
      rowNumbers: [index],
      context: { field: 'startDate' },
    });
  }

  if (!endDateStr) {
    errors.push({
      type: ValidationSignalType.EMPTY_REQUIRED_FIELD,
      severity: 'error',
      message: 'End date is required',
      rowNumbers: [index],
      context: { field: 'endDate' },
    });
  }

  // Validate span type
  let spanType: SpanType | null = null;
  if (spanTypeStr) {
    if (SPAN_TYPES.includes(spanTypeStr as SpanType)) {
      spanType = spanTypeStr as SpanType;
    } else {
      errors.push({
        type: ValidationSignalType.UNKNOWN_SPAN_TYPE,
        severity: 'error',
        message: `Unknown span type: "${spanTypeStr}". Must be one of: ${SPAN_TYPES.join(', ')}`,
        rowNumbers: [index],
        context: { spanType: spanTypeStr, allowed: SPAN_TYPES },
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
        type: ValidationSignalType.INVALID_DATE_FORMAT,
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
        type: ValidationSignalType.INVALID_DATE_FORMAT,
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
      type: ValidationSignalType.END_BEFORE_START,
      severity: 'error',
      message: `End date (${endDateStr}) is before start date (${startDateStr})`,
      rowNumbers: [index],
      context: { startDate: startDateStr, endDate: endDateStr },
    });
  }

  return {
    index,
    raw,
    interpreted: {
      eventName,
      location,
      spanType,
      startDate,
      endDate,
    },
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
    if (row.errors.length > 0) continue; // Skip rows with errors

    const eventName = row.interpreted.eventName;
    if (!eventGroups.has(eventName)) {
      eventGroups.set(eventName, []);
    }
    eventGroups.get(eventName)!.push(row);
  }

  // Check each event group
  for (const [eventName, eventRows] of eventGroups) {
    // Check if event has at least one EVENT span
    const eventSpans = eventRows.filter(r => r.interpreted.spanType === 'EVENT');
    if (eventSpans.length === 0) {
      signals.push({
        type: ValidationSignalType.NO_EVENT_SPAN,
        severity: 'warning',
        message: `Event "${eventName}" has no EVENT span, only phases`,
        rowNumbers: eventRows.map(r => r.index),
        context: { eventName },
      });
    }

    // Check for inconsistent EVENT dates
    if (eventSpans.length > 1) {
      const dates = eventSpans.map(r => ({
        start: r.interpreted.startDate,
        end: r.interpreted.endDate,
      }));

      const allSame = dates.every(d =>
        d.start?.getTime() === dates[0].start?.getTime() &&
        d.end?.getTime() === dates[0].end?.getTime()
      );

      if (!allSame) {
        signals.push({
          type: ValidationSignalType.INCONSISTENT_EVENT_DATES,
          severity: 'warning',
          message: `Event "${eventName}" has inconsistent EVENT dates across rows`,
          rowNumbers: eventSpans.map(r => r.index),
          context: { eventName },
        });
      }
    }
  }
}
