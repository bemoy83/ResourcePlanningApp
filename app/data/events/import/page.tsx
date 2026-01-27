"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EventXlsxParseError, parseEventXlsx } from "@/lib/import/parseEventXlsx";
import { EventImportRow } from "@/types/event-import";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";

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

const IMPORT_BATCH_SIZE = 200;

export default function ImportPreviewPage() {
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

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
    setImportProgress(null);

    try {
      const eventGroups = new Map<string, EventImportRow[]>();
      for (const row of parsedResult.rows) {
        const group = eventGroups.get(row.eventName);
        if (group) {
          group.push(row);
        } else {
          eventGroups.set(row.eventName, [row]);
        }
      }

      const batches: EventImportRow[][] = [];
      let currentBatch: EventImportRow[] = [];
      let currentCount = 0;
      for (const rows of eventGroups.values()) {
        if (currentCount > 0 && currentCount + rows.length > IMPORT_BATCH_SIZE) {
          batches.push(currentBatch);
          currentBatch = [];
          currentCount = 0;
        }
        currentBatch.push(...rows);
        currentCount += rows.length;
      }
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      const totalBatches = batches.length;
      let aggregate: ImportResult = {
        eventsCreated: 0,
        eventsReused: 0,
        locationsCreated: 0,
        eventLocationsCreated: 0,
        phasesCreated: 0,
      };

      for (let index = 0; index < batches.length; index += 1) {
        setImportProgress({ current: index + 1, total: totalBatches });
        const response = await fetch("/api/data/events/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: batches[index],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Import failed on batch ${index + 1}`);
        }

        aggregate = {
          eventsCreated: aggregate.eventsCreated + (data.eventsCreated ?? 0),
          eventsReused: aggregate.eventsReused + (data.eventsReused ?? 0),
          locationsCreated: aggregate.locationsCreated + (data.locationsCreated ?? 0),
          eventLocationsCreated: aggregate.eventLocationsCreated + (data.eventLocationsCreated ?? 0),
          phasesCreated: aggregate.phasesCreated + (data.phasesCreated ?? 0),
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

    return {
      events,
      locations,
      eventPhases,
      phaseCount,
    };
  }, [interpretation, parsedResult]);

  // Can import if: has rows, no errors, not currently importing
  const canImport = parsedResult && parsedResult.rows.length > 0 && parsedResult.errors.length === 0 && !isImporting;

  return (
    <main style={{
      minHeight: "100vh",
      padding: "var(--space-xl)",
      backgroundColor: "var(--bg-primary)",
    }}>
      {/* 1. Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{
          marginBottom: "var(--space-xs)",
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          Event Import
        </div>
        <h1 style={{
          margin: "0 0 var(--space-sm) 0",
          color: "var(--text-primary)",
          fontSize: "var(--font-size-2xl)",
          fontWeight: "var(--font-weight-semibold)",
          letterSpacing: "var(--letter-spacing-tight)",
        }}>
          Event Calendar Import — Preview
        </h1>
        <p style={{
          margin: 0,
          fontSize: "var(--font-size-md)",
          color: "var(--text-secondary)",
        }}>
          Upload XLSX data to preview how it will be interpreted
        </p>
      </div>

      {/* 2. Input Section */}
      <section style={{
        marginBottom: "var(--space-2xl)",
        padding: "var(--space-xl) var(--space-2xl)",
        backgroundColor: "var(--surface-default)",
        border: "var(--border-width-thin) solid var(--border-secondary)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-lg)",
      }}>
        <h2 style={{
          fontSize: "var(--font-size-lg)",
          marginBottom: "var(--space-md)",
          color: "var(--text-primary)",
          fontWeight: "var(--font-weight-semibold)",
        }}>
          Input
        </h2>

        {/* XLSX Upload */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <label>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleXlsxUpload}
              style={{ display: "none" }}
            />
            <Button
              variant="default"
              size="md"
              onClick={(e) => {
                e.preventDefault();
                const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }}
            >
              Choose XLSX File
            </Button>
          </label>
          <span style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--text-tertiary)",
          }}>
            Uses the upstream export format
          </span>
        </div>
      </section>

      {/* Results Section - Only shown after preview */}
      {parsedResult && (
        <>
          {/* 3. Parse Errors Section */}
          {parsedResult.errors.length > 0 && (
            <section style={{
              marginBottom: "var(--space-2xl)",
              padding: "var(--space-xl) var(--space-2xl)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-thin) solid var(--status-error)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <h2 style={{
                fontSize: "var(--font-size-lg)",
                marginBottom: "var(--space-md)",
                color: "var(--status-error)",
                fontWeight: "var(--font-weight-semibold)",
              }}>
                Parse Errors ({parsedResult.errors.length})
              </h2>
              <div style={{
                backgroundColor: "var(--bg-secondary)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-md)",
                overflowX: "auto",
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "var(--font-size-sm)",
                }}>
                  <thead>
                    <tr style={{ borderBottom: "var(--border-width-thin) solid var(--border-primary)" }}>
                      <th style={{
                        padding: "var(--space-sm)",
                        textAlign: "left",
                        width: "100px",
                        color: "var(--text-secondary)",
                        fontWeight: "var(--font-weight-medium)",
                      }}>
                        Row Index
                      </th>
                      <th style={{
                        padding: "var(--space-sm)",
                        textAlign: "left",
                        color: "var(--text-secondary)",
                        fontWeight: "var(--font-weight-medium)",
                      }}>
                        Error Message
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.errors.map((error, idx) => (
                      <tr key={idx} style={{ borderBottom: "var(--border-width-thin) solid var(--border-secondary)" }}>
                        <td style={{
                          padding: "var(--space-sm)",
                          color: "var(--text-primary)",
                        }}>
                          {error.rowIndex}
                        </td>
                        <td style={{
                          padding: "var(--space-sm)",
                          color: "var(--text-primary)",
                        }}>
                          {error.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 4. Import Action Section */}
          {parsedResult.rows.length > 0 && (
            <section style={{
              marginBottom: "var(--space-2xl)",
              padding: "var(--space-xl) var(--space-2xl)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-thin) solid var(--border-secondary)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <h2 style={{
                fontSize: "var(--font-size-lg)",
                marginBottom: "var(--space-md)",
                color: "var(--text-primary)",
                fontWeight: "var(--font-weight-semibold)",
              }}>
                Execute Import
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                {importResult ? (
                  <Link href="/workspace">
                    <Button variant="primary" size="md">
                      Go to workspace
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={handleImport}
                    disabled={!canImport}
                      variant="primary"
                      size="md"
                    >
                      {isImporting ? "Importing..." : "Import Events"}
                  </Button>
                )}
                {importProgress && (
                  <div>
                    <div style={{
                      height: "6px",
                      backgroundColor: "var(--surface-progress-track)",
                      borderRadius: "var(--radius-full)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                        height: "100%",
                        backgroundColor: "var(--status-success)",
                        transition: "width var(--transition-fast)",
                      }} />
                    </div>
                    <div style={{
                      marginTop: "var(--space-xs)",
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-secondary)",
                    }}>
                      Importing batch {importProgress.current} of {importProgress.total}...
                    </div>
                  </div>
                )}
                {parsedResult.errors.length > 0 && (
                  <div style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--status-error)",
                  }}>
                    Cannot import: Fix parse errors first
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 5. Interpretation Summary */}
          {parsedResult.rows.length > 0 && interpretation && summaryData && (
            <section style={{
              marginBottom: "var(--space-2xl)",
              padding: "var(--space-xl) var(--space-2xl)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-thin) solid var(--border-secondary)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-md)",
                marginBottom: "var(--space-lg)",
                flexWrap: "wrap",
              }}>
                <h2 style={{
                  fontSize: "var(--font-size-lg)",
                  margin: 0,
                  color: "var(--text-primary)",
                  fontWeight: "var(--font-weight-semibold)",
                }}>
                  Interpretation Summary
                </h2>
                <Button
                  onClick={handleExportSummary}
                  variant="default"
                  size="sm"
                >
                  Export Summary
                </Button>
              </div>
              <details open>
                <summary style={{
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "var(--space-md)",
                  color: "var(--text-secondary)",
                  fontWeight: "var(--font-weight-medium)",
                }}>
                  Show interpretation summary
                </summary>
                <div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "var(--space-md)",
                    marginBottom: "var(--space-lg)",
                  }}>
                    <div style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-md)",
                    }}>
                      <div style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-tertiary)",
                        marginBottom: "var(--space-xs)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: "var(--font-weight-medium)",
                      }}>
                        Events
                      </div>
                      <div style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--text-primary)",
                      }}>
                        {summaryData.events.length}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-md)",
                    }}>
                      <div style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-tertiary)",
                        marginBottom: "var(--space-xs)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: "var(--font-weight-medium)",
                      }}>
                        Locations
                      </div>
                      <div style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--text-primary)",
                      }}>
                        {summaryData.locations.length}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-md)",
                    }}>
                      <div style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-tertiary)",
                        marginBottom: "var(--space-xs)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: "var(--font-weight-medium)",
                      }}>
                        Phases
                      </div>
                      <div style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--text-primary)",
                      }}>
                        {summaryData.phaseCount}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-md)",
                    }}>
                      <div style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-tertiary)",
                        marginBottom: "var(--space-xs)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: "var(--font-weight-medium)",
                      }}>
                        Rows
                      </div>
                      <div style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--text-primary)",
                      }}>
                        {parsedResult.rows.length}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginBottom: "var(--space-lg)",
                    fontSize: "var(--font-size-sm)",
                    fontStyle: "italic",
                    color: "var(--text-tertiary)",
                  }}>
                    ⚠️ These are visual summaries only — not validation.
                  </div>

                  {/* Locations List */}
                  <div style={{ marginBottom: "var(--space-xl)" }}>
                    <h3 style={{
                      fontSize: "var(--font-size-md)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text-primary)",
                      marginBottom: "var(--space-sm)",
                    }}>
                      Locations
                    </h3>
                    <div style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-md)",
                    }}>
                      {summaryData.locations.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                          {summaryData.locations.map((location) => (
                            <Chip key={location} variant="chip">
                              {location}
                            </Chip>
                          ))}
                        </div>
                      ) : (
                        <span style={{
                          color: "var(--text-tertiary)",
                          fontStyle: "italic",
                          fontSize: "var(--font-size-sm)",
                        }}>
                          No locations found
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Events & Phases Accordion */}
                  <div>
                    <h3 style={{
                      fontSize: "var(--font-size-md)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text-primary)",
                      marginBottom: "var(--space-sm)",
                    }}>
                      Events & Phases
                    </h3>
                    <div style={{
                      backgroundColor: "var(--surface-default)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                    }}>
                      {summaryData.eventPhases.length > 0 ? (
                        summaryData.eventPhases.map((eventPhase, index) => {
                          const isExpanded = expandedEvents.has(eventPhase.eventName);
                          return (
                            <div
                              key={eventPhase.eventName}
                              style={{
                                borderBottom: index < summaryData.eventPhases.length - 1
                                  ? "var(--border-width-thin) solid var(--border-secondary)"
                                  : "none",
                              }}
                            >
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedEvents);
                                  if (isExpanded) {
                                    newExpanded.delete(eventPhase.eventName);
                                  } else {
                                    newExpanded.add(eventPhase.eventName);
                                  }
                                  setExpandedEvents(newExpanded);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "var(--space-md) var(--space-lg)",
                                  backgroundColor: isExpanded ? "var(--bg-secondary)" : "var(--surface-default)",
                                  border: "none",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "var(--font-size-sm)",
                                  color: "var(--text-primary)",
                                  transition: "background-color var(--transition-fast)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isExpanded) {
                                    e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isExpanded) {
                                    e.currentTarget.style.backgroundColor = "var(--surface-default)";
                                  }
                                }}
                              >
                                <span style={{
                                  fontWeight: isExpanded
                                    ? "var(--font-weight-semibold)"
                                    : "var(--font-weight-medium)",
                                }}>
                                  {eventPhase.eventName}
                                </span>
                                <span style={{
                                  fontSize: "var(--font-size-xs)",
                                  color: "var(--text-tertiary)",
                                  marginLeft: "var(--space-md)",
                                }}>
                                  {isExpanded ? "▼" : "▶"} {eventPhase.phases.length} {eventPhase.phases.length === 1 ? "phase" : "phases"}
                                </span>
                              </button>
                              {isExpanded && (
                                <div style={{
                                  padding: "var(--space-md) var(--space-lg)",
                                  backgroundColor: "var(--bg-primary)",
                                  borderTop: "var(--border-width-thin) solid var(--border-secondary)",
                                }}>
                                  <div style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "var(--space-xs)",
                                  }}>
                                    {eventPhase.phases.map((phase) => (
                                      <Chip key={phase} variant="chip">
                                        {phase}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{
                          padding: "var(--space-lg)",
                          color: "var(--text-tertiary)",
                          fontStyle: "italic",
                          fontSize: "var(--font-size-sm)",
                        }}>
                          No events found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            </section>
          )}

          {/* Import Result - Success */}
          {importResult && (
            <section style={{
              marginBottom: "var(--space-2xl)",
              padding: "var(--space-xl) var(--space-2xl)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-thin) solid var(--status-success)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <h2 style={{
                fontSize: "var(--font-size-lg)",
                marginBottom: "var(--space-md)",
                color: "var(--status-success)",
                fontWeight: "var(--font-weight-semibold)",
              }}>
                Import Successful
              </h2>
              <div style={{
                backgroundColor: "var(--bg-secondary)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-md)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-primary)",
              }}>
                <div style={{
                  marginBottom: "var(--space-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                }}>
                  Import completed successfully!
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: "var(--space-xl)",
                  color: "var(--text-primary)",
                }}>
                  <li>Events created: {importResult.eventsCreated}</li>
                  <li>Events reused: {importResult.eventsReused}</li>
                  <li>Locations created: {importResult.locationsCreated}</li>
                  <li>Event-Location links created: {importResult.eventLocationsCreated}</li>
                  <li>Phases created: {importResult.phasesCreated}</li>
                </ul>
                <div style={{ marginTop: "var(--space-md)" }}>
                  <Link href="/workspace">
                    <Button variant="primary" size="md">
                      View Event Calendar
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Import Result - Error */}
          {importError && (
            <section style={{
              marginBottom: "var(--space-2xl)",
              padding: "var(--space-xl) var(--space-2xl)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-thin) solid var(--status-error)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <h2 style={{
                fontSize: "var(--font-size-lg)",
                marginBottom: "var(--space-md)",
                color: "var(--status-error)",
                fontWeight: "var(--font-weight-semibold)",
              }}>
                Import Failed
              </h2>
              <div style={{
                backgroundColor: "var(--bg-secondary)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-md)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-primary)",
              }}>
                <strong>Error:</strong> {importError}
              </div>
            </section>
          )}

          {/* No rows parsed message */}
          {parsedResult.rows.length === 0 && parsedResult.errors.length === 0 && (
            <section style={{
              marginBottom: "var(--space-2xl)",
              padding: "var(--space-xl) var(--space-2xl)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-thin) solid var(--border-secondary)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <div style={{
                padding: "var(--space-xl)",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-sm)",
                textAlign: "center",
                fontStyle: "italic",
              }}>
                No valid rows found in input
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
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
