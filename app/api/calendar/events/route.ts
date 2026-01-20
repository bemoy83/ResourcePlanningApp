import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UnifiedEvent } from '../../../../types/calendar';
export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/events
 *
 * Returns unified event aggregates for the Event Calendar.
 * Each event includes:
 * - Core event dates (startDate/endDate represent the EVENT phase)
 * - Assigned locations (fully denormalized)
 * - All event phases (manually-defined phases)
 *
 * Rules:
 * - Only returns ACTIVE events
 * - No inferred data
 * - No auto-generated phases
 * - Empty arrays for missing locations or phases
 */
export async function GET() {
  try {
    // Load all active events with their phases
    const events = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        phases: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    // Load all event-location mappings
    const eventLocations = await prisma.eventLocation.findMany();

    // Load all locations
    const locations = await prisma.location.findMany();

    // Build a map of locationId -> location
    const locationMap = new Map(
      locations.map((loc) => [loc.id, { id: loc.id, name: loc.name }])
    );

    // Build a map of eventId -> locationIds
    const eventLocationMap = new Map<string, string[]>();
    for (const el of eventLocations) {
      if (!eventLocationMap.has(el.eventId)) {
        eventLocationMap.set(el.eventId, []);
      }
      eventLocationMap.get(el.eventId)!.push(el.locationId);
    }

    // Assemble unified event DTOs
    const unifiedEvents: UnifiedEvent[] = events.map((event) => {
      const locationIds = eventLocationMap.get(event.id) || [];
      const eventLocations = locationIds
        .map((locId) => locationMap.get(locId))
        .filter((loc): loc is { id: string; name: string } => loc !== undefined);

      return {
        id: event.id,
        name: event.name,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        locations: eventLocations,
        phases: event.phases.map((phase) => ({
          name: phase.name,
          startDate: phase.startDate.toISOString(),
          endDate: phase.endDate.toISOString(),
        })),
      };
    });

    return NextResponse.json(unifiedEvents);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load calendar events' },
      { status: 500 }
    );
  }
}
