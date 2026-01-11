"use client";

import { useState } from "react";
import { parseEventImport, ParsedImportResult } from "@/lib/import/parseEventImport";
import { EventXlsxParseError, parseEventXlsx } from "@/lib/import/parseEventXlsx";
import { EventImportRow } from "@/types/event-import";

interface ImportResult {
  eventsCreated: number;
  eventsReused: number;
  locationsCreated: number;
  eventLocationsCreated: number;
  phasesCreated: number;
}

export default function ImportPreviewPage() {
  const [inputText, setInputText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
      const rows = parseEventXlsx(buffer);
      setParsedResult({ rows, errors: [] });
      setInputText("");
    } catch (error) {
      if (error instanceof EventXlsxParseError) {
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

  const handlePreview = () => {
    if (!inputText.trim()) {
      setParsedResult({ rows: [], errors: [{ rowIndex: 0, message: "Input is empty" }] });
      return;
    }

    const result = parseEventImport(inputText, format);
    setParsedResult(result);

    // Reset import state when re-previewing
    setImportResult(null);
    setImportError(null);
  };

  const handleImport = async () => {
    if (!parsedResult || parsedResult.rows.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const response = await fetch("/api/data/events/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: parsedResult.rows,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult(data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unknown error during import");
    } finally {
      setIsImporting(false);
    }
  };

  // Derive interpretation summaries from parsed rows
  const interpretation = parsedResult ? deriveInterpretation(parsedResult.rows) : null;

  // Can import if: has rows, no errors, not currently importing
  const canImport = parsedResult && parsedResult.rows.length > 0 && parsedResult.errors.length === 0 && !isImporting;

  return (
    <div style={{ padding: "20px", maxWidth: "100%", backgroundColor: "#fafafa" }}>
      {/* 1. Header */}
      <h1 style={{
        marginBottom: "8px",
        color: "#000",
        borderBottom: "2px solid #333",
        paddingBottom: "8px"
      }}>
        Event Calendar Import — Preview
      </h1>
      <div style={{ marginBottom: "24px", fontSize: "14px", color: "#555" }}>
        Upload XLSX or paste CSV/JSON data to preview how it will be interpreted
      </div>

      {/* 2. Input Section */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "18px",
          marginBottom: "12px",
          color: "#000",
          borderBottom: "1px solid #666",
          paddingBottom: "6px"
        }}>
          Input
        </h2>

        {/* XLSX Upload */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{
            padding: "8px 12px",
            backgroundColor: "#f5f5f5",
            border: "2px solid #666",
            color: "#000",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-block",
            marginRight: "12px",
          }}>
            Choose XLSX File
            <input
              type="file"
              accept=".xlsx"
              onChange={handleXlsxUpload}
              style={{ display: "none" }}
            />
          </label>
          <span style={{ fontSize: "12px", color: "#555" }}>
            Uses the upstream export format
          </span>
        </div>

        {/* Format Selector */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ marginRight: "20px", fontSize: "14px" }}>
            <input
              type="radio"
              value="csv"
              checked={format === "csv"}
              onChange={(e) => setFormat(e.target.value as "csv")}
              style={{ marginRight: "6px" }}
            />
            CSV
          </label>
          <label style={{ fontSize: "14px" }}>
            <input
              type="radio"
              value="json"
              checked={format === "json"}
              onChange={(e) => setFormat(e.target.value as "json")}
              style={{ marginRight: "6px" }}
            />
            JSON
          </label>
        </div>

        {/* Textarea */}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={format === "csv"
            ? "eventName,locationName,phase,startDate,endDate\nSpring Fair,Hall A,ASSEMBLY,2026-03-01,2026-03-05"
            : '[\n  {\n    "eventName": "Spring Fair",\n    "locationName": "Hall A",\n    "phase": "ASSEMBLY",\n    "startDate": "2026-03-01",\n    "endDate": "2026-03-05"\n  }\n]'
          }
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "12px",
            fontSize: "13px",
            fontFamily: "monospace",
            border: "2px solid #999",
            backgroundColor: "#fff",
            resize: "vertical",
          }}
        />

        {/* Preview Button */}
        <button
          onClick={handlePreview}
          style={{
            marginTop: "12px",
            padding: "10px 20px",
            backgroundColor: "#4a90e2",
            border: "2px solid #333",
            color: "#fff",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Preview Import
        </button>
      </section>

      {/* Results Section - Only shown after preview */}
      {parsedResult && (
        <>
          {/* 3. Parse Errors Section */}
          {parsedResult.errors.length > 0 && (
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontSize: "18px",
                marginBottom: "12px",
                color: "#c62828",
                borderBottom: "1px solid #c62828",
                paddingBottom: "6px"
              }}>
                Parse Errors ({parsedResult.errors.length})
              </h2>
              <div style={{
                backgroundColor: "#ffebee",
                border: "2px solid #c62828",
                padding: "16px",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #c62828" }}>
                      <th style={{ padding: "8px", textAlign: "left", width: "100px" }}>Row Index</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.errors.map((error, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #ffcdd2" }}>
                        <td style={{ padding: "8px", color: "#000" }}>{error.rowIndex}</td>
                        <td style={{ padding: "8px", color: "#000" }}>{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 4. Parsed Rows Preview */}
          {parsedResult.rows.length > 0 && (
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontSize: "18px",
                marginBottom: "12px",
                color: "#000",
                borderBottom: "1px solid #666",
                paddingBottom: "6px"
              }}>
                Parsed Rows ({parsedResult.rows.length})
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "2px solid #666",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}>
                      <th style={tableCellStyle}>Event</th>
                      <th style={tableCellStyle}>Location</th>
                      <th style={tableCellStyle}>Phase</th>
                      <th style={tableCellStyle}>Start Date</th>
                      <th style={tableCellStyle}>End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={tableCellStyle}>{row.eventName}</td>
                        <td style={tableCellStyle}>{row.locationName}</td>
                        <td style={tableCellStyle}>{row.phase}</td>
                        <td style={tableCellStyle}>{row.startDate}</td>
                        <td style={tableCellStyle}>{row.endDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 5. Interpretation Summary */}
          {parsedResult.rows.length > 0 && interpretation && (
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontSize: "18px",
                marginBottom: "12px",
                color: "#000",
                borderBottom: "1px solid #666",
                paddingBottom: "6px"
              }}>
                Interpretation Summary
              </h2>
              <div style={{
                backgroundColor: "#f5f5f5",
                border: "2px solid #999",
                padding: "16px",
                fontSize: "14px",
              }}>
                <div style={{ marginBottom: "4px", fontSize: "12px", fontStyle: "italic", color: "#666" }}>
                  ⚠️ These are visual summaries only — not validation.
                </div>

                {/* Events Detected */}
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "15px", marginBottom: "8px", fontWeight: "bold" }}>
                    Events Detected ({interpretation.events.length})
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {interpretation.events.map((event, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>{event}</li>
                    ))}
                  </ul>
                </div>

                {/* Locations Detected */}
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "15px", marginBottom: "8px", fontWeight: "bold" }}>
                    Locations Detected ({interpretation.locations.length})
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {interpretation.locations.map((location, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>{location}</li>
                    ))}
                  </ul>
                </div>

                {/* Phases Detected (per event) */}
                <div>
                  <h3 style={{ fontSize: "15px", marginBottom: "8px", fontWeight: "bold" }}>
                    Phases Detected (per event)
                  </h3>
                  {interpretation.eventPhases.map((eventPhase, idx) => (
                    <div key={idx} style={{ marginBottom: "12px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                        {eventPhase.eventName}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "30px" }}>
                        {eventPhase.phases.map((phase, phaseIdx) => (
                          <li key={phaseIdx} style={{ marginBottom: "2px" }}>{phase}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 6. Import Action Section */}
          {parsedResult.rows.length > 0 && (
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontSize: "18px",
                marginBottom: "12px",
                color: "#000",
                borderBottom: "1px solid #666",
                paddingBottom: "6px"
              }}>
                Execute Import
              </h2>
              <div style={{
                backgroundColor: "#f5f5f5",
                border: "2px solid #999",
                padding: "16px",
              }}>
                <button
                  onClick={handleImport}
                  disabled={!canImport}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: canImport ? "#4caf50" : "#ccc",
                    border: "2px solid #333",
                    color: canImport ? "#fff" : "#666",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: canImport ? "pointer" : "not-allowed",
                  }}
                >
                  {isImporting ? "Importing..." : "Import Events"}
                </button>
                {parsedResult.errors.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#c62828" }}>
                    Cannot import: Fix parse errors first
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Import Result - Success */}
          {importResult && (
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontSize: "18px",
                marginBottom: "12px",
                color: "#2e7d32",
                borderBottom: "1px solid #2e7d32",
                paddingBottom: "6px"
              }}>
                Import Successful
              </h2>
              <div style={{
                backgroundColor: "#e8f5e9",
                border: "2px solid #2e7d32",
                padding: "16px",
                fontSize: "14px",
              }}>
                <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
                  Import completed successfully!
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>Events created: {importResult.eventsCreated}</li>
                  <li>Events reused: {importResult.eventsReused}</li>
                  <li>Locations created: {importResult.locationsCreated}</li>
                  <li>Event-Location links created: {importResult.eventLocationsCreated}</li>
                  <li>Phases created: {importResult.phasesCreated}</li>
                </ul>
                <div style={{ marginTop: "12px" }}>
                  <a
                    href="/calendar"
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#2e7d32",
                      border: "2px solid #1b5e20",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "13px",
                      display: "inline-block",
                      fontWeight: "bold",
                    }}
                  >
                    View Event Calendar
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Import Result - Error */}
          {importError && (
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontSize: "18px",
                marginBottom: "12px",
                color: "#c62828",
                borderBottom: "1px solid #c62828",
                paddingBottom: "6px"
              }}>
                Import Failed
              </h2>
              <div style={{
                backgroundColor: "#ffebee",
                border: "2px solid #c62828",
                padding: "16px",
                fontSize: "14px",
                color: "#000",
              }}>
                <strong>Error:</strong> {importError}
              </div>
            </section>
          )}

          {/* No rows parsed message */}
          {parsedResult.rows.length === 0 && parsedResult.errors.length === 0 && (
            <section style={{ marginBottom: "32px" }}>
              <div style={{
                padding: "20px",
                backgroundColor: "#fff",
                border: "2px solid #999",
                color: "#666",
                fontSize: "14px",
                textAlign: "center",
                fontStyle: "italic",
              }}>
                No valid rows found in input
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "left",
  color: "#000",
};

/**
 * Derive interpretation summaries from parsed rows
 * Returns unique events, locations, and phases per event
 */
function deriveInterpretation(rows: EventImportRow[]) {
  // Extract unique event names (preserve order of first appearance)
  const eventsSet = new Set<string>();
  const events: string[] = [];
  rows.forEach(row => {
    if (!eventsSet.has(row.eventName)) {
      eventsSet.add(row.eventName);
      events.push(row.eventName);
    }
  });

  // Extract unique location names (preserve order of first appearance)
  const locationsSet = new Set<string>();
  const locations: string[] = [];
  rows.forEach(row => {
    if (!locationsSet.has(row.locationName)) {
      locationsSet.add(row.locationName);
      locations.push(row.locationName);
    }
  });

  // Extract phases per event (preserve order of first appearance)
  const eventPhasesMap = new Map<string, Set<string>>();
  rows.forEach(row => {
    if (!eventPhasesMap.has(row.eventName)) {
      eventPhasesMap.set(row.eventName, new Set());
    }
    eventPhasesMap.get(row.eventName)!.add(row.phase);
  });

  const eventPhases = events.map(eventName => ({
    eventName,
    phases: Array.from(eventPhasesMap.get(eventName) || []),
  }));

  return {
    events,
    locations,
    eventPhases,
  };
}
