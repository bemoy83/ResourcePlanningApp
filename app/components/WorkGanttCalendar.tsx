import { useMemo, memo, useState, useRef, useEffect } from "react";
import { buildDateFlags, DateFlags } from "../utils/date";
import { getHolidayDatesForRange } from "../utils/holidays";
import { Tooltip, TooltipState } from "./tooltip";
import {
  groupWorkCategoriesByEvent,
  WorkGanttEventRow,
  Event,
  WorkCategory,
  Allocation,
  AllocationSpan,
} from "./workGanttUtils";

interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  dateMeta?: DateFlags[];
}

interface WorkGanttCalendarProps {
  events: Event[];
  workCategories: WorkCategory[];
  allocations: Allocation[];
  timeline: TimelineLayout;
  tooltipsEnabled?: boolean;
}

const ROW_LAYER_HEIGHT = 24;

// Map phase name to CSS token
const getPhaseBackgroundColor = (phaseName: string | undefined): string => {
  if (!phaseName) {
    return 'var(--calendar-span-bg)';
  }
  const normalizedPhase = phaseName.trim().toUpperCase();
  const phaseTokenMap: Record<string, string> = {
    'ASSEMBLY': 'var(--phase-assembly)',
    'MOVE_IN': 'var(--phase-move-in)',
    'EVENT': 'var(--phase-event)',
    'MOVE_OUT': 'var(--phase-move-out)',
    'DISMANTLE': 'var(--phase-dismantle)',
  };
  return phaseTokenMap[normalizedPhase] || 'var(--calendar-span-bg)';
};

/**
 * Format phase name for display by replacing underscores with spaces.
 */
function formatPhaseNameForDisplay(phaseName: string): string {
  return phaseName.replace(/_/g, ' ');
}

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
  const tooltipWidth = 250;
  const tooltipHeight = 140;
  const spacing = 8;

  let top = clientY;
  let left = clientX;

  // Adjust if tooltip would go off-screen
  if (left + tooltipWidth > window.innerWidth - spacing) {
    left = Math.max(spacing, window.innerWidth - tooltipWidth - spacing);
  }
  if (left < spacing) {
    left = spacing;
  }
  if (top + tooltipHeight > window.innerHeight - spacing) {
    top = Math.max(spacing, window.innerHeight - tooltipHeight - spacing);
  }
  if (top < spacing) {
    top = spacing;
  }

  return { top, left };
};

