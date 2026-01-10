interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  locationIds: string[];
  phases?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
}

interface Location {
  id: string;
  name: string;
}

interface EventCalendarProps {
  locations: Location[];
  events: Event[];
}

// Unified calendar span (event or phase)
interface CalendarSpan {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isPhase: boolean;
}

const LOCATION_COL_WIDTH = 200;
const DAY_COL_WIDTH = 80;
const CELL_BORDER_WIDTH = 1;
const DAY_COL_FULL_WIDTH = DAY_COL_WIDTH;
const ROW_LAYER_HEIGHT = 40;

export function EventCalendar({ locations, events }: EventCalendarProps) {
  if (locations.length === 0) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#fafafa',
        border: '2px solid #666',
        color: '#000',
      }}>
        No locations to display
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#fafafa',
        border: '2px solid #666',
        color: '#000',
      }}>
        No events to display
      </div>
    );
  }

  // Calculate date range across all events and phases
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const event of events) {
    // Check event dates
    if (!minDate || event.startDate < minDate) {
      minDate = event.startDate;
    }
    if (!maxDate || event.endDate > maxDate) {
      maxDate = event.endDate;
    }

    // Check phase dates
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

  if (!minDate || !maxDate) {
    return <div>Invalid date range</div>;
  }

  // Generate all dates in range
  const dates: string[] = [];
  const start = new Date(minDate);
  const end = new Date(maxDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // Build calendar spans: events + phases as peer spans
  const locationSpanRows: Record<string, { span: CalendarSpan; row: number }[]> = {};

  for (const location of locations) {
    const eventsInLocation = events.filter((e) => e.locationIds.includes(location.id));

    // Collect all spans (events + their phases) for this location
    const allSpans: CalendarSpan[] = [];
    for (const event of eventsInLocation) {
      // Add event itself as a span
      allSpans.push({
        id: event.id,
        label: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        isPhase: false,
      });

      // Add event phases as peer spans
      if (event.phases) {
        for (const phase of event.phases) {
          allSpans.push({
            id: phase.id,
            label: phase.name,
            startDate: phase.startDate,
            endDate: phase.endDate,
            isPhase: true,
          });
        }
      }
    }

    // Apply overlap detection to all spans uniformly
    const spanRows: { span: CalendarSpan; row: number }[] = [];
    for (const span of allSpans) {
      let assignedRow = 0;
      let foundRow = false;

      while (!foundRow) {
        const rowHasConflict = spanRows.some((sr) => {
          if (sr.row !== assignedRow) return false;

          const existing = sr.span;
          const spanStart = new Date(span.startDate);
          const spanEnd = new Date(span.endDate);
          const existingStart = new Date(existing.startDate);
          const existingEnd = new Date(existing.endDate);

          return !(spanEnd < existingStart || spanStart > existingEnd);
        });

        if (!rowHasConflict) {
          foundRow = true;
        } else {
          assignedRow++;
        }
      }

      spanRows.push({ span, row: assignedRow });
    }

    locationSpanRows[location.id] = spanRows;
  }

  // Grid styling
  const gridTemplateColumns = `${LOCATION_COL_WIDTH}px repeat(${dates.length}, ${DAY_COL_FULL_WIDTH}px)`;
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
    <section>
      <div style={{
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        border: '2px solid #666',
        fontSize: '12px',
        color: '#000',
      }}>
        <strong>Event Calendar:</strong> Read-only view of events grouped by location. Overlapping events are stacked within each location.
      </div>

      {/* Header row with dates */}
      <header style={{
        display: 'grid',
        gridTemplateColumns,
        backgroundColor: '#e0e0e0',
        fontWeight: 'bold',
        border: '2px solid #666',
      }}>
        <div style={cellStyle}>Location</div>
        {dates.map((date) => (
          <div key={date} style={cellStyle}>
            {date}
          </div>
        ))}
      </header>

      {/* Location rows - one row per location, spans stacked vertically within */}
      <div style={{ border: '1px solid #666' }}>
        {locations.map((location) => {
          const spanRows = locationSpanRows[location.id] || [];

          // Calculate row height based on number of vertical stacks needed
          const maxRows = spanRows.length > 0 ? Math.max(...spanRows.map((sr) => sr.row)) + 1 : 0;
          const rowHeight = Math.max(maxRows, 1) * ROW_LAYER_HEIGHT;

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
              {/* Location name column */}
              <div style={{
                ...cellStyle,
                textAlign: 'left',
                fontWeight: 'bold',
                fontSize: '12px',
                backgroundColor: '#f5f5f5',
              }}>
                {location.name}
              </div>

              {/* Date columns - empty cells for grid structure */}
              {dates.map((date) => (
                <div
                  key={date}
                  style={{
                    ...cellStyle,
                    backgroundColor: '#fff',
                  }}
                >
                  —
                </div>
              ))}

              {/* Calendar spans (events + phases) positioned as peers */}
              {spanRows.map((sr) => {
                // Normalize DateTime to YYYY-MM-DD format to match dates array
                const normalizedStart = sr.span.startDate.split('T')[0];
                const normalizedEnd = sr.span.endDate.split('T')[0];

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
                const leftOffset = LOCATION_COL_WIDTH + (spanStart * DAY_COL_FULL_WIDTH);
                const blockWidth = spanLength * DAY_COL_FULL_WIDTH;

                // Vertical positioning: uniform stacking for all spans
                const topOffset = sr.row * ROW_LAYER_HEIGHT;

                return (
                  <div
                    key={sr.span.id}
                    style={{
                      position: 'absolute',
                      top: `${topOffset}px`,
                      left: `${leftOffset}px`,
                      width: `${blockWidth}px`,
                      height: `${ROW_LAYER_HEIGHT}px`,
                      backgroundColor: sr.span.isPhase ? '#d0d0d0' : '#e0e0e0',
                      border: `${CELL_BORDER_WIDTH}px solid #999`,
                      padding: '8px 12px',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      color: '#000',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                      zIndex: 1,
                    }}
                  >
                    {sr.span.label}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#f5f5f5',
        border: '2px solid #666',
        fontSize: '11px',
        color: '#000',
      }}>
        <strong>About this view:</strong> Each location is shown as a single row. Events and event phases are displayed as peer horizontal spans across dates.
        Overlapping spans are stacked vertically within the same row. This is a read-only view for understanding event and phase placement across locations and time.
      </div>
    </section>
  );
}
