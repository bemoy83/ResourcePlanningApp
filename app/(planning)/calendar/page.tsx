"use client";

import { useEffect, useState } from "react";
import { EventCalendar } from "../../components/EventCalendar";

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Location {
  id: string;
  name: string;
}

interface EventLocation {
  id: string;
  eventId: string;
  locationId: string;
}

interface EventWithLocations extends Event {
  locationIds: string[];
  phases?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
}

// Timeline constants (matching planning workspace)
const TIMELINE_COLUMN_WIDTH = 100;
const TIMELINE_ORIGIN_PX = 500;

function computeDateRange(events: EventWithLocations[]): string[] {
  if (events.length === 0) return [];

  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const event of events) {
    if (!minDate || event.startDate < minDate) {
      minDate = event.startDate;
    }
    if (!maxDate || event.endDate > maxDate) {
      maxDate = event.endDate;
    }

    // Include phases
    if (event.phases) {
      for (const phase of event.phases) {
        if (!minDate || phase.startDate < minDate) {
          minDate = phase.startDate;
        }
        if (!maxDate || phase.endDate > maxDate) {
          maxDate = phase.endDate;
        }
      }
    }
  }

  if (!minDate || !maxDate) return [];

  const dates: string[] = [];
  const start = new Date(minDate);
  const end = new Date(maxDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default function CalendarPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [events, setEvents] = useState<EventWithLocations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // Load locations, events, and event-location mappings
        const [locationsRes, eventsRes, eventLocationsRes] = await Promise.all([
          fetch("/api/locations"),
          fetch("/api/events"),
          fetch("/api/event-locations"),
        ]);

        if (!locationsRes.ok || !eventsRes.ok || !eventLocationsRes.ok) {
          throw new Error("Failed to load data");
        }

        const locationsData: Location[] = await locationsRes.json();
        const eventsData: Event[] = await eventsRes.json();
        const eventLocationsData: EventLocation[] = await eventLocationsRes.json();

        // Filter to active events
        const activeEvents = eventsData.filter((e) => e.status === "ACTIVE");

        // Map event IDs to location IDs
        const eventLocationMap = new Map<string, string[]>();
        for (const el of eventLocationsData) {
          if (!eventLocationMap.has(el.eventId)) {
            eventLocationMap.set(el.eventId, []);
          }
          eventLocationMap.get(el.eventId)!.push(el.locationId);
        }

        // Attach location IDs to events
        const eventsWithLocations: EventWithLocations[] = activeEvents.map((event) => ({
          ...event,
          locationIds: eventLocationMap.get(event.id) || [],
        }));

        setLocations(locationsData);
        setEvents(eventsWithLocations);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        padding: "20px",
        backgroundColor: "#fafafa",
        border: "2px solid #666",
        margin: "20px",
        color: "#000",
        fontSize: "16px",
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "20px",
        backgroundColor: "#f5f5f5",
        border: "2px solid #000",
        margin: "20px",
        color: "#000",
        fontSize: "16px",
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "100%", overflowX: "auto", backgroundColor: "#fafafa" }}>
      <div style={{ marginBottom: "12px" }}>
        <a
          href="/planning"
          style={{
            padding: "8px 12px",
            backgroundColor: "#f5f5f5",
            border: "2px solid #666",
            color: "#000",
            textDecoration: "none",
            fontSize: "12px",
            display: "inline-block",
          }}
        >
          Back to Planning Board
        </a>
      </div>

      <h1 style={{ marginBottom: "8px", color: "#000", borderBottom: "2px solid #333", paddingBottom: "8px" }}>
        Event Calendar
      </h1>
      <div style={{ marginBottom: "16px", fontSize: "14px", color: "#333" }}>
        Read-only view of events grouped by location
      </div>

      <EventCalendar
        locations={locations}
        events={events}
        timeline={{
          dates: computeDateRange(events),
          dateColumnWidth: TIMELINE_COLUMN_WIDTH,
          timelineOriginPx: TIMELINE_ORIGIN_PX,
        }}
      />
    </div>
  );
}
