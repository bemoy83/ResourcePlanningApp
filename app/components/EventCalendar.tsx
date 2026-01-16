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

const CELL_BORDER_WIDTH = 1; // Keep as number for calculations
const ROW_LAYER_HEIGHT = 24; // Keep as number for calculations

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
        backgroundColor: 'var(--text-secondary)',
        color: 'var(--text-inverse)',
        padding: 'var(--space-sm) var(--space-md)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-sm)',
        zIndex: 'var(--z-tooltip)' as any,
        boxShadow: 'var(--shadow-md)',
        pointerEvents: 'none',
        maxWidth: '250px',
        lineHeight: 'var(--line-height-normal)',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-xs)', borderBottom: 'var(--border-width-thin) solid var(--border-strong)', paddingBottom: 'var(--space-xs)' }}>
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

  const dates = timeline.dates;
  const DAY_COL_FULL_WIDTH = timeline.dateColumnWidth;
  const timelineOriginPx = timeline.timelineOriginPx;
  const leftColumns = [{ key: "location", width: timelineOriginPx }];
  const leftColumnsTemplate = leftColumns.map((col) => `${col.width}px`).join(" ");
  const timelineWidth = dates.length * DAY_COL_FULL_WIDTH;
  const scrollWidth = timelineOriginPx + timelineWidth;

  const isEventPhaseName = (name: string) => name.trim().toUpperCase() === "EVENT";

  // Map phase name to CSS token
  const getPhaseBackgroundColor = (phaseName: string | undefined): string => {
    if (!phaseName) {
      return 'var(--calendar-span-bg)';
    }
    const normalizedPhase = phaseName.trim().toUpperCase();
    // Map phase names to CSS tokens (convert to lowercase with hyphens)
    const phaseTokenMap: Record<string, string> = {
      'ASSEMBLY': 'var(--phase-assembly)',
      'MOVE_IN': 'var(--phase-move-in)',
      'EVENT': 'var(--phase-event)',
      'MOVE_OUT': 'var(--phase-move-out)',
      'DISMANTLE': 'var(--phase-dismantle)',
    };
    return phaseTokenMap[normalizedPhase] || 'var(--calendar-span-bg)';
  };

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(dates);
  }, [dates, timeline.dateMeta]);

  // Using CSS variables for theme-aware backgrounds
  const weekendBackground = "var(--calendar-weekend-bg)";
  const holidayBackground = "var(--calendar-holiday-bg)";

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
  const cellStyle: React.CSSProperties = {
    border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: '11px',
    backgroundColor: 'var(--surface-default)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box' as const,
  };

  // Strict rendering: if no locations exist, render nothing.
  // Must be after all hooks to avoid "Rendered fewer hooks than expected".
  if (locations.length === 0) {
    return null;
  }

  return (
    <>
      <EventPhaseTooltip tooltip={tooltip} />
      <section style={{ minWidth: `${scrollWidth}px` }}>
      {/* Header row with dates */}
      <header style={{
        display: 'grid',
        gridTemplateColumns,
          backgroundColor: 'var(--sticky-header-bg)',
        fontWeight: 'var(--font-weight-bold)',
          border: `var(--border-width-medium) solid var(--sticky-header-border)`,
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky-column)' as any,
      }}>
        <div style={{
          ...cellStyle,
          position: 'sticky',
          left: 0,
          zIndex: 'var(--z-sticky-column)' as any,
            backgroundColor: 'var(--sticky-corner-bg)',
            border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
            color: 'var(--sticky-corner-text)',
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
                : "var(--sticky-header-cell-bg)";
            const borderColor = dateFlags?.isHoliday
              ? "var(--calendar-holiday-border)"
              : dateFlags?.isWeekend
              ? "var(--calendar-weekend-border)"
              : "var(--border-primary)";

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
                  border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                  color: 'var(--sticky-header-text)',
                }}
              >
                {date}
              </div>
            );
          })}
        </div>
      </header>

      {/* Location groups with event rows stacked only when overlapping */}
      <div style={{ border: `var(--border-width-thin) solid var(--border-strong)` }}>
        {locations.map((location) => {
          const eventRows = locationEventRows[location.id] || [];

          // Calculate row height based on number of vertical stacks needed
          const maxRows = eventRows.length > 0 ? Math.max(...eventRows.map((sr) => sr.row)) + 1 : 0;
          const rowHeight = Math.max(maxRows, 1) * ROW_LAYER_HEIGHT;

          return (
            <div
              key={location.id}
              style={{
                display: 'grid',
                gridTemplateColumns,
                borderBottom: `1px solid var(--sticky-column-bg)`,
                position: 'relative',
                height: `${rowHeight}px`,
                boxSizing: 'border-box',
              }}
            >
              <div style={{
                ...cellStyle,
                textAlign: 'right',
                fontWeight: 'var(--font-weight-bold)',
                fontSize: '11px',
                backgroundColor: 'var(--sticky-column-bg)',
                position: 'sticky',
                left: 0,
                zIndex: 'var(--z-sticky-column)' as any,
                height: `${rowHeight}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                border: 'none',
                paddingRight: 'var(--space-md)',
                color: 'var(--sticky-column-text)',
              }}>
                {location.name}
              </div>

              <div style={{
                position: 'absolute',
                left: `${timelineOriginPx}px`,
                top: 0,
                height: `${rowHeight}px`,
                width: `${timelineWidth}px`,
              }}>
                {dates.map((date, index) => {
                  const dateFlags = dateMeta[index];
                  const backgroundColor = dateFlags?.isHoliday
                    ? holidayBackground
                    : dateFlags?.isWeekend
                    ? weekendBackground
                    : "var(--surface-default)";
                  const borderColor = dateFlags?.isHoliday
                    ? "var(--calendar-holiday-border)"
                    : dateFlags?.isWeekend
                    ? "var(--calendar-weekend-border)"
                    : "var(--border-primary)";

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
                        border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                      }}
                    >
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
                    // Calculate span height: if it's the only row, match the row height; otherwise use layer height
                    const spanHeight = maxRows === 1 ? rowHeight : ROW_LAYER_HEIGHT;

                    return (
                      <div
                        key={`${eventRow.eventId}-${eventRow.locationId}-${spanIndex}-${span.startDate}-${span.endDate}`}
                        style={{
                          position: 'absolute',
                          top: `${topOffset}px`,
                          left: `${leftOffset}px`,
                          width: `${blockWidth}px`,
                          height: `${spanHeight}px`,
                          backgroundColor: getPhaseBackgroundColor(span.phaseName),
                          border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
                          borderRadius: 'var(--radius-sm)',
                          padding: 'var(--space-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          fontSize: '11px',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                          zIndex: 'var(--z-base)' as any,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: tooltipsEnabled ? 'help' : 'default',
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
