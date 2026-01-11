import { prisma } from "@/lib/prisma";
import { ImportWarning, validateImportRows } from "./importEventValidator";
import { ParsedImportRow } from "./importEventParser";

export interface ImportResult {
  importedEvents: number;
  importedPhases: number;
  importedLocations: number;
  warnings: ImportWarning[];
}

interface EventDateRange {
  start: Date;
  end: Date;
}

function groupRowsByEvent(rows: ParsedImportRow[]): Map<string, ParsedImportRow[]> {
  const grouped = new Map<string, ParsedImportRow[]>();

  for (const row of rows) {
    const eventRows = grouped.get(row.eventName);
    if (eventRows) {
      eventRows.push(row);
    } else {
      grouped.set(row.eventName, [row]);
    }
  }

  return grouped;
}

function computeEventDateRange(rows: ParsedImportRow[]): EventDateRange {
  const eventSpans = rows.filter((row) => row.spanType === "EVENT");
  const rangeRows = eventSpans.length > 0 ? eventSpans : rows;

  const start = new Date(Math.min(...rangeRows.map((row) => row.start.getTime())));
  const end = new Date(Math.max(...rangeRows.map((row) => row.end.getTime())));

  return { start, end };
}

export async function importEvents(rows: ParsedImportRow[]): Promise<ImportResult> {
  if (rows.length === 0) {
    return {
      importedEvents: 0,
      importedPhases: 0,
      importedLocations: 0,
      warnings: [],
    };
  }

  const warnings = validateImportRows(rows);
  const grouped = groupRowsByEvent(rows);

  return await prisma.$transaction(async (tx) => {
    const existingLocations = await tx.location.findMany();
    const locationByLowerName = new Map(
      existingLocations.map((location) => [location.name.toLowerCase(), location])
    );

    let importedEvents = 0;
    let importedPhases = 0;
    let importedLocations = 0;

    for (const [eventName, eventRows] of grouped.entries()) {
      const range = computeEventDateRange(eventRows);

      const existingEvent = await tx.event.findFirst({
        where: { name: eventName },
      });

      let eventId: string;
      if (existingEvent) {
        eventId = existingEvent.id;
        await tx.event.update({
          where: { id: existingEvent.id },
          data: {
            startDate: range.start,
            endDate: range.end,
          },
        });
      } else {
        const created = await tx.event.create({
          data: {
            name: eventName,
            startDate: range.start,
            endDate: range.end,
            status: "ACTIVE",
          },
        });
        eventId = created.id;
      }

      importedEvents += 1;

      const locationNames = new Set(eventRows.map((row) => row.location));
      const locationIds: string[] = [];
      for (const name of locationNames) {
        const key = name.toLowerCase();
        const existingLocation = locationByLowerName.get(key);
        if (existingLocation) {
          locationIds.push(existingLocation.id);
          continue;
        }

        const created = await tx.location.create({
          data: {
            name,
          },
        });
        locationByLowerName.set(key, created);
        locationIds.push(created.id);
      }

      await tx.eventLocation.deleteMany({
        where: { eventId },
      });

      const uniqueLocationIds = Array.from(new Set(locationIds));
      if (uniqueLocationIds.length > 0) {
        await tx.eventLocation.createMany({
          data: uniqueLocationIds.map((locationId) => ({
            eventId,
            locationId,
          })),
        });
      }

      importedLocations += uniqueLocationIds.length;

      await tx.eventPhase.deleteMany({
        where: { eventId },
      });

      const phaseRows = eventRows.filter((row) => row.spanType !== "EVENT");
      if (phaseRows.length > 0) {
        await tx.eventPhase.createMany({
          data: phaseRows.map((row) => ({
            eventId,
            name: row.spanType,
            startDate: row.start,
            endDate: row.end,
          })),
        });
      }

      importedPhases += phaseRows.length;
    }

    return {
      importedEvents,
      importedPhases,
      importedLocations,
      warnings,
    };
  });
}
