import * as XLSX from "xlsx";
import { EventImportRow, EventPhaseName } from "@/types/event-import";

const REQUIRED_HEADERS = [
  "Locations",
  "Event name",
  "Assembly start date",
  "Assembly end date",
  "Moving in start date",
  "Moving in end date",
  "Event start date",
  "Event end date",
  "Moving out start date",
  "Moving out end date",
  "Dismantle start date",
  "Dismantle end date",
  "Status",
] as const;

const PHASE_COLUMNS: Array<{
  phase: EventPhaseName;
  startHeader: typeof REQUIRED_HEADERS[number];
  endHeader: typeof REQUIRED_HEADERS[number];
}> = [
  {
    phase: "ASSEMBLY",
    startHeader: "Assembly start date",
    endHeader: "Assembly end date",
  },
  {
    phase: "MOVE_IN",
    startHeader: "Moving in start date",
    endHeader: "Moving in end date",
  },
  {
    phase: "EVENT",
    startHeader: "Event start date",
    endHeader: "Event end date",
  },
  {
    phase: "MOVE_OUT",
    startHeader: "Moving out start date",
    endHeader: "Moving out end date",
  },
  {
    phase: "DISMANTLE",
    startHeader: "Dismantle start date",
    endHeader: "Dismantle end date",
  },
];

export class EventXlsxParseError extends Error {
  rowIndex: number;
  columnName: string;

  constructor(rowIndex: number, columnName: string, message: string) {
    super(`Row ${rowIndex} - ${columnName}: ${message}`);
    this.name = "EventXlsxParseError";
    this.rowIndex = rowIndex;
    this.columnName = columnName;
  }
}

interface SheetCandidate {
  name: string;
  rows: unknown[][];
  headerIndex: Map<string, number>;
}

export function parseEventXlsx(buffer: ArrayBuffer): EventImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const candidates: SheetCandidate[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false,
    }) as unknown[][];

    if (rows.length === 0) {
      continue;
    }

    const headerRow = rows[0] ?? [];
    const headerIndex = new Map<string, number>();

    headerRow.forEach((value, index) => {
      const normalized = normalizeHeader(value);
      if (normalized) {
        headerIndex.set(normalized, index);
      }
    });

    const hasAllHeaders = REQUIRED_HEADERS.every((header) =>
      headerIndex.has(normalizeHeader(header))
    );

    if (hasAllHeaders) {
      candidates.push({ name: sheetName, rows, headerIndex });
    }
  }

  if (candidates.length === 0) {
    throw new Error("No worksheet contains the required headers for import.");
  }

  if (candidates.length > 1) {
    const names = candidates.map((candidate) => candidate.name).join(", ");
    throw new Error(
      `Multiple worksheets contain required headers. Unable to choose between: ${names}.`
    );
  }

  const [candidate] = candidates;
  return parseSheet(candidate);
}

function parseSheet(candidate: SheetCandidate): EventImportRow[] {
  const results: EventImportRow[] = [];

  for (let sheetRowIndex = 1; sheetRowIndex < candidate.rows.length; sheetRowIndex += 1) {
    const dataRowIndex = sheetRowIndex - 1;
    const row = candidate.rows[sheetRowIndex] ?? [];

    const rowValues = REQUIRED_HEADERS.map((header) =>
      getCellValue(row, candidate.headerIndex, header)
    );

    if (rowValues.every((value) => isEmptyCell(value))) {
      continue;
    }

    const eventName = requireTextCell(
      getCellValue(row, candidate.headerIndex, "Event name"),
      dataRowIndex,
      "Event name"
    );

    const locationName = requireTextCell(
      getCellValue(row, candidate.headerIndex, "Locations"),
      dataRowIndex,
      "Locations"
    );

    for (const phase of PHASE_COLUMNS) {
      const startValue = getCellValue(row, candidate.headerIndex, phase.startHeader);
      const endValue = getCellValue(row, candidate.headerIndex, phase.endHeader);

      const startDate = parseDateCell(startValue, dataRowIndex, phase.startHeader);
      const endDate = parseDateCell(endValue, dataRowIndex, phase.endHeader);

      if (startDate && !endDate) {
        throw new EventXlsxParseError(
          dataRowIndex,
          phase.endHeader,
          "Missing end date"
        );
      }

      if (!startDate && endDate) {
        throw new EventXlsxParseError(
          dataRowIndex,
          phase.startHeader,
          "Missing start date"
        );
      }

      if (startDate && endDate) {
        results.push({
          eventName,
          locationName,
          phase: phase.phase,
          startDate,
          endDate,
        });
      }
    }
  }

  return results;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCellValue(
  row: unknown[],
  headerIndex: Map<string, number>,
  headerLabel: typeof REQUIRED_HEADERS[number]
): unknown {
  const normalized = normalizeHeader(headerLabel);
  const index = headerIndex.get(normalized);
  if (index === undefined) {
    throw new Error(`Missing required header: ${headerLabel}.`);
  }

  return row[index];
}

function isEmptyCell(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
}

function requireTextCell(value: unknown, rowIndex: number, columnName: string): string {
  if (value === null || value === undefined) {
    throw new EventXlsxParseError(rowIndex, columnName, "Missing value");
  }

  const text = String(value).trim();
  if (!text) {
    throw new EventXlsxParseError(rowIndex, columnName, "Missing value");
  }

  return text;
}

function parseDateCell(value: unknown, rowIndex: number, columnName: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    if (isEmptyCell(value)) {
      return null;
    }
    throw new EventXlsxParseError(rowIndex, columnName, "Date must be a YYYY-MM-DD string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new EventXlsxParseError(
      rowIndex,
      columnName,
      `Invalid date format: ${trimmed}`
    );
  }

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new EventXlsxParseError(rowIndex, columnName, `Invalid date value: ${trimmed}`);
  }

  return trimmed;
}
