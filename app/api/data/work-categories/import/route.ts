import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkCategoryImportRow } from "@/types/work-category-import";
export const dynamic = "force-dynamic";

interface ImportExecuteRequest {
  rows: WorkCategoryImportRow[];
}

interface ImportExecuteResponse {
  workCategoriesCreated: number;
  workCategoriesUpdated: number;
  eventsMatched: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportExecuteRequest = await request.json();

    if (!body.rows || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { error: "Request body must contain 'rows' array" },
        { status: 400 }
      );
    }

    if (body.rows.length === 0) {
      return NextResponse.json(
        { error: "Cannot import empty rows array" },
        { status: 400 }
      );
    }

    const normalizedRows = body.rows.map((row) => ({
      eventName: row.eventName.trim(),
      phase: row.phase.trim(),
      workCategoryName: row.workCategoryName.trim(),
      estimatedEffortHours: row.estimatedEffortHours,
    }));

    const eventNames = Array.from(new Set(normalizedRows.map((row) => row.eventName)));
    const events = await prisma.event.findMany({
      where: { name: { in: eventNames } },
      select: { id: true, name: true },
    });

    const eventIdByName = new Map(events.map((event) => [event.name, event.id]));
    const missingEvents = eventNames.filter((name) => !eventIdByName.has(name));

    if (missingEvents.length > 0) {
      return NextResponse.json(
        { error: `Missing events: ${missingEvents.join(", ")}` },
        { status: 400 }
      );
    }

    let workCategoriesCreated = 0;
    let workCategoriesUpdated = 0;

    for (const row of normalizedRows) {
      const eventId = eventIdByName.get(row.eventName);
      if (!eventId) {
        continue;
      }

      const existing = await prisma.workCategory.findFirst({
        where: {
          eventId,
          name: row.workCategoryName,
          phase: row.phase,
        },
      });

      if (existing) {
        await prisma.workCategory.update({
          where: { id: existing.id },
          data: { estimatedEffortHours: row.estimatedEffortHours },
        });
        workCategoriesUpdated += 1;
      } else {
        await prisma.workCategory.create({
          data: {
            eventId,
            name: row.workCategoryName,
            estimatedEffortHours: row.estimatedEffortHours,
            phase: row.phase,
          },
        });
        workCategoriesCreated += 1;
      }
    }

    const response: ImportExecuteResponse = {
      workCategoriesCreated,
      workCategoriesUpdated,
      eventsMatched: events.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Work category import failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during work category import",
      },
      { status: 500 }
    );
  }
}
