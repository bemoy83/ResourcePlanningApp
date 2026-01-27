"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import {
  parseWorkCategoryXlsx,
  WorkCategoryXlsxParseError,
} from "@/lib/import/parseWorkCategoryXlsx";
import { WorkCategoryImportRow } from "@/types/work-category-import";

interface ParsedImportResult {
  rows: WorkCategoryImportRow[];
  errors: { rowIndex: number; message: string }[];
}

interface ImportResult {
  workCategoriesCreated: number;
  workCategoriesUpdated: number;
  eventsMatched: number;
}

const IMPORT_BATCH_SIZE = 200;

export default function WorkCategoryImportPage() {
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const handleXlsxUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx")) {
      setParsedResult({
        rows: [],
        errors: [{ rowIndex: 0, message: "Only .xlsx files are supported for upload." }],
      });
      event.target.value = "";
      return;
    }

    setImportResult(null);
    setImportError(null);

    try {
      const buffer = await file.arrayBuffer();
      const rows = parseWorkCategoryXlsx(buffer);
      setParsedResult({ rows, errors: [] });
    } catch (error) {
      if (error instanceof WorkCategoryXlsxParseError) {
        setParsedResult({
          rows: [],
          errors: [{ rowIndex: error.rowIndex, message: error.message }],
        });
      } else {
        setParsedResult({
          rows: [],
          errors: [
            {
              rowIndex: 0,
              message: error instanceof Error ? error.message : "Failed to parse XLSX file",
            },
          ],
        });
      }
    } finally {
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!parsedResult || parsedResult.rows.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    setImportProgress(null);

    try {
      const eventNames = new Set(parsedResult.rows.map((row) => row.eventName));
      const expectedEventsMatched = eventNames.size;
      const batches: WorkCategoryImportRow[][] = [];
      for (let i = 0; i < parsedResult.rows.length; i += IMPORT_BATCH_SIZE) {
        batches.push(parsedResult.rows.slice(i, i + IMPORT_BATCH_SIZE));
      }

      const totalBatches = batches.length;
      let aggregate: ImportResult = {
        workCategoriesCreated: 0,
        workCategoriesUpdated: 0,
        eventsMatched: expectedEventsMatched,
      };

      for (let index = 0; index < batches.length; index += 1) {
        setImportProgress({ current: index + 1, total: totalBatches });
        const response = await fetch("/api/data/work-categories/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rows: batches[index] }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Import failed on batch ${index + 1}`);
        }

        aggregate = {
          workCategoriesCreated: aggregate.workCategoriesCreated + (data.workCategoriesCreated ?? 0),
          workCategoriesUpdated: aggregate.workCategoriesUpdated + (data.workCategoriesUpdated ?? 0),
          eventsMatched: expectedEventsMatched,
        };
      }

      setImportResult(aggregate);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unknown error during import");
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const summary = useMemo(() => {
    if (!parsedResult || parsedResult.rows.length === 0) {
      return null;
    }
    const eventNames = new Set<string>();
    const phases = new Set<string>();
    const workCategories = new Set<string>();
    for (const row of parsedResult.rows) {
      eventNames.add(row.eventName);
      phases.add(row.phase);
      workCategories.add(row.workCategoryName);
    }
    return {
      eventNames: Array.from(eventNames),
      phases: Array.from(phases),
      workCategories: Array.from(workCategories),
    };
  }, [parsedResult]);

  const canImport =
    parsedResult && parsedResult.rows.length > 0 && parsedResult.errors.length === 0 && !isImporting;

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px", backgroundColor: "var(--bg-secondary)" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <Link
          href="/planning/work"
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: "1px solid var(--border-primary)",
            textDecoration: "none",
            color: "var(--text-primary)",
            backgroundColor: "var(--surface-default)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          Back to Work Categories
        </Link>
      </header>

      <section
        style={{
          maxWidth: 900,
          marginTop: "20px",
          backgroundColor: "var(--surface-default)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: "24px" }}>Work Category Import</h1>
        <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: "14px" }}>
          Upload an XLSX file with columns: Event name, Phase, Work category, Estimated effort hours.
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--surface-default)",
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-full)",
              color: "var(--text-primary)",
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-block",
            }}
          >
            Choose XLSX File
            <input type="file" accept=".xlsx" onChange={handleXlsxUpload} style={{ display: "none" }} />
          </label>
        </div>

        {parsedResult?.errors.length ? (
          <div
            style={{
              backgroundColor: "#ffebee",
              border: "2px solid #c62828",
              padding: "12px",
              color: "#000",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            <strong>Parse errors:</strong>
            <ul style={{ margin: "8px 0 0 16px" }}>
              {parsedResult.errors.map((error, idx) => (
                <li key={idx}>
                  Row {error.rowIndex}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {parsedResult?.rows.length ? (
          <>
            {summary && (
              <div
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <div>Rows: {parsedResult.rows.length}</div>
                <div>Events: {summary.eventNames.length}</div>
                <div>Phases: {summary.phases.length}</div>
                <div>Work categories: {summary.workCategories.length}</div>
              </div>
            )}

            <div style={{ overflowX: "auto", marginBottom: "16px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid var(--border-primary)",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
                    <th style={cellStyle}>Event</th>
                    <th style={cellStyle}>Phase</th>
                    <th style={cellStyle}>Work category</th>
                    <th style={cellStyle}>Estimated hours</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedResult.rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-primary)" }}>
                      <td style={cellStyle}>{row.eventName}</td>
                      <td style={cellStyle}>{row.phase}</td>
                      <td style={cellStyle}>{row.workCategoryName}</td>
                      <td style={cellStyle}>{row.estimatedEffortHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
              {importResult ? (
                <Link
                  href="/planning/work"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "1px solid var(--border-primary)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-default)",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Go to work categories
                </Link>
              ) : (
                <Button type="button" variant="primary" size="md" disabled={!canImport} onClick={handleImport}>
                  {isImporting ? "Importing..." : "Import work categories"}
                </Button>
              )}
            </div>
            {importProgress && (
              <div style={{ marginBottom: "8px" }}>
                <div style={{
                  height: "6px",
                  backgroundColor: "var(--border-primary)",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                    height: "100%",
                    backgroundColor: "var(--status-success)",
                    transition: "width 200ms ease",
                  }} />
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", textAlign: "right" }}>
                  Importing batch {importProgress.current} of {importProgress.total}...
                </div>
              </div>
            )}
          </>
        ) : null}

        {importResult && (
          <div
            style={{
              marginTop: "12px",
              backgroundColor: "#e8f5e9",
              border: "2px solid #2e7d32",
              padding: "12px",
              fontSize: "13px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>Import successful</div>
            <div>Created: {importResult.workCategoriesCreated}</div>
            <div>Updated: {importResult.workCategoriesUpdated}</div>
            <div>Events matched: {importResult.eventsMatched}</div>
          </div>
        )}

        {importError && (
          <div
            style={{
              marginTop: "12px",
              backgroundColor: "#ffebee",
              border: "2px solid #c62828",
              padding: "12px",
              fontSize: "13px",
            }}
          >
            <strong>Error:</strong> {importError}
          </div>
        )}
      </section>
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid var(--border-primary)",
  padding: "8px",
  textAlign: "left",
};
