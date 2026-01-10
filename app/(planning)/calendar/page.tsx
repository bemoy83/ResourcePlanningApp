"use client";

import { useEffect, useState } from "react";

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function EventCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events");
        if (!res.ok) {
          throw new Error("Failed to load events");
        }
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (events.length === 0) {
    return <div>No events</div>;
  }

  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const event of events) {
    if (!minDate || event.startDate < minDate) {
      minDate = event.startDate;
    }
    if (!maxDate || event.endDate > maxDate) {
      maxDate = event.endDate;
    }
  }

  const dates: string[] = [];
  if (minDate && maxDate) {
    const start = new Date(minDate);
    const end = new Date(maxDate);
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  const gridTemplateColumns = `200px repeat(${dates.length}, 100px)`;
  const cellStyle = {
    border: "1px solid #ccc",
    padding: "8px",
    textAlign: "center" as const,
  };

  return (
    <div>
      <h1>Event Calendar</h1>
      <section>
        <header style={{ display: "grid", gridTemplateColumns }}>
          <div style={cellStyle}>Event</div>
          {dates.map((date) => (
            <div key={date} style={cellStyle}>
              {date}
            </div>
          ))}
        </header>

        <div>
          {events.map((event) => (
            <div key={event.id} style={{ display: "grid", gridTemplateColumns }}>
              <div style={cellStyle}>{event.name}</div>
              {dates.map((date) => {
                const isInRange = date >= event.startDate && date <= event.endDate;
                return (
                  <div key={date} style={cellStyle}>
                    {isInRange ? "▬" : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
