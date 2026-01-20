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

      // Group rows by event name to calculate event-level dates
      const eventGroups = groupRowsByEvent(body.rows);

      // Track created events and locations for reuse within this import
      const eventCache = new Map<string, string>(); // eventName -> eventId
      const locationCache = new Map<string, string>(); // locationName -> locationId

      // Process each event group
      for (const [eventName, eventRows] of eventGroups) {
        // Calculate event date range (min startDate, max endDate)
        const eventStartDate = new Date(
          Math.min(...eventRows.map((r) => new Date(r.startDate).getTime()))
        );
        const eventEndDate = new Date(
          Math.max(...eventRows.map((r) => new Date(r.endDate).getTime()))
        );

        // 1. Events: Create or reuse by name
        let event = await db.event.findFirst({
          where: { name: eventName },
        });

        if (event) {
          // Reuse existing event - update dates to match import
          event = await db.event.update({
            where: { id: event.id },
            data: {
              startDate: eventStartDate,
              endDate: eventEndDate,
              status: "ACTIVE",
            },
          });
          eventsReused++;
        } else {
          // Create new event
          event = await db.event.create({
            data: {
              name: eventName,
              startDate: eventStartDate,
              endDate: eventEndDate,
              status: "ACTIVE",
            },
          });
          eventsCreated++;
        }

        eventCache.set(eventName, event.id);

        // 2. Locations and EventLocation links
        const locationNames = new Set(eventRows.map((r) => r.locationName));

        for (const locationName of locationNames) {
          let locationId = locationCache.get(locationName);

          if (!locationId) {
            // Check if location exists
            let location = await db.location.findUnique({
              where: { name: locationName },
            });

            if (!location) {
              // Create new location
              location = await db.location.create({
                data: { name: locationName },
              });
              locationsCreated++;
            }

            locationId = location.id;
            locationCache.set(locationName, locationId);
          }

          // 3. EventLocation links: Ensure link exists
          const existingLink = await db.eventLocation.findUnique({
            where: {
              eventId_locationId: {
                eventId: event.id,
                locationId: locationId,
              },
            },
          });

          if (!existingLink) {
            await db.eventLocation.create({
              data: {
                eventId: event.id,
                locationId: locationId,
              },
            });
            eventLocationsCreated++;
          }
        }

        // 4. EventPhases: Create if not exact match exists
        for (const row of eventRows) {
          const phaseStartDate = new Date(row.startDate);
          const phaseEndDate = new Date(row.endDate);

          // Check for exact match: same eventId, name, startDate, endDate
          const existingPhase = await db.eventPhase.findFirst({
            where: {
              eventId: event.id,
              name: row.phase,
              startDate: phaseStartDate,
              endDate: phaseEndDate,
            },
          });

          if (!existingPhase) {
            await db.eventPhase.create({
              data: {
                eventId: event.id,
                name: row.phase,
                startDate: phaseStartDate,
                endDate: phaseEndDate,
              },
            });
            phasesCreated++;
          }
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
