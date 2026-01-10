"use client";

import { useEffect, useState } from "react";

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface EventSpan {
  eventId: string;
  eventName: string;
  rowIndex: number;     // location row index
  startIndex: number;   // date index
  endIndex: number;     // date index
}

const LOCATIONS = ["Hall A", "Hall B", "Hall C", "Hall D", "Hall E"];

/**
 * UI-ONLY, EPHEMERAL EVENT → LOCATION ASSIGNMENT
 * One event may occupy multiple locations
 */
const EVENT_LOCATION_MAP: Record<string, string[]> = {
  // Spring Trade Fair 2026
  "3c3e9b1a-b222-4d4b-9dce-8755ff3b1f76": ["Hall A", "Hall B"],

  // Autumn Trade Fair 2026
  "ffb740fa-8d7d-4653-acdd-4515d21645ab": ["Hall B"],

  // Winter Expo 2026
  "33ef047b-c632-468f-958d-1981bab3e97c": ["Hall C"],
};

export default function LocationCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to load events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setIsLoading(false);
      }
    }

    loadEvents();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (events.length === 0) return <div>No events</div>;

  // ─────────────────────────────────────────────
  // Shared date axis
  // ─────────────────────────────────────────────
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const e of events) {
    if (!minDate || e.startDate < minDate) minDate = e.startDate;
    if (!maxDate || e.endDate > maxDate) maxDate = e.endDate;
  }

  const dates: string[] = [];
  if (minDate && maxDate) {
    const cur = new Date(minDate);
    const end = new Date(maxDate);
    while (cur <= end) {
      dates.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
  }

  function eventOccupiesLocation(event: Event, location: string): boolean {
    const locations = EVENT_LOCATION_MAP[event.id];
    if (!locations) return false;
    return locations.includes(location);
  }

  // ─────────────────────────────────────────────
  // Build merged spans for ALL rows (single grid)
  // ─────────────────────────────────────────────
  const spans: EventSpan[] = [];

  LOCATIONS.forEach((location, rowIndex) => {
    let currentEvent: Event | null = null;
    let startIndex: number | null = null;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const occupyingEvent = events.find(
        (e) =>
          eventOccupiesLocation(e, location) &&
          date >= e.startDate &&
          date <= e.endDate
      );

      if (occupyingEvent && currentEvent && occupyingEvent.id === currentEvent.id) {
        continue;
      }

      if (currentEvent && startIndex !== null) {
        spans.push({
          eventId: currentEvent.id,
          eventName: currentEvent.name,
          rowIndex,
          startIndex,
          endIndex: i - 1,
        });
      }

      if (occupyingEvent) {
        currentEvent = occupyingEvent;
        startIndex = i;
      } else {
        currentEvent = null;
        startIndex = null;
      }
    }

    if (currentEvent && startIndex !== null) {
      spans.push({
        eventId: currentEvent.id,
        eventName: currentEvent.name,
        rowIndex,
        startIndex,
        endIndex: dates.length - 1,
      });
    }
  });

  // ─────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────
  const gridTemplateColumns = `150px repeat(${dates.length}, 100px)`;
  const cellStyle = {
    border: "1px solid #ccc",
    padding: "6px",
    textAlign: "center" as const,
  };

  return (
    <div>
      <h1>Location Calendar</h1>
      <p>Read-only UI proof — locations assigned ephemerally</p>

      {/* SINGLE GRID CONTAINER */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          gridAutoRows: "40px",
        }}
      >
        {/* Header row */}
        <div
          style={{
            ...cellStyle,
            gridColumn: "1 / 2",
            gridRow: 1,
          }}
        >
          Location
        </div>
        {dates.map((d, i) => (
          <div
            key={d}
            style={{
              ...cellStyle,
              gridColumn: `${i + 2} / ${i + 3}`,
              gridRow: 1,
            }}
          >
            {d}
          </div>
        ))}

        {/* Location rows */}
        {LOCATIONS.map((location, rowIndex) => (
          <>
            <div
              key={`${location}-label`}
              style={{
                ...cellStyle,
                gridColumn: "1 / 2",
                gridRow: rowIndex + 2,
              }}
            >
              {location}
            </div>
            {dates.map((_, i) => (
              <div
                key={`${location}-${i}`}
                style={{
                  ...cellStyle,
                  gridColumn: `${i + 2} / ${i + 3}`,
                  gridRow: rowIndex + 2,
                }}
              />
            ))}
          </>
        ))}

        {/* Merged spans overlay */}
        {spans.map((span) => (
          <div
            key={`${span.eventId}-${span.rowIndex}-${span.startIndex}`}
            style={{
              ...cellStyle,
              gridRow: span.rowIndex + 2,
              gridColumn: `${span.startIndex + 2} / ${span.endIndex + 3}`,
              background: "#f5f5f5",
              fontWeight: 500,
            }}
          >
            {span.eventName}
          </div>
        ))}
      </div>
    </div>
  );
}
