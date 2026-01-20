import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '../../../../lib/csv-parser';
import { interpretImportRows } from '../../../../lib/import-interpreter';
import { ImportPreviewResponse } from '../../../../types/event-import';
export const dynamic = "force-dynamic";

/**
 * POST /api/import/preview
 *
 * Preview import file without persisting to database
 *
 * Accepts:
 * - CSV text (text/csv)
 * - JSON array (application/json)
 *
 * Returns:
 * - ImportPreviewResponse with interpreted rows and validation signals
 *
 * Does NOT write to Prisma.
 * Returns HTTP 200 even if rows contain errors.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Reject .xlsx files
    if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        contentType.includes('application/vnd.ms-excel')) {
      return NextResponse.json(
        { error: 'Excel files (.xlsx, .xls) are not supported. Please upload CSV or JSON files.' },
        { status: 400 }
      );
    }

    let rawRows: Record<string, string>[];

    // Handle multipart form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Check file extension
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return NextResponse.json(
          { error: 'Excel files (.xlsx, .xls) are not supported. Please upload CSV or JSON files.' },
          { status: 400 }
        );
      }

      const fileText = await file.text();

      // Parse based on file type
      if (fileName.endsWith('.json')) {
        try {
          rawRows = JSON.parse(fileText);
          if (!Array.isArray(rawRows)) {
            return NextResponse.json(
              { error: 'JSON file must contain an array of objects' },
              { status: 400 }
            );
          }
        } catch (err) {
          return NextResponse.json(
            { error: 'Invalid JSON file' },
            { status: 400 }
          );
        }
      } else {
        // Assume CSV
        rawRows = parseCSV(fileText);
      }
    }
    // Handle raw CSV text
    else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      const csvText = await request.text();
      rawRows = parseCSV(csvText);
    }
    // Handle JSON
    else if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      if (!Array.isArray(jsonData)) {
        return NextResponse.json(
          { error: 'JSON must be an array of objects' },
          { status: 400 }
        );
      }
      rawRows = jsonData;
    }
    // Unknown content type
    else {
      return NextResponse.json(
        { error: 'Unsupported content type. Please send CSV (text/csv) or JSON (application/json)' },
        { status: 400 }
      );
    }

    // Interpret rows
    const preview: ImportPreviewResponse = interpretImportRows(rawRows);

    // Return preview (HTTP 200 even if rows have errors)
    return NextResponse.json(preview);

  } catch (error) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview import' },
      { status: 500 }
    );
  }
}
