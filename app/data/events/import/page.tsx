"use client";

import { useMemo, useState } from "react";
import { EventXlsxParseError, parseEventXlsx } from "@/lib/import/parseEventXlsx";
import { EventImportRow } from "@/types/event-import";

interface ParsedImportResult {
  rows: EventImportRow[];
  errors: { rowIndex: number; message: string }[];
}

interface ImportResult {
  eventsCreated: number;
  eventsReused: number;
  locationsCreated: number;
  eventLocationsCreated: number;
  phasesCreated: number;
}

export default function ImportPreviewPage() {
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExportSummary = () => {
    if (!interpretation) {
      return;
    }

    const payload = {
      events: interpretation.events,
      locations: interpretation.locations,
      eventPhases: interpretation.eventPhases,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "event-import-summary.json";
    link.click();
    URL.revokeObjectURL(url);
  };

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
  const summaryData = useMemo(() => {
    if (!interpretation || !parsedResult) {
      return null;
    }

    const events = [...interpretation.events].sort((a, b) => a.localeCompare(b));
    const locations = [...interpretation.locations].sort((a, b) => a.localeCompare(b));
    const eventPhases = interpretation.eventPhases
      .map((eventPhase) => ({
        eventName: eventPhase.eventName,
        phases: [...eventPhase.phases].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.eventName.localeCompare(b.eventName));
    const phaseCount = eventPhases.reduce((sum, entry) => sum + entry.phases.length, 0);
    const locationEvents = buildLocationEventSummary(parsedResult.rows);

    return {
      events,
      locations,
      eventPhases,
      phaseCount,
      locationEvents,
    };
  }, [interpretation, parsedResult]);

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
        Upload XLSX data to preview how it will be interpreted
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

          {/* 4. Import Action Section */}
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

          {/* 5. Interpretation Summary */}
          {parsedResult.rows.length > 0 && interpretation && summaryData && (
            <section style={{ marginBottom: "32px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "12px",
                borderBottom: "1px solid #666",
                paddingBottom: "6px",
              }}>
                <h2 style={{ fontSize: "18px", margin: 0, color: "#000" }}>
                  Interpretation Summary
                </h2>
                <button
                  onClick={handleExportSummary}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #666",
                    color: "#000",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Export Summary
                </button>
              </div>
              <details>
                <summary style={{ cursor: "pointer", fontSize: "13px", marginBottom: "8px" }}>
                  Show interpretation summary
                </summary>
                <div style={{
                  backgroundColor: "#f5f5f5",
                  border: "2px solid #999",
                  padding: "16px",
                  fontSize: "14px",
                }}>
                  <div style={summaryStatsRowStyle}>
                    <div style={summaryStatStyle}>
                      <div style={summaryStatLabelStyle}>Events</div>
                      <div style={summaryStatValueStyle}>{summaryData.events.length}</div>
                    </div>
                    <div style={summaryStatStyle}>
                      <div style={summaryStatLabelStyle}>Locations</div>
                      <div style={summaryStatValueStyle}>{summaryData.locations.length}</div>
                    </div>
                    <div style={summaryStatStyle}>
                      <div style={summaryStatLabelStyle}>Phases</div>
                      <div style={summaryStatValueStyle}>{summaryData.phaseCount}</div>
                    </div>
                    <div style={summaryStatStyle}>
                      <div style={summaryStatLabelStyle}>Rows</div>
                      <div style={summaryStatValueStyle}>{parsedResult.rows.length}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px", fontSize: "12px", fontStyle: "italic", color: "#666" }}>
                    ⚠️ These are visual summaries only — not validation.
                  </div>

                  <div style={summaryTablesGridStyle}>
                    <div style={summaryTablePanelStyle}>
                      <div style={summaryTableHeaderStyle}>Locations → Events</div>
                      <div style={summaryTableBodyStyle}>
                        <table style={summaryTableStyle}>
                          <thead>
                            <tr>
                              <th style={summaryTableHeaderCellStyle}>Location</th>
                              <th style={summaryTableHeaderCellStyle}>Events</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryData.locationEvents.map((location) => (
                              <tr key={location.name}>
                                <td style={summaryTableCellStyle}>{location.name}</td>
                                <td style={summaryTableCellStyle}>{location.events.length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={summaryTablePanelStyle}>
                      <div style={summaryTableHeaderStyle}>Events → Phases</div>
                      <div style={summaryTableBodyStyle}>
                        <table style={summaryTableStyle}>
                          <thead>
                            <tr>
                              <th style={summaryTableHeaderCellStyle}>Event</th>
                              <th style={summaryTableHeaderCellStyle}>Phases</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryData.eventPhases.map((eventPhase) => (
                              <tr key={eventPhase.eventName}>
                                <td style={summaryTableCellStyle}>{eventPhase.eventName}</td>
                                <td style={summaryTableCellStyle}>{eventPhase.phases.length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
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
                color: "#000",
              }}>
                <div style={{ marginBottom: "8px", fontWeight: "bold", color: "#000" }}>
                  Import completed successfully!
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li style={{ color: "#000" }}>Events created: {importResult.eventsCreated}</li>
                  <li style={{ color: "#000" }}>Events reused: {importResult.eventsReused}</li>
                  <li style={{ color: "#000" }}>Locations created: {importResult.locationsCreated}</li>
                  <li style={{ color: "#000" }}>Event-Location links created: {importResult.eventLocationsCreated}</li>
                  <li style={{ color: "#000" }}>Phases created: {importResult.phasesCreated}</li>
                </ul>
                <div style={{ marginTop: "12px" }}>
                  <a
                    href="/workspace"
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

const summaryStatsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const summaryStatStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #999",
  borderRadius: "10px",
  padding: "10px 12px",
};

const summaryStatLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const summaryStatValueStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#000",
};

const summaryTablesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const summaryTablePanelStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #999",
  borderRadius: "10px",
  padding: "10px 12px",
  color: "#000",
};

const summaryTableHeaderStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#000",
  marginBottom: "8px",
};

const summaryTableBodyStyle: React.CSSProperties = {
  maxHeight: "320px",
  overflowY: "auto",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
};

const summaryTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const summaryTableHeaderCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "1px solid #e0e0e0",
  backgroundColor: "#f5f5f5",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const summaryTableCellStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #f0f0f0",
  color: "#000",
};

function buildLocationEventSummary(rows: EventImportRow[]) {
  const locationEvents = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!locationEvents.has(row.locationName)) {
      locationEvents.set(row.locationName, new Set<string>());
    }
    locationEvents.get(row.locationName)?.add(row.eventName);
  }

  return Array.from(locationEvents.entries())
    .map(([name, events]) => ({
      name,
      events: Array.from(events).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

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
