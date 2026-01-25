import * as XLSX from "xlsx";
import { WorkCategoryImportRow } from "@/types/work-category-import";

const REQUIRED_HEADERS = [
  "Event name",
  "Phase",
  "Work category",
  "Estimated effort hours",
] as const;

export class WorkCategoryXlsxParseError extends Error {
  rowIndex: number;
  columnName: string;

  constructor(rowIndex: number, columnName: string, message: string) {
    super(`Row ${rowIndex} - ${columnName}: ${message}`);
    this.name = "WorkCategoryXlsxParseError";
    this.rowIndex = rowIndex;
    this.columnName = columnName;
  }
}

interface SheetCandidate {
  name: string;
  rows: unknown[][];
  headerIndex: Map<string, number>;
}

export function parseWorkCategoryXlsx(buffer: ArrayBuffer): WorkCategoryImportRow[] {
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

function parseSheet(candidate: SheetCandidate): WorkCategoryImportRow[] {
  const results: WorkCategoryImportRow[] = [];

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

    const phase = requireTextCell(
      getCellValue(row, candidate.headerIndex, "Phase"),
      dataRowIndex,
      "Phase"
    ).toUpperCase();

    const workCategoryName = requireTextCell(
      getCellValue(row, candidate.headerIndex, "Work category"),
      dataRowIndex,
      "Work category"
    );

    const estimatedEffortHours = requireNumberCell(
      getCellValue(row, candidate.headerIndex, "Estimated effort hours"),
      dataRowIndex,
      "Estimated effort hours"
    );

    results.push({
      eventName,
      phase,
      workCategoryName,
      estimatedEffortHours,
    });
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
  header: typeof REQUIRED_HEADERS[number]
): unknown {
  const index = headerIndex.get(normalizeHeader(header));
  if (index === undefined) {
    return "";
  }
  return row[index];
}

function isEmptyCell(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
}

function requireTextCell(value: unknown, rowIndex: number, columnName: string): string {
  if (isEmptyCell(value)) {
    throw new WorkCategoryXlsxParseError(rowIndex, columnName, "Missing value");
  }

  const text = String(value).trim();
  if (!text) {
    throw new WorkCategoryXlsxParseError(rowIndex, columnName, "Missing value");
  }

  return text;
}

function requireNumberCell(value: unknown, rowIndex: number, columnName: string): number {
  if (isEmptyCell(value)) {
    throw new WorkCategoryXlsxParseError(rowIndex, columnName, "Missing value");
  }

  const normalized =
    typeof value === "number" ? String(value) : String(value).trim().replace(",", ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new WorkCategoryXlsxParseError(rowIndex, columnName, "Must be a number");
  }

  if (parsed < 0) {
    throw new WorkCategoryXlsxParseError(rowIndex, columnName, "Must be >= 0");
  }

  return parsed;
}
