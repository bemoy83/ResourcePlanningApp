"use client";

import { useState } from "react";
import { ImportPreviewResponse, ImportPreviewRow } from "../../../types/event-import";

export default function ImportPreviewPage() {
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      setError('Excel files (.xlsx, .xls) are not supported. Please upload CSV or JSON files.');
      return;
    }

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
      setError('Only CSV and JSON files are supported.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to preview import');
      }

      const previewData: ImportPreviewResponse = await response.json();
      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview import');
    } finally {
      setIsLoading(false);
    }
  }

  const hasErrors = preview ? preview.summary.rowsWithErrors > 0 : false;
  const canImport = preview && !hasErrors;

  return (
    <div style={{ padding: '20px', maxWidth: '100%', backgroundColor: '#fafafa' }}>
      <div style={{ marginBottom: '12px' }}>
        <a
          href="/calendar"
          style={{
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            border: '2px solid #666',
            color: '#000',
            textDecoration: 'none',
            fontSize: '12px',
            display: 'inline-block',
          }}
        >
          Back to Calendar
        </a>
      </div>

      <h1 style={{ marginBottom: '8px', color: '#000', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
        Import Preview
      </h1>
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#333' }}>
        Upload a CSV or JSON file to preview how events will be imported
      </div>

      {/* File Input */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="file-input"
          style={{
            padding: '10px 16px',
            backgroundColor: '#f5f5f5',
            border: '2px solid #666',
            color: '#000',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-block',
          }}
        >
          Choose File (CSV or JSON)
        </label>
        <input
          id="file-input"
          type="file"
          accept=".csv,.json"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fff',
          border: '2px solid #666',
          color: '#000',
          fontSize: '14px',
        }}>
          Processing file...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#ffebee',
          border: '2px solid #c62828',
          color: '#c62828',
          fontSize: '14px',
          marginBottom: '20px',
        }}>
          Error: {error}
        </div>
      )}

      {/* Preview Table */}
      {preview && (
        <div>
          {/* Summary */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f5f5f5',
            border: '2px solid #666',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#000',
          }}>
            <strong>Summary:</strong>
            <div style={{ marginTop: '8px' }}>
              Total Rows: {preview.summary.totalRows} |
              Events: {preview.summary.eventsDetected} |
              Locations: {preview.summary.locationsDetected} |
              Errors: <span style={{ color: preview.summary.rowsWithErrors > 0 ? '#c62828' : '#000' }}>
                {preview.summary.rowsWithErrors}
              </span> |
              Warnings: <span style={{ color: preview.summary.rowsWithWarnings > 0 ? '#ff8f00' : '#000' }}>
                {preview.summary.rowsWithWarnings}
              </span>
            </div>
          </div>

          {/* Global Signals */}
          {preview.globalSignals.length > 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fff3e0',
              border: '2px solid #ff8f00',
              marginBottom: '16px',
              fontSize: '12px',
            }}>
              <strong>Validation Warnings:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {preview.globalSignals.map((signal, i) => (
                  <li key={i} style={{ marginBottom: '4px', color: '#000' }}>
                    {signal.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#fff',
              border: '2px solid #666',
              fontSize: '12px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
                  <th style={cellStyle}>Row</th>
                  <th style={cellStyle}>Event Name</th>
                  <th style={cellStyle}>Location</th>
                  <th style={cellStyle}>Span Type</th>
                  <th style={cellStyle}>Start Date</th>
                  <th style={cellStyle}>End Date</th>
                  <th style={cellStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <PreviewRow key={row.index} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Import Button */}
          <div style={{ marginTop: '20px' }}>
            <button
              disabled={!canImport}
              style={{
                padding: '12px 24px',
                backgroundColor: canImport ? '#4caf50' : '#ccc',
                border: '2px solid #666',
                color: canImport ? '#fff' : '#666',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: canImport ? 'pointer' : 'not-allowed',
              }}
              onClick={() => {
                if (canImport) {
                  alert('Import functionality coming in next phase');
                }
              }}
            >
              Import Events
              {!canImport && ' (Fix errors first)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ row }: { row: ImportPreviewRow }) {
  const hasError = row.errors.length > 0;
  const hasWarning = row.warnings.length > 0;

  const rowStyle = {
    backgroundColor: hasError ? '#ffebee' : hasWarning ? '#fff3e0' : '#fff',
  };

  const locationName = row.raw.locationName || '';
  const phase = row.raw.phase || '';
  const interpretedPhase = row.interpreted?.phase;

  return (
    <tr style={rowStyle}>
      <td style={cellStyle}>{row.index + 1}</td>
      <td style={cellStyle}>{row.raw.eventName || <em style={{ color: '#999' }}>empty</em>}</td>
      <td style={cellStyle}>{locationName || <em style={{ color: '#999' }}>empty</em>}</td>
      <td style={cellStyle}>
        {interpretedPhase || (
          <span style={{ color: '#c62828' }}>{phase || 'missing'}</span>
        )}
      </td>
      <td style={cellStyle}>
        {row.interpreted?.startDate
          ? row.raw.startDate
          : <span style={{ color: '#c62828' }}>{row.raw.startDate || 'missing'}</span>
        }
      </td>
      <td style={cellStyle}>
        {row.interpreted?.endDate
          ? row.raw.endDate
          : <span style={{ color: '#c62828' }}>{row.raw.endDate || 'missing'}</span>
        }
      </td>
      <td style={cellStyle}>
        {hasError && (
          <div>
            <strong style={{ color: '#c62828' }}>❌ Errors:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
              {row.errors.map((err, i) => (
                <li key={i} style={{ color: '#c62828', fontSize: '11px' }}>{err.message}</li>
              ))}
            </ul>
          </div>
        )}
        {hasWarning && (
          <div>
            <strong style={{ color: '#ff8f00' }}>⚠️ Warnings:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
              {row.warnings.map((warn, i) => (
                <li key={i} style={{ color: '#ff8f00', fontSize: '11px' }}>{warn.message}</li>
              ))}
            </ul>
          </div>
        )}
        {!hasError && !hasWarning && (
          <span style={{ color: '#4caf50' }}>✓ Valid</span>
        )}
      </td>
    </tr>
  );
}

const cellStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '8px',
  textAlign: 'left',
  verticalAlign: 'top',
  color: '#000',
};
