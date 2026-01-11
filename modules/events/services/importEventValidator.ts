import { PHASE_TYPES } from "@/types/event-import";
import { ParsedImportRow } from "./importEventParser";

export interface ImportWarning {
  rowIndex: number;
  message: string;
}

function dateOverlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function validateImportRows(rows: ParsedImportRow[]): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  const duplicateKeys = new Map<string, number>();
  const groupedByEvent = new Map<string, ParsedImportRow[]>();
  const groupedByLocation = new Map<string, ParsedImportRow[]>();

  rows.forEach((row) => {
    const duplicateKey = [
      row.eventName,
      row.location,
      row.spanType,
      row.startDate,
      row.endDate,
    ].join("|");

    if (duplicateKeys.has(duplicateKey)) {
      warnings.push({
        rowIndex: row.rowIndex,
        message: "Duplicate row detected.",
      });
    } else {
      duplicateKeys.set(duplicateKey, row.rowIndex);
    }

    if (row.spanType !== "EVENT" && !PHASE_TYPES.includes(row.spanType as any)) {
      warnings.push({
        rowIndex: row.rowIndex,
        message: `Unknown phase name: ${row.spanType}.`,
      });
    }

    const eventRows = groupedByEvent.get(row.eventName);
    if (eventRows) {
      eventRows.push(row);
    } else {
      groupedByEvent.set(row.eventName, [row]);
    }

    const locationKey = row.location.toLowerCase();
    const locationRows = groupedByLocation.get(locationKey);
    if (locationRows) {
      locationRows.push(row);
    } else {
      groupedByLocation.set(locationKey, [row]);
    }
  });

  for (const [eventName, eventRows] of groupedByEvent.entries()) {
    const eventSpanRows = eventRows.filter((row) => row.spanType === "EVENT");

    if (eventSpanRows.length === 0) {
      const firstRow = eventRows.reduce((minRow, row) =>
        row.rowIndex < minRow.rowIndex ? row : minRow
      );
      warnings.push({
        rowIndex: firstRow.rowIndex,
        message: `EVENT span missing for event: ${eventName}.`,
      });
      continue;
    }

    const eventStart = Math.min(...eventSpanRows.map((row) => row.start.getTime()));
    const eventEnd = Math.max(...eventSpanRows.map((row) => row.end.getTime()));

    for (const row of eventRows) {
      if (row.spanType === "EVENT") {
        continue;
      }

      const rowStart = row.start.getTime();
      const rowEnd = row.end.getTime();
      if (rowStart < eventStart || rowEnd > eventEnd) {
        warnings.push({
          rowIndex: row.rowIndex,
          message: `Phase outside EVENT range for event: ${eventName}.`,
        });
      }
    }
  }

  for (const locationRows of groupedByLocation.values()) {
    const ordered = [...locationRows].sort((a, b) => a.rowIndex - b.rowIndex);
    const warned = new Set<number>();

    for (let i = 0; i < ordered.length; i += 1) {
      const current = ordered[i];
      const currentStart = current.start.getTime();
      const currentEnd = current.end.getTime();

      for (let j = i + 1; j < ordered.length; j += 1) {
        const candidate = ordered[j];
        if (warned.has(candidate.rowIndex)) {
          continue;
        }

        const candidateStart = candidate.start.getTime();
        const candidateEnd = candidate.end.getTime();
        if (dateOverlaps(currentStart, currentEnd, candidateStart, candidateEnd)) {
          warnings.push({
            rowIndex: candidate.rowIndex,
            message: `Overlapping span in location: ${candidate.location}.`,
          });
          warned.add(candidate.rowIndex);
          break;
        }
      }
    }
  }

  return warnings;
}
