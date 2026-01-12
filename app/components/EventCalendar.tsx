import { UnifiedEvent } from "../../types/calendar";

interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
}

interface EventCalendarProps {
  events: UnifiedEvent[];
  timeline: TimelineLayout;
}

interface CalendarSpan {
  eventId: string;
  locationId: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface EventRow {
  eventId: string;
  eventName: string;
  locationId: string;
  spans: CalendarSpan[];
  row: number;
  rangeStartMs: number;
  rangeEndMs: number;
}

const CELL_BORDER_WIDTH = 1;
const ROW_LAYER_HEIGHT = 24;

export function EventCalendar({ events, timeline }: EventCalendarProps) {
  // Filter events to only those with locations
  const eventsWithLocations = events.filter((e) => e.locations.length > 0);

  // Extract unique locations from all events
  const locationMap = new Map<string, { id: string; name: string }>();
  for (const event of eventsWithLocations) {
    for (const location of event.locations) {
      locationMap.set(location.id, location);
    }
  }
  const locations = Array.from(locationMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Strict rendering: if no locations exist, render nothing
  if (locations.length === 0) {
    return null;
  }

  const dates = timeline.dates;
  const DAY_COL_FULL_WIDTH = timeline.dateColumnWidth;
  const timelineOriginPx = timeline.timelineOriginPx;
  const leftColumns = [{ key: "location", width: timelineOriginPx }];
  const leftColumnsTemplate = leftColumns.map((col) => `${col.width}px`).join(" ");
  const timelineWidth = dates.length * DAY_COL_FULL_WIDTH;
  const scrollWidth = timelineOriginPx + timelineWidth;

  const isEventPhaseName = (name: string) => name.trim().toUpperCase() === "EVENT";

  // Build calendar rows: one row per event-location, spans from phases only
  const locationEventRows: Record<string, EventRow[]> = {};

  for (const location of locations) {
    const eventsInLocation = eventsWithLocations.filter((e) =>
      e.locations.some((loc) => loc.id === location.id)
    );

    const eventRows: EventRow[] = [];
    for (const event of eventsInLocation) {
      const spans: CalendarSpan[] = event.phases.map((phase) => ({
        eventId: event.id,
        locationId: location.id,
        label: isEventPhaseName(phase.name) ? event.name : phase.name,
        startDate: phase.startDate,
        endDate: phase.endDate,
      }));

      if (spans.length === 0) {
        continue;
      }

      spans.sort((a, b) => {
        const startDelta = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        if (startDelta !== 0) return startDelta;
        const endDelta = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        if (endDelta !== 0) return endDelta;
        return a.label.localeCompare(b.label);
      });

      let rangeStart = spans[0].startDate;
      let rangeEnd = spans[0].endDate;
      for (const span of spans) {
        if (span.startDate < rangeStart) {
          rangeStart = span.startDate;
        }
        if (span.endDate > rangeEnd) {
          rangeEnd = span.endDate;
        }
      }

      eventRows.push({
        eventId: event.id,
        eventName: event.name,
        locationId: location.id,
        spans,
        row: 0,
        rangeStartMs: new Date(rangeStart).getTime(),
        rangeEndMs: new Date(rangeEnd).getTime(),
      });
    }

    eventRows.sort((a, b) => {
      const startDelta = a.rangeStartMs - b.rangeStartMs;
      if (startDelta !== 0) return startDelta;
      return a.eventName.localeCompare(b.eventName);
    });

    // Assign rows based on event-level overlap within each location
    const placedRows: { row: number; rangeStartMs: number; rangeEndMs: number }[] = [];
    for (const eventRow of eventRows) {
      let assignedRow = 0;
      let foundRow = false;

      while (!foundRow) {
        const rowHasConflict = placedRows.some((placed) => {
          if (placed.row !== assignedRow) return false;
          return !(eventRow.rangeEndMs < placed.rangeStartMs || eventRow.rangeStartMs > placed.rangeEndMs);
        });

        if (!rowHasConflict) {
          foundRow = true;
        } else {
          assignedRow++;
        }
      }

      eventRow.row = assignedRow;
      placedRows.push({
        row: assignedRow,
        rangeStartMs: eventRow.rangeStartMs,
        rangeEndMs: eventRow.rangeEndMs,
      });
    }

    locationEventRows[location.id] = eventRows;
  }

  // Grid styling
  const gridTemplateColumns = leftColumnsTemplate;
  const cellStyle = {
    border: `${CELL_BORDER_WIDTH}px solid #999`,
    padding: '8px',
    textAlign: 'center' as const,
    fontSize: '11px',
    backgroundColor: '#fff',
    color: '#000',
    boxSizing: 'border-box' as const,
  };

  return (
    <section style={{ minWidth: `${scrollWidth}px` }}>
      {/* Header row with dates */}
      <header style={{
        display: 'grid',
        gridTemplateColumns,
        backgroundColor: '#e0e0e0',
        fontWeight: 'bold',
        border: '2px solid #666',
        position: 'sticky',
        top: 0,
        zIndex: 4,
      }}>
        <div style={{
          ...cellStyle,
          position: 'sticky',
          left: 0,
          zIndex: 3,
          backgroundColor: '#fff',
        }}>Location</div>
        <div style={{
          position: 'absolute',
          left: `${timelineOriginPx}px`,
          top: 0,
          height: '100%',
          width: `${timelineWidth}px`,
        }}>
          {dates.map((date, index) => {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div
                key={date}
                style={{
                  ...cellStyle,
                  position: 'absolute',
                  left: `${index * DAY_COL_FULL_WIDTH}px`,
                  top: 0,
                  width: `${DAY_COL_FULL_WIDTH}px`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{dayName}</div>
                <div style={{ fontSize: '10px' }}>{date}</div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Location groups with event rows stacked only when overlapping */}
      <div style={{ border: '1px solid #666' }}>
        {locations.map((location) => {
          const eventRows = locationEventRows[location.id] || [];

          // Calculate row height based on number of vertical stacks needed
          const maxRows = eventRows.length > 0 ? Math.max(...eventRows.map((sr) => sr.row)) + 1 : 0;
          const rowHeight = Math.max(maxRows, 1) * ROW_LAYER_HEIGHT + 2; // Add 2px for bottom border
          // With box-sizing: border-box, parent's borderBottom (2px) is included in rowHeight
          // Content area (above border) = rowHeight - 2px
          // Cells with borders need height = contentArea to fill it (borders included in height)
          const cellHeight = rowHeight - 2;

          return (
            <div
              key={location.id}
              style={{
                display: 'grid',
                gridTemplateColumns,
                borderBottom: '2px solid #666',
                position: 'relative',
                height: `${rowHeight}px`,
                boxSizing: 'border-box',
              }}
            >
              <div style={{
                ...cellStyle,
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: '11px',
                backgroundColor: '#fff',
                position: 'sticky',
                left: 0,
                zIndex: 3,
                height: `${cellHeight}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}>
                {location.name}
              </div>

              <div style={{
                position: 'absolute',
                left: `${timelineOriginPx}px`,
                top: 0,
                height: `${cellHeight}px`,
                width: `${timelineWidth}px`,
              }}>
                {dates.map((date, index) => (
                  <div
                    key={date}
                    style={{
                      ...cellStyle,
                      position: 'absolute',
                      left: `${index * DAY_COL_FULL_WIDTH}px`,
                      top: 0,
                      width: `${DAY_COL_FULL_WIDTH}px`,
                      height: '100%',
                      backgroundColor: '#fff',
                    }}
                  >
                    —
                  </div>
                ))}

                {/* Calendar spans (phases only) positioned by event row */}
                {eventRows.flatMap((eventRow) =>
                  eventRow.spans.map((span, spanIndex) => {
                    // Normalize DateTime to YYYY-MM-DD format to match dates array
                    const normalizedStart = span.startDate.split('T')[0];
                    const normalizedEnd = span.endDate.split('T')[0];

                    // Find where this span starts and ends in the visible date range
                    const startIndex = dates.indexOf(normalizedStart);
                    const endIndex = dates.indexOf(normalizedEnd);

                    // Skip spans completely outside visible range
                    if (startIndex === -1 && endIndex === -1) return null;

                    // Clamp to visible range
                    const spanStart = Math.max(startIndex, 0);
                    const spanEnd = Math.min(endIndex === -1 ? dates.length - 1 : endIndex, dates.length - 1);
                    const spanLength = spanEnd - spanStart + 1;

                    // Horizontal positioning: same logic for all spans
                    const leftOffset = spanStart * DAY_COL_FULL_WIDTH;
                    const blockWidth = spanLength * DAY_COL_FULL_WIDTH;

                    // Vertical positioning: one row per event-location
                    const topOffset = eventRow.row * ROW_LAYER_HEIGHT;
                    // Calculate span height: if it's the only row, match the cell height; otherwise use layer height
                    const spanHeight = maxRows === 1 ? cellHeight : ROW_LAYER_HEIGHT;

                    return (
                      <div
                        key={`${eventRow.eventId}-${eventRow.locationId}-${spanIndex}-${span.startDate}-${span.endDate}`}
                        style={{
                          position: 'absolute',
                          top: `${topOffset}px`,
                          left: `${leftOffset}px`,
                          width: `${blockWidth}px`,
                          height: `${spanHeight}px`,
                          backgroundColor: '#e0e0e0',
                          border: `${CELL_BORDER_WIDTH}px solid #999`,
                          padding: '8px',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          color: '#000',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {span.label}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