export const WorkGanttCalendar = memo(function WorkGanttCalendar({
  events,
  workCategories,
  allocations,
  timeline,
  tooltipsEnabled = true,
}: WorkGanttCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track which events are expanded (default: all expanded)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set(events.map(e => e.id)));

  const TOOLTIP_DELAY_MS = 700;

  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const dates = timeline.dates;
  const DAY_COL_FULL_WIDTH = timeline.dateColumnWidth;
  const timelineOriginPx = timeline.timelineOriginPx;
  const leftColumns = [{ key: "event", width: timelineOriginPx }];
  const leftColumnsTemplate = leftColumns.map((col) => `${col.width}px`).join(" ");
  const timelineWidth = dates.length * DAY_COL_FULL_WIDTH;
  const scrollWidth = timelineOriginPx + timelineWidth;

  // Get holiday dates to properly mark them in dateMeta
  const holidayDates = useMemo(() => getHolidayDatesForRange(dates), [dates]);

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(dates, holidayDates);
  }, [dates, holidayDates, timeline.dateMeta]);

  const weekendBackground = "var(--calendar-weekend-bg)";
  const holidayBackground = "var(--calendar-holiday-bg)";

  // Group work categories by event and build rows
  const eventRowsMap = useMemo(() => {
    return groupWorkCategoriesByEvent(events, workCategories, allocations);
  }, [events, workCategories, allocations]);

  // Create ordered event list with rows
  const eventGroups = useMemo(() => {
    return events
      .map(event => ({
        event,
        rows: eventRowsMap[event.id] || [],
      }))
      .filter(group => group.rows.length > 0)
      .sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));
  }, [events, eventRowsMap]);

  // Update expanded events when events change
  useEffect(() => {
    setExpandedEventIds(prev => {
      const newSet = new Set(prev);
      // Add any new events
      events.forEach(e => {
        if (!prev.has(e.id)) {
          newSet.add(e.id);
        }
      });
      // Remove events that no longer exist
      const currentEventIds = new Set(events.map(e => e.id));
      Array.from(prev).forEach(id => {
        if (!currentEventIds.has(id)) {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  }, [events]);

  // Handle mouse enter for tooltip
  const handleSpanMouseEnter = (
    event: React.MouseEvent<HTMLDivElement>,
    eventRow: WorkGanttEventRow,
    span: AllocationSpan
  ) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    if (!tooltipsEnabled) {
      return;
    }

    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
    }

    const dayCount = calculateDayCount(span.startDate, span.endDate);
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    tooltipShowTimeoutRef.current = setTimeout(() => {
      const position = calculateTooltipPosition(mouseX, mouseY);
      setTooltip({
        visible: true,
        content: {
          eventName: eventRow.eventName,
          phaseName: span.phase
            ? `${formatPhaseNameForDisplay(span.phase)} (${span.totalHours}h)`
            : `Work (${span.totalHours}h)`,
          locationName: eventRow.workCategoryName,
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
    if (!tooltipsEnabled) {
      return;
    }

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
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
      tooltipShowTimeoutRef.current = null;
    }
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

  const cellStyle: React.CSSProperties = {
    border: 'var(--border-width-thin) solid var(--border-primary)',
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: '11px',
    backgroundColor: 'var(--surface-default)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box' as const,
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    minHeight: 'var(--row-min-height)',
  };

  // Return nothing if no events with allocations
  if (eventGroups.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-xl)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-md)',
      }}>
        No work allocations to display. Add allocations to see the gantt view.
      </div>
    );
  }

  return (
    <>
      <Tooltip tooltip={tooltip} />
      <section style={{ minWidth: `${scrollWidth}px` }}>
        {/* Header row with dates */}
        <header style={{
          display: 'grid',
          gridTemplateColumns: leftColumnsTemplate,
          backgroundColor: 'var(--sticky-header-bg)',
          fontWeight: 'var(--font-weight-bold)',
          border: `var(--border-width-medium) solid var(--sticky-header-border)`,
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky-column)' as any,
          minHeight: 'var(--row-min-height)',
        }}>
          <div style={{
            ...headerCellStyle,
            position: 'sticky',
            left: 0,
            zIndex: 'var(--z-sticky-column)' as any,
            backgroundColor: 'var(--sticky-corner-bg)',
            border: 'var(--border-width-thin) solid var(--sticky-corner-border)',
            color: 'var(--sticky-corner-text)',
          }}>Event / Work Category</div>
          <div style={{
            position: 'absolute',
            left: `${timelineOriginPx}px`,
            top: 0,
            height: '100%',
            width: `${timelineWidth}px`,
          }}>
            {dates.map((date, index) => {
              const dateFlags = dateMeta[index];
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const day = dateObj.getDate();
              const isToday = dateFlags?.isToday ?? false;

              const backgroundColor = isToday
                ? 'var(--today-header-bg)'
                : dateFlags?.isHoliday
                  ? holidayBackground
                  : dateFlags?.isWeekend
                    ? weekendBackground
                    : "var(--sticky-header-bg)";

              return (
                <div
                  key={date}
                  style={{
                    ...headerCellStyle,
                    position: 'absolute',
                    left: `${index * DAY_COL_FULL_WIDTH}px`,
                    top: 0,
                    width: `${DAY_COL_FULL_WIDTH}px`,
                    height: '100%',
                    backgroundColor,
                    border: `var(--border-width-thin) solid var(--sticky-header-border)`,
                    color: isToday ? 'var(--today-header-text)' : 'var(--sticky-header-text)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-medium)',
                    color: isToday ? 'var(--today-header-text)' : 'var(--text-tertiary)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.02em',
                  }}>
                    {dayName}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: isToday ? 'var(--today-header-text)' : 'var(--sticky-header-text)',
                  }}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        {/* Event groups with work category rows */}
        <div style={{ border: `var(--border-width-thin) solid var(--border-strong)` }}>
          {eventGroups.map(({ event, rows }) => {
            // Calculate total height needed for this event group
            const maxRows = rows.length > 0 ? Math.max(...rows.map((r) => r.row)) + 1 : 0;
            const groupHeight = Math.max(maxRows, 1) * ROW_LAYER_HEIGHT;
            const isExpanded = expandedEventIds.has(event.id);

            // Calculate event summary for collapsed view
            let eventSummary: { minDate: string; maxDate: string; totalHours: number } | null = null;
            if (!isExpanded && rows.length > 0) {
              let minDate: string | null = null;
              let maxDate: string | null = null;
              let totalHours = 0;

              rows.forEach(row => {
                row.spans.forEach(span => {
                  const spanStart = span.startDate.split('T')[0];
                  const spanEnd = span.endDate.split('T')[0];

                  if (!minDate || spanStart < minDate) {
                    minDate = spanStart;
                  }
                  if (!maxDate || spanEnd > maxDate) {
                    maxDate = spanEnd;
                  }
                  totalHours += span.totalHours;
                });
              });

              if (minDate && maxDate) {
                eventSummary = { minDate, maxDate, totalHours };
              }
            }

            return (
              <div key={event.id}>
                {/* Event header row */}
                <button
                  onClick={() => toggleEventExpansion(event.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: leftColumnsTemplate,
                    backgroundColor: 'transparent',
                    fontWeight: 'var(--font-weight-bold)',
                    fontSize: '12px',
                    position: 'relative',
                    height: `${ROW_LAYER_HEIGHT}px`,
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div style={{
                    textAlign: 'left',
                    padding: 0,
                    paddingLeft: 'var(--space-md)',
                    backgroundColor: 'var(--sticky-column-bg)',
                    position: 'sticky',
                    left: 0,
                    zIndex: 'var(--z-sticky-column)' as any,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    color: 'var(--text-primary)',
                    border: 'var(--border-width-thin) solid var(--sticky-column-bg)',
                    fontSize: '11px',
                    boxSizing: 'border-box',
                    height: '100%',
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'transform var(--transition-fast)',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                    }}>
                      ▸
                    </span>
                    {event.name}
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--text-tertiary)',
                      fontWeight: 'var(--font-weight-normal)',
                      marginLeft: 'var(--space-xs)',
                    }}>
                      ({rows.length} {rows.length === 1 ? 'category' : 'categories'})
                    </span>
                  </div>

                  {/* Timeline area with background and gridlines (always visible) */}
                  <div style={{
                    position: 'absolute',
                    left: `${timelineOriginPx}px`,
                    top: 0,
                    height: '100%',
                    width: `${timelineWidth}px`,
                    backgroundColor: 'var(--sticky-column-bg)',
                    pointerEvents: 'none',
                  }}>
                    {/* Vertical gridlines for date columns */}
                    {dates.map((date, index) => {
                      return (
                        <div
                          key={date}
                          style={{
                            position: 'absolute',
                            left: `${index * DAY_COL_FULL_WIDTH}px`,
                            top: 0,
                            width: `${DAY_COL_FULL_WIDTH}px`,
                            height: '100%',
                            borderRight: '1px solid var(--border-primary)',
                            boxSizing: 'border-box',
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Summary bar when collapsed */}
                  {!isExpanded && eventSummary && (
                    <div style={{
                      position: 'absolute',
                      left: `${timelineOriginPx}px`,
                      top: 0,
                      height: '100%',
                      width: `${timelineWidth}px`,
                      pointerEvents: 'none',
                    }}>
                      {(() => {
                        const startIndex = dates.indexOf(eventSummary.minDate);
                        const endIndex = dates.indexOf(eventSummary.maxDate);

                        // Skip if dates are outside visible range
                        if (startIndex === -1 && endIndex === -1) return null;

                        // Clamp to visible range
                        const clampedStart = Math.max(startIndex === -1 ? 0 : startIndex, 0);
                        const clampedEnd = Math.min(endIndex === -1 ? dates.length - 1 : endIndex, dates.length - 1);
                        const spanLength = clampedEnd - clampedStart + 1;

                        const leftOffset = clampedStart * DAY_COL_FULL_WIDTH;
                        const blockWidth = spanLength * DAY_COL_FULL_WIDTH;

                        return (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              left: `${leftOffset}px`,
                              width: `${blockWidth}px`,
                              height: '20px',
                              backgroundColor: 'var(--text-tertiary)',
                              opacity: 0.3,
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'var(--font-weight-bold)',
                              color: 'var(--text-primary)',
                              pointerEvents: 'auto',
                              zIndex: 1,
                            }}
                            title={`${eventSummary.minDate} to ${eventSummary.maxDate}: ${eventSummary.totalHours}h total`}
                          >
                            {eventSummary.totalHours}h
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </button>

                {/* Work category rows for this event */}
                {isExpanded && rows.map((workCategoryRow) => {
                  const rowHeight = ROW_LAYER_HEIGHT;

                  return (
                    <div
                      key={workCategoryRow.workCategoryId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: leftColumnsTemplate,
                        borderBottom: `1px solid var(--border-primary)`,
                        position: 'relative',
                        height: `${ROW_LAYER_HEIGHT}px`,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{
                        ...cellStyle,
                        textAlign: 'left',
                        paddingLeft: 'var(--space-xl)',
                        fontSize: '11px',
                        backgroundColor: 'var(--sticky-column-bg)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 'var(--z-sticky-column)' as any,
                        height: `${ROW_LAYER_HEIGHT}px`,
                        display: 'flex',
                        alignItems: 'center',
                        border: 'none',
                        color: 'var(--sticky-column-text)',
                      }}>
                        {workCategoryRow.workCategoryName}
                      </div>

                      <div style={{
                        position: 'absolute',
                        left: `${timelineOriginPx}px`,
                        top: 0,
                        height: `${ROW_LAYER_HEIGHT}px`,
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
                                height: `${ROW_LAYER_HEIGHT}px`,
                                backgroundColor,
                                border: `var(--border-width-thin) solid ${borderColor}`,
                              }}
                            />
                          );
                        })}

                        {/* Allocation spans (bars) */}
                        {workCategoryRow.spans.map((span, spanIndex) => {
                          const normalizedStart = span.startDate.split('T')[0];
                          const normalizedEnd = span.endDate.split('T')[0];

                          const startIndex = dates.indexOf(normalizedStart);
                          const endIndex = dates.indexOf(normalizedEnd);

                          // Skip spans completely outside visible range
                          if (startIndex === -1 && endIndex === -1) return null;

                          // Clamp to visible range
                          const spanStart = Math.max(startIndex, 0);
                          const spanEnd = Math.min(endIndex === -1 ? dates.length - 1 : endIndex, dates.length - 1);
                          const spanLength = spanEnd - spanStart + 1;

                          const leftOffset = spanStart * DAY_COL_FULL_WIDTH;
                          const blockWidth = spanLength * DAY_COL_FULL_WIDTH;
                          // Bars are positioned within their own row container
                          // Center them vertically within the ROW_LAYER_HEIGHT cell
                          const spanHeight = 20; // Fixed height for bars
                          const verticalCenterOffset = (ROW_LAYER_HEIGHT - spanHeight) / 2;

                          return (
                            <div
                              key={`${workCategoryRow.workCategoryId}-${spanIndex}-${span.startDate}`}
                              style={{
                                position: 'absolute',
                                top: `${verticalCenterOffset}px`,
                                left: `${leftOffset}px`,
                                width: `${blockWidth}px`,
                                height: `${spanHeight}px`,
                                backgroundColor: getPhaseBackgroundColor(span.phase),
                                border: 'var(--border-width-thin) solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                padding: 'var(--space-sm)',
                                fontWeight: 'var(--font-weight-bold)',
                                fontSize: '11px',
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                boxSizing: 'border-box',
                                zIndex: 'var(--z-phase)' as any,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: tooltipsEnabled ? 'help' : 'default',
                              }}
                              onMouseEnter={(e) => handleSpanMouseEnter(e, workCategoryRow, span)}
                              onMouseMove={handleSpanMouseMove}
                              onMouseLeave={handleSpanMouseLeave}
                            >
                              {span.totalHours}h
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.events === nextProps.events &&
    prevProps.workCategories === nextProps.workCategories &&
    prevProps.allocations === nextProps.allocations &&
    prevProps.timeline.dates === nextProps.timeline.dates &&
    prevProps.timeline.dateColumnWidth === nextProps.timeline.dateColumnWidth &&
    prevProps.timeline.timelineOriginPx === nextProps.timeline.timelineOriginPx &&
    prevProps.tooltipsEnabled === nextProps.tooltipsEnabled
  );
});
