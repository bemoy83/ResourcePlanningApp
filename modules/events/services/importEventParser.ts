import { NextRequest } from "next/server";

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

export interface ParsedImportRow {
  rowIndex: number;
  eventName: string;
  location: string;
  spanType: string;
  startDate: string;
  endDate: string;
  start: Date;
  end: Date;
}

interface RawImportRow {
  eventName: unknown;
  location: unknown;
  spanType: unknown;
  startDate: unknown;
  endDate: unknown;
}

function normalizeHeader(value: string, isFirst: boolean): string {
  const trimmed = isFirst ? value.replace(/^\uFEFF/, "").trim() : value.trim();
  return trimmed.toLowerCase().replace(/[_\s-]+/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = text[index + 1];
        if (nextChar === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseDateOnly(value: string, rowIndex: number, fieldName: string): Date {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ImportParseError(
      `Invalid ${fieldName} format on row ${rowIndex}. Expected YYYY-MM-DD.`
    );
  }

  const [yearString, monthString, dayString] = trimmed.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ImportParseError(`Invalid ${fieldName} value on row ${rowIndex}.`);
  }

  return date;
}

function normalizeRow(row: RawImportRow, rowIndex: number): ParsedImportRow {
  if (!row || typeof row !== "object") {
    throw new ImportParseError(`Row ${rowIndex} is not a valid object.`);
  }

  const eventName = typeof row.eventName === "string" ? row.eventName.trim() : "";
  const location = typeof row.location === "string" ? row.location.trim() : "";
  const spanType = typeof row.spanType === "string" ? row.spanType.trim() : "";
  const startDate = typeof row.startDate === "string" ? row.startDate.trim() : "";
  const endDate = typeof row.endDate === "string" ? row.endDate.trim() : "";

  if (!eventName) {
    throw new ImportParseError(`Missing eventName on row ${rowIndex}.`);
  }

  if (!location) {
    throw new ImportParseError(`Missing location on row ${rowIndex}.`);
  }

  if (!spanType) {
    throw new ImportParseError(`Missing spanType on row ${rowIndex}.`);
  }

  if (!startDate) {
    throw new ImportParseError(`Missing startDate on row ${rowIndex}.`);
  }

  if (!endDate) {
    throw new ImportParseError(`Missing endDate on row ${rowIndex}.`);
  }

  const start = parseDateOnly(startDate, rowIndex, "startDate");
  const end = parseDateOnly(endDate, rowIndex, "endDate");

  if (start.getTime() > end.getTime()) {
    throw new ImportParseError(`endDate is before startDate on row ${rowIndex}.`);
  }

  return {
    rowIndex,
    eventName,
    location,
    spanType,
    startDate,
    endDate,
    start,
    end,
  };
}

export async function parseImportRequest(request: NextRequest): Promise<ParsedImportRow[]> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    let file: File | null = null;
    if (fileEntry instanceof File) {
      file = fileEntry;
    } else {
      for (const value of formData.values()) {
        if (value instanceof File) {
          file = value;
          break;
        }
      }
    }

    if (!file) {
      throw new ImportParseError("No file found in multipart form data.");
    }

    const filename = file.name.toLowerCase();
    if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      throw new ImportParseError("XLSX import is not supported in this build. Use CSV or JSON.");
    }

    const text = await file.text();
    return parseImportRowsFromCsv(text);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    throw new ImportParseError("Request body is not valid JSON.");
  }

  if (Array.isArray(payload)) {
    return parseImportRowsFromJson(payload);
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as any).rows)) {
    return parseImportRowsFromJson((payload as any).rows);
  }

  throw new ImportParseError("Request body must be an array of import rows.");
}

export function parseImportRowsFromJson(rows: RawImportRow[]): ParsedImportRow[] {
  return rows.map((row, index) => normalizeRow(row, index));
}

export function parseImportRowsFromCsv(csvText: string): ParsedImportRow[] {
  const parsed = parseCsv(csvText);

  if (parsed.length === 0) {
    throw new ImportParseError("CSV file is empty.");
  }

  const header = parsed[0];
  const headerIndex = new Map<string, number>();

  header.forEach((value, index) => {
    const normalized = normalizeHeader(value, index === 0);
    if (normalized) {
      headerIndex.set(normalized, index);
    }
  });

  const requiredHeaders = ["eventname", "location", "spantype", "startdate", "enddate"];
  for (const required of requiredHeaders) {
    if (!headerIndex.has(required)) {
      throw new ImportParseError(`CSV is missing required column: ${required}.`);
    }
  }

  const rows: ParsedImportRow[] = [];

  for (let rowIndex = 1; rowIndex < parsed.length; rowIndex += 1) {
    const rawRow = parsed[rowIndex];
    const rawEventName = rawRow[headerIndex.get("eventname")!] ?? "";
    const rawLocation = rawRow[headerIndex.get("location")!] ?? "";
    const rawSpanType = rawRow[headerIndex.get("spantype")!] ?? "";
    const rawStartDate = rawRow[headerIndex.get("startdate")!] ?? "";
    const rawEndDate = rawRow[headerIndex.get("enddate")!] ?? "";

    const isBlank =
      [rawEventName, rawLocation, rawSpanType, rawStartDate, rawEndDate]
        .map((value) => value.trim())
        .every((value) => value.length === 0);

    if (isBlank) {
      continue;
    }

    const normalizedRow = normalizeRow(
      {
        eventName: rawEventName,
        location: rawLocation,
        spanType: rawSpanType,
        startDate: rawStartDate,
        endDate: rawEndDate,
      },
      rows.length
    );

    rows.push(normalizedRow);
  }

  return rows;
}
