export const dynamic = "force-dynamic";

/**
 * POST /api/data/events/import
 *
 * Executes event import by persisting EventImportRow[] into the database.
 * Creates a faithful materialization of imported data with no inference or enforcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EventImportRow } from "@/types/event-import";

/**
 * Request body contract
 */
interface ImportExecuteRequest {
  rows: EventImportRow[];
}

/**
 * Success response contract
 */
interface ImportExecuteResponse {
  eventsCreated: number;
  eventsReused: number;
  locationsCreated: number;
  eventLocationsCreated: number;
  phasesCreated: number;
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

    // Use a non-transactional import to remain compatible with pooled connections.
    const result = await (async () => {
      const db = prisma;
      let eventsCreated = 0;
      let eventsReused = 0;
      let locationsCreated = 0;
      let eventLocationsCreated = 0;
      let phasesCreated = 0;

      const eventGroups = groupRowsByEvent(body.rows);
      const eventNames = Array.from(eventGroups.keys());
      const existingEvents = await db.event.findMany({
        where: { name: { in: eventNames } },
      });
      const eventByName = new Map(existingEvents.map((event) => [event.name, event]));

      const locationNames = Array.from(new Set(body.rows.map((row) => row.locationName)));
      const existingLocations = await db.location.findMany({
        where: { name: { in: locationNames } },
        select: { id: true, name: true },
      });
      const locationByName = new Map(existingLocations.map((location) => [location.name, location.id]));

      const missingLocationNames = locationNames.filter((name) => !locationByName.has(name));
      if (missingLocationNames.length > 0) {
        const created = await db.location.createMany({
          data: missingLocationNames.map((name) => ({ name })),
          skipDuplicates: true,
        });
        locationsCreated += created.count;
        const createdLocations = await db.location.findMany({
          where: { name: { in: missingLocationNames } },
          select: { id: true, name: true },
        });
        for (const location of createdLocations) {
          locationByName.set(location.name, location.id);
        }
      }

      for (const [eventName, eventRows] of eventGroups) {
        const eventStartDate = new Date(
          Math.min(...eventRows.map((row) => new Date(row.startDate).getTime()))
        );
        const eventEndDate = new Date(
          Math.max(...eventRows.map((row) => new Date(row.endDate).getTime()))
        );

        let event = eventByName.get(eventName);
        if (event) {
          const startChanged = event.startDate.getTime() !== eventStartDate.getTime();
          const endChanged = event.endDate.getTime() !== eventEndDate.getTime();
          const statusChanged = event.status !== "ACTIVE";
          if (startChanged || endChanged || statusChanged) {
            event = await db.event.update({
              where: { id: event.id },
              data: {
                startDate: eventStartDate,
                endDate: eventEndDate,
                status: "ACTIVE",
              },
            });
          }
          eventsReused++;
        } else {
          event = await db.event.create({
            data: {
              name: eventName,
              startDate: eventStartDate,
              endDate: eventEndDate,
              status: "ACTIVE",
            },
          });
          eventsCreated++;
          eventByName.set(eventName, event);
        }

        const eventLocationNames = Array.from(new Set(eventRows.map((row) => row.locationName)));
        const locationIds = eventLocationNames
          .map((name) => locationByName.get(name))
          .filter((id): id is string => Boolean(id));

        if (locationIds.length > 0) {
          const existingLinks = await db.eventLocation.findMany({
            where: {
              eventId: event.id,
              locationId: { in: locationIds },
            },
            select: { locationId: true },
          });
          const existingLocationIds = new Set(existingLinks.map((link) => link.locationId));
          const missingLinks = locationIds
            .filter((locationId) => !existingLocationIds.has(locationId))
            .map((locationId) => ({
              eventId: event.id,
              locationId,
            }));

          if (missingLinks.length > 0) {
            const createdLinks = await db.eventLocation.createMany({
              data: missingLinks,
              skipDuplicates: true,
            });
            eventLocationsCreated += createdLinks.count;
          }
        }

        const phasesByKey = new Map<string, { name: string; startDate: string; endDate: string }>();
        for (const row of eventRows) {
          const key = buildPhaseKey(row.phase, row.startDate, row.endDate);
          phasesByKey.set(key, { name: row.phase, startDate: row.startDate, endDate: row.endDate });
        }

        const existingPhases = await db.eventPhase.findMany({
          where: { eventId: event.id },
          select: { name: true, startDate: true, endDate: true },
        });
        const existingPhaseKeys = new Set(
          existingPhases.map((phase) =>
            buildPhaseKey(
              phase.name,
              formatDateKey(phase.startDate),
              formatDateKey(phase.endDate)
            )
          )
        );

        const missingPhases: Array<{ eventId: string; name: string; startDate: Date; endDate: Date }> = [];
        for (const phase of phasesByKey.values()) {
          const key = buildPhaseKey(phase.name, phase.startDate, phase.endDate);
          if (existingPhaseKeys.has(key)) {
            continue;
          }
          missingPhases.push({
            eventId: event.id,
            name: phase.name,
            startDate: new Date(phase.startDate),
            endDate: new Date(phase.endDate),
          });
        }

        if (missingPhases.length > 0) {
          const createdPhases = await db.eventPhase.createMany({
            data: missingPhases,
            skipDuplicates: true,
          });
          phasesCreated += createdPhases.count;
        }
      }

      return {
        eventsCreated,
        eventsReused,
        locationsCreated,
        eventLocationsCreated,
        phasesCreated,
      };
    })();

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Import execution failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during import execution",
      },
      { status: 500 }
    );
  }
}

/**
 * Group import rows by event name
 */
function groupRowsByEvent(
  rows: EventImportRow[]
): Map<string, EventImportRow[]> {
  const groups = new Map<string, EventImportRow[]>();

  for (const row of rows) {
    if (!groups.has(row.eventName)) {
      groups.set(row.eventName, []);
    }
    groups.get(row.eventName)!.push(row);
  }

  return groups;
}

function buildPhaseKey(phase: string, startDate: string, endDate: string): string {
  return `${phase}::${startDate}::${endDate}`;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
