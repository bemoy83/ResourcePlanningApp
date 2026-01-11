import { NextRequest, NextResponse } from "next/server";
import { ImportParseError, parseImportRequest } from "@/modules/events/services/importEventParser";
import { importEvents } from "@/modules/events/services/importEventService";

export async function POST(request: NextRequest) {
  try {
    const rows = await parseImportRequest(request);
    const result = await importEvents(rows);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ImportParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import events" },
      { status: 500 }
    );
  }
}
