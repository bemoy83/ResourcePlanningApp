import { useMemo, memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UnifiedEvent } from "../../types/calendar";
import { buildDateFlags, DateFlags } from "../utils/date";

interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  dateMeta?: DateFlags[];
}

interface EventCalendarProps {
  events: UnifiedEvent[];
  timeline: TimelineLayout;
  tooltipsEnabled?: boolean; // Optional prop to control tooltip visibility
}

interface CalendarSpan {
  eventId: string;
  locationId: string;
  label: string;
  startDate: string;
  endDate: string;
  phaseName?: string; // Original phase name for tooltip
}

interface TooltipState {
  visible: boolean;
  content: {
    eventName: string;
    phaseName: string;
    startDate: string;
    endDate: string;
    dayCount: number;
  };
  position: { top: number; left: number };
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

// Tooltip component for event phase information
function EventPhaseTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!tooltip || !tooltip.visible || !mounted) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const tooltipContent = (
    <div
      style={{
        position: 'fixed',
        top: `${tooltip.position.top}px`,
        left: `${tooltip.position.left}px`,
        backgroundColor: '#333',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10000, // Very high z-index to ensure it's above everything
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        maxWidth: '250px',
        lineHeight: '1.5',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #555', paddingBottom: '4px' }}>
        {tooltip.content.eventName}
      </div>
      <div style={{ marginBottom: '2px' }}>
        <strong>Phase:</strong> {tooltip.content.phaseName}
      </div>
      <div style={{ marginBottom: '2px' }}>
        <strong>Dates:</strong> {formatDate(tooltip.content.startDate)} - {formatDate(tooltip.content.endDate)}
      </div>
      <div>
        <strong>Duration:</strong> {tooltip.content.dayCount} {tooltip.content.dayCount === 1 ? 'day' : 'days'}
      </div>
    </div>
  );

  // Render tooltip in a portal to document.body to avoid parent transform issues
  return createPortal(tooltipContent, document.body);
}

// Phase 2.1: Memoize component to prevent unnecessary re-renders
export const EventCalendar = memo(function EventCalendar({ events, timeline, tooltipsEnabled = true }: EventCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Recommended tooltip delay: 500-1000ms (using 700ms as a good middle ground)
  const TOOLTIP_DELAY_MS = 700;
  // Memoize events with locations (Phase 2.1)
  const eventsWithLocations = useMemo(() =>
    events.filter((e) => e.locations.length > 0),
    [events]
  );

  // Memoize locations extraction and sorting (Phase 2.1)
  const locations = useMemo(() => {
    const locationMap = new Map<string, { id: string; name: string }>();
    for (const event of eventsWithLocations) {
      for (const location of event.locations) {
        locationMap.set(location.id, location);
      }
    }
    return Array.from(locationMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [eventsWithLocations]);

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

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(dates);
  }, [dates, timeline.dateMeta]);

  const weekendBackground = "#f7f7f7";
  const holidayBackground = "#ffe7e7";

  // Calculate day count between two dates
  const calculateDayCount = (startDate: string, endDate: string): number => {
    try {
      const start = new Date(startDate.split('T')[0]);
      const end = new Date(endDate.split('T')[0]);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1; // Inclusive of both start and end dates
    } catch {
      return 0;
    }
  };

  // Calculate tooltip position based on cursor coordinates
  const calculateTooltipPosition = (clientX: number, clientY: number) => {
    // Use actual tooltip dimensions if available, otherwise use estimates
    const tooltipWidth = 250; // Approximate tooltip width
    const tooltipHeight = 120; // Approximate tooltip height
    const spacing = 8; // Minimum spacing from viewport edges

    // Start with cursor position (tooltip spawns at cursor)
    let top = clientY;
    let left = clientX;

    // Only adjust if tooltip would actually go off-screen
    // Check right edge
    if (left + tooltipWidth > window.innerWidth - spacing) {
      left = Math.max(spacing, window.innerWidth - tooltipWidth - spacing);
    }

    // Check left edge
    if (left < spacing) {
      left = spacing;
    }

    // Check bottom edge
    if (top + tooltipHeight > window.innerHeight - spacing) {
      top = Math.max(spacing, window.innerHeight - tooltipHeight - spacing);
    }

    // Check top edge
    if (top < spacing) {
      top = spacing;
    }

    return { top, left };
  };

  // Handle mouse enter for tooltip
  const handleSpanMouseEnter = (
    event: React.MouseEvent<HTMLDivElement>,
    eventRow: EventRow,
    span: CalendarSpan
  ) => {
    // Clear any pending hide timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    // If tooltips are disabled, don't show anything
    if (!tooltipsEnabled) {
      return;
    }

    // Clear any existing show timeout
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
    }

    const dayCount = calculateDayCount(span.startDate, span.endDate);
    
    // Determine phase name - if label matches event name, it's the "EVENT" phase
    const phaseName = span.label === eventRow.eventName 
      ? (span.phaseName || 'EVENT')
      : span.label;

    // Capture mouse position at the time of the event
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Delay tooltip appearance to avoid accidental triggers
    tooltipShowTimeoutRef.current = setTimeout(() => {
      const position = calculateTooltipPosition(mouseX, mouseY);
      setTooltip({
        visible: true,
        content: {
          eventName: eventRow.eventName,
          phaseName: phaseName,
          startDate: span.startDate,
          endDate: span.endDate,
          dayCount,
        },
        position,
      });
    }, TOOLTIP_DELAY_MS);
  };

  // Handle mouse move to update tooltip position
  const handleSpanMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    // If tooltips are disabled, do nothing
    if (!tooltipsEnabled) {
      return;
    }

    // Update position if tooltip is already visible
    setTooltip((prevTooltip) => {
      if (!prevTooltip || !prevTooltip.visible) return prevTooltip;
      const position = calculateTooltipPosition(event.clientX, event.clientY);
      return {
        ...prevTooltip,
        position,
      };
    });
  };

  // Handle mouse leave for tooltip
  const handleSpanMouseLeave = () => {
    // Cancel any pending show timeout
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
      tooltipShowTimeoutRef.current = null;
    }

    // Hide tooltip immediately when mouse leaves
    setTooltip(null);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (tooltipShowTimeoutRef.current) {
        clearTimeout(tooltipShowTimeoutRef.current);
      }
    };
  }, []);

  // Clear tooltip when tooltips are disabled
  useEffect(() => {
    if (!tooltipsEnabled) {
      setTooltip(null);
      if (tooltipShowTimeoutRef.current) {
        clearTimeout(tooltipShowTimeoutRef.current);
        tooltipShowTimeoutRef.current = null;
      }
    }
  }, [tooltipsEnabled]);

  // Memoize calendar rows calculation (Phase 2.1) - expensive O(n³) operation
  const locationEventRows: Record<string, EventRow[]> = useMemo(() => {
    const rows: Record<string, EventRow[]> = {};

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
          phaseName: phase.name, // Store original phase name
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

      rows[location.id] = eventRows;
    }

    return rows;
  }, [locations, eventsWithLocations]);

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
    <>
      <EventPhaseTooltip tooltip={tooltip} />
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
            const dateFlags = dateMeta[index];
            const backgroundColor = dateFlags?.isHoliday
              ? holidayBackground
              : dateFlags?.isWeekend
              ? weekendBackground
              : "#fff";
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
                  backgroundColor,
                }}
              >
                {date}
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
                {dates.map((date, index) => {
                  const dateFlags = dateMeta[index];
                  const backgroundColor = dateFlags?.isHoliday
                    ? holidayBackground
                    : dateFlags?.isWeekend
                    ? weekendBackground
                    : "#fff";
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
                        backgroundColor,
                      }}
                    >
                      —
                    </div>
                  );
                })}

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
                          cursor: 'help',
                        }}
                        onMouseEnter={(e) => handleSpanMouseEnter(e, eventRow, span)}
                        onMouseMove={handleSpanMouseMove}
                        onMouseLeave={handleSpanMouseLeave}
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
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when props haven't changed (Phase 2.1)
  return (
    prevProps.events === nextProps.events &&
    prevProps.timeline.dates === nextProps.timeline.dates &&
    prevProps.timeline.dateColumnWidth === nextProps.timeline.dateColumnWidth &&
    prevProps.timeline.timelineOriginPx === nextProps.timeline.timelineOriginPx &&
    prevProps.tooltipsEnabled === nextProps.tooltipsEnabled
  );
});
