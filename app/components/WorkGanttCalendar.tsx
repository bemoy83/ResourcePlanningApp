import { useMemo, memo, useState, useRef, useEffect, useCallback } from "react";
import { buildDateFlags } from "../utils/date";
import { getHolidayDatesForRange } from "../utils/holidays";
import { TooltipState } from "./tooltip";
import {
  groupWorkCategoriesByEvent,
  WorkGanttEventRow,
  AllocationSpan,
} from "./workGanttUtils";
import { HighlightBadge } from "./shared/HighlightBadge";
import { useDelayedHover } from "./shared/useDelayedHover";
import {
  Event,
  WorkCategory,
  Allocation,
  TimelineLayout,
} from "../types/shared";
import {
  computePhaseSpans,
  getPhaseBackgroundColor,
  formatPhaseNameForDisplay,
  getPhaseDisplayLabel,
  isEventPhaseName,
} from "./phaseSpanUtils";
import { createPortal } from "react-dom";

interface WorkGanttCalendarProps {
  events: Event[];
  workCategories: WorkCategory[];
  allocations: Allocation[];
  timeline: TimelineLayout;
  tooltipsEnabled?: boolean;
}

const CELL_BORDER_WIDTH = 1;
const ROW_LAYER_HEIGHT = 48; // Increased to allow 2 lines of text
const OUTSIDE_LABEL_GAP_PX = 6;

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

interface AllocationSpanBarProps {
  span: AllocationSpan;
  eventRow: WorkGanttEventRow;
  leftOffset: number;
  blockWidth: number;
  verticalCenterOffset: number;
  spanHeight: number;
  timelineWidth: number;
  tooltipsEnabled: boolean;
  onSpanMouseEnter: (
    event: React.MouseEvent<HTMLElement>,
    eventRow: WorkGanttEventRow,
    span: AllocationSpan
  ) => void;
  onSpanMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  onSpanMouseLeave: () => void;
}

const AllocationSpanBar = memo(function AllocationSpanBar({
  span,
  eventRow,
  leftOffset,
  blockWidth,
  verticalCenterOffset,
  spanHeight,
  timelineWidth,
  tooltipsEnabled,
  onSpanMouseEnter,
  onSpanMouseMove,
  onSpanMouseLeave,
}: AllocationSpanBarProps) {
  const barBodyRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const labelMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [labelFits, setLabelFits] = useState(true);
  const [placeOutsideLeft, setPlaceOutsideLeft] = useState(false);

  const updateLabelFit = useCallback(() => {
    const barBody = barBodyRef.current;
    const measure = measureRef.current;
    const labelMeasure = labelMeasureRef.current;

    if (!barBody || !measure || !labelMeasure) return;

    const styles = window.getComputedStyle(barBody);
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const availableWidth = Math.max(0, barBody.clientWidth - paddingLeft - paddingRight);
    const neededWidth = measure.scrollWidth;
    const fits = neededWidth <= availableWidth;

    setLabelFits(fits);

    const labelWidth = labelMeasure.scrollWidth;
    const overflowRight = leftOffset + blockWidth + labelWidth + OUTSIDE_LABEL_GAP_PX > timelineWidth;
    setPlaceOutsideLeft(overflowRight);
  }, [blockWidth, leftOffset, timelineWidth, span.totalHours, eventRow.workCategoryName]);

  useEffect(() => {
    updateLabelFit();
  }, [updateLabelFit, blockWidth]);

  useEffect(() => {
    const barBody = barBodyRef.current;
    if (!barBody) return;

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => updateLabelFit();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => updateLabelFit());
    resizeObserver.observe(barBody);
    return () => resizeObserver.disconnect();
  }, [updateLabelFit]);

  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLElement>) => {
    onSpanMouseEnter(event, eventRow, span);
  }, [onSpanMouseEnter, eventRow, span]);

  const barContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${verticalCenterOffset}px`,
    left: `${leftOffset}px`,
    width: `${blockWidth}px`,
    height: `${spanHeight}px`,
    zIndex: 'var(--z-phase)' as any,
    overflow: 'visible',
    boxSizing: 'border-box',
  };

  const barBodyStyle: React.CSSProperties = {
    position: 'relative',
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--work-bar-bg)',
    border: 'var(--border-width-thin) solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-sm)',
    fontWeight: 'var(--font-weight-bold)',
    fontSize: '11px',
    color: 'var(--text-inverse)',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-xs)',
    overflow: 'hidden',
    cursor: tooltipsEnabled ? 'help' : 'default',
  };

  const insideLabelStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const hoursStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    fontWeight: 'var(--font-weight-semibold)',
  };

  const measureStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  };

  const outsideLabelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-inverse)',
    cursor: tooltipsEnabled ? 'help' : 'default',
    ...(placeOutsideLeft
      ? { right: '100%', marginRight: 'var(--space-xs)' }
      : { left: '100%', marginLeft: 'var(--space-xs)' }),
  };

  return (
    <div
      style={barContainerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseMove={onSpanMouseMove}
      onMouseLeave={onSpanMouseLeave}
    >
      <div ref={barBodyRef} style={barBodyStyle}>
        {labelFits && <span style={insideLabelStyle}>{eventRow.workCategoryName}</span>}
        <span style={hoursStyle}>{span.totalHours}h</span>
        <span ref={measureRef} style={measureStyle}>
          <span style={insideLabelStyle}>{eventRow.workCategoryName}</span>
          <span style={hoursStyle}>{span.totalHours}h</span>
        </span>
        <span ref={labelMeasureRef} style={measureStyle}>
          <span style={insideLabelStyle}>{eventRow.workCategoryName}</span>
        </span>
      </div>
      {!labelFits && (
        <span
          style={outsideLabelStyle}
          onMouseEnter={handleMouseEnter}
          onMouseMove={onSpanMouseMove}
          onMouseLeave={onSpanMouseLeave}
        >
          {eventRow.workCategoryName}
        </span>
      )}
    </div>
  );
});

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

// Local tooltip component for WorkGanttCalendar that shows "Work:" instead of "Location:"
function WorkGanttTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!tooltip || !tooltip.visible || !mounted) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const tooltipContent = (
    <div
      style={{
        position: "fixed",
        top: `${tooltip.position.top}px`,
        left: `${tooltip.position.left}px`,
        backgroundColor: "var(--text-secondary)",
        color: "var(--text-inverse)",
        padding: "var(--space-sm) var(--space-md)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        zIndex: "var(--z-tooltip)" as any,
        boxShadow: "var(--shadow-md)",
        pointerEvents: "none",
        maxWidth: "250px",
        lineHeight: "var(--line-height-normal)",
        wordBreak: "break-word",
        overflowWrap: "break-word",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-xs)",
          borderBottom: "var(--border-width-thin) solid var(--border-strong)",
          paddingBottom: "var(--space-xs)",
        }}
      >
        {tooltip.content.eventName}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Phase:</strong> {tooltip.content.phaseName}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Work:</strong> {tooltip.content.locationName}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Duration:</strong> {tooltip.content.dayCount}{" "}
        {tooltip.content.dayCount === 1 ? "day" : "days"}
      </div>
      <div style={{ marginBottom: "2px" }}>
        <strong>Dates:</strong> {formatDate(tooltip.content.startDate)} -{" "}
        {formatDate(tooltip.content.endDate)}
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}

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
  const horizontalBorderColor = 'var(--calendar-grid-line-soft)';

  // Group work categories by event and build rows
  const eventRowsMap = useMemo(() => {
    return groupWorkCategoriesByEvent(events, workCategories, allocations);
  }, [events, workCategories, allocations]);

  // Track hovered work category and event separately
  const [hoveredWorkCategoryId, setHoveredWorkCategoryId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  // Get event ID from work category ID
  const workCategoryToEventMap = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(eventRowsMap).forEach(([eventId, rows]) => {
      rows.forEach((row) => {
        map.set(row.workCategoryId, eventId);
      });
    });
    return map;
  }, [eventRowsMap]);

  // Highlight only the specific work category being hovered
  const highlightedWorkCategoryIds = useMemo(() => {
    if (!hoveredWorkCategoryId) {
      return new Set<string>();
    }
    return new Set([hoveredWorkCategoryId]);
  }, [hoveredWorkCategoryId]);

  // Update event highlight when work category changes
  useEffect(() => {
    if (hoveredWorkCategoryId) {
      const eventId = workCategoryToEventMap.get(hoveredWorkCategoryId);
      setHoveredEventId(eventId || null);
    } else {
      setHoveredEventId(null);
    }
  }, [hoveredWorkCategoryId, workCategoryToEventMap]);

  const handleWorkCategoryHoverChange = useCallback((workCategoryId: string | null) => {
    setHoveredWorkCategoryId(workCategoryId);
  }, []);
  const { scheduleHover, clearHover, cancelHover } = useDelayedHover<string>({
    delayMs: TOOLTIP_DELAY_MS,
    onHover: handleWorkCategoryHoverChange,
  });

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
    event: React.MouseEvent<HTMLElement>,
    eventRow: WorkGanttEventRow,
    span: AllocationSpan
  ) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    if (tooltipsEnabled) {
      // Schedule hover for the specific work category (not the event)
      scheduleHover(eventRow.workCategoryId);
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
  const handleSpanMouseMove = (event: React.MouseEvent<HTMLElement>) => {
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
    clearHover();
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
      cancelHover();
    }
  }, [tooltipsEnabled, cancelHover]);

  const cellStyle: React.CSSProperties = {
    border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
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
      <WorkGanttTooltip tooltip={tooltip} />
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
          zIndex: 'var(--z-sticky-header)' as any,
          height: `${ROW_LAYER_HEIGHT}px`,
        }}>
          <div style={{
            ...headerCellStyle,
            position: 'sticky',
            left: 0,
            zIndex: 'var(--z-sticky-header)' as any,
            backgroundColor: 'var(--sticky-corner-bg)',
            border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
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
                    ...headerCellStyle,
                    position: 'absolute',
                    left: `${index * DAY_COL_FULL_WIDTH}px`,
                    top: 0,
                    width: `${DAY_COL_FULL_WIDTH}px`,
                    height: '100%',
                    backgroundColor,
                    border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
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
            const isExpanded = expandedEventIds.has(event.id);

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
                    borderBottom: '1px solid var(--sticky-column-bg)',
                    width: '100%',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div style={{
                    textAlign: 'left',
                    padding: 'var(--space-xs) var(--space-md)',
                    backgroundColor: 'var(--sticky-column-bg)',
                    position: 'sticky',
                    left: 0,
                    zIndex: 'var(--z-sticky-column)' as any,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-sm)',
                    color: 'var(--text-primary)',
                    border: 'var(--border-width-thin) solid var(--sticky-column-bg)',
                    fontSize: '11px',
                    boxSizing: 'border-box',
                    height: '100%',
                    flexWrap: 'wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'flex-start',
                      paddingTop: '2px',
                      transition: 'transform var(--transition-fast)',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      ▸
                    </span>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-xs)',
                      alignItems: 'baseline',
                      flex: 1,
                      minWidth: 0,
                    }}>
                      <HighlightBadge isHighlighted={hoveredEventId === event.id}>
                        {event.name}
                      </HighlightBadge>
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                        fontWeight: 'var(--font-weight-normal)',
                        whiteSpace: 'nowrap',
                      }}>
                        ({rows.length} {rows.length === 1 ? 'category' : 'categories'})
                      </span>
                    </div>
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
                            borderLeft: '1px solid var(--calendar-grid-line)',
                            borderRight: '1px solid var(--calendar-grid-line)',
                            boxSizing: 'border-box',
                          }}
                        />
                      );
                    })}

                    {/* Phase spans - visible in both expanded and collapsed states */}
                    {event.phases && event.phases.length > 0 && (() => {
                      const { spans: phaseSpans } = computePhaseSpans(event.phases, DAY_COL_FULL_WIDTH);

                      return phaseSpans.map((spanData) => {
                        // Skip hidden spans (collapsed)
                        if (spanData.isCollapsedHidden) return null;

                        const { phase, normalizedStart, normalizedEnd, leftAdjustment, widthAdjustment, isInTransition } = spanData;

                        const startIndex = dates.indexOf(normalizedStart);
                        const endIndex = dates.indexOf(normalizedEnd);

                      // Skip phases completely outside visible range
                        if (startIndex === -1 && endIndex === -1) return null;

                        // Clamp to visible range
                        const clampedStart = Math.max(startIndex === -1 ? 0 : startIndex, 0);
                        const clampedEnd = Math.min(endIndex === -1 ? dates.length - 1 : endIndex, dates.length - 1);
                        const spanLength = clampedEnd - clampedStart + 1;

                        // Apply transition adjustments for overlapping phases
                        const leftOffset = clampedStart * DAY_COL_FULL_WIDTH + leftAdjustment;
                        const blockWidth = spanLength * DAY_COL_FULL_WIDTH + widthAdjustment;
                        const spanHeight = 20;
                        const verticalCenterOffset = (ROW_LAYER_HEIGHT - spanHeight) / 2;

                        // Use abbreviated label when in transition and single-day
                        const isSingleDaySpan = spanLength === 1;
                        const isEventPhase = isEventPhaseName(phase.name);

                        // For EVENT phases, show the event name instead of "EVENT"
                        let displayLabel: string;
                        if (isEventPhase) {
                          if (isInTransition && isSingleDaySpan) {
                            // Abbreviate event name when in transition and single-day
                            displayLabel = event.name.length > 4 ? event.name.slice(0, 4) : event.name;
                          } else {
                            // Show full event name
                            displayLabel = event.name;
                          }
                        } else {
                          // Use standard phase display label for non-EVENT phases
                          displayLabel = getPhaseDisplayLabel(phase.name, isInTransition, isSingleDaySpan);
                        }

                        return (
                          <div
                            key={`phase-${phase.id}-${spanData.index}`}
                            style={{
                              position: 'absolute',
                              top: `${verticalCenterOffset}px`,
                              left: `${leftOffset}px`,
                              width: `${blockWidth}px`,
                              height: `${spanHeight}px`,
                              backgroundColor: getPhaseBackgroundColor(phase.name),
                              border: 'var(--border-width-thin) solid var(--border-primary)',
                              borderRadius: 'var(--radius-sm)',
                              padding: 'var(--space-sm)',
                              fontWeight: 'var(--font-weight-bold)',
                              fontSize: '11px',
                              color: 'var(--text-inverse)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              boxSizing: 'border-box',
                              zIndex: 'var(--z-phase)' as any,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'auto',
                            }}
                            title={`${isEventPhase ? event.name : formatPhaseNameForDisplay(phase.name)}: ${normalizedStart} to ${normalizedEnd}`}
                          >
                            {displayLabel}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </button>

                {/* Work category rows for this event */}
                {isExpanded && rows.map((workCategoryRow) => {
                  return (
                    <div
                      key={workCategoryRow.workCategoryId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: leftColumnsTemplate,
                        borderBottom: '1px solid var(--sticky-column-bg)',
                        position: 'relative',
                        height: `${ROW_LAYER_HEIGHT}px`,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{
                        ...cellStyle,
                        textAlign: 'left',
                        padding: 'var(--space-xs) var(--space-xl)',
                        fontSize: '11px',
                        backgroundColor: 'var(--sticky-column-bg)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 'var(--z-sticky-column)' as any,
                        height: `${ROW_LAYER_HEIGHT}px`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        border: 'none',
                        color: 'var(--sticky-column-text)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}>
                        <HighlightBadge
                          isHighlighted={highlightedWorkCategoryIds.has(workCategoryRow.workCategoryId)}
                        >
                          {workCategoryRow.workCategoryName}
                        </HighlightBadge>
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
                              : 'var(--calendar-weekday-bg)';
                          const borderColor = dateFlags?.isHoliday
                            ? "var(--calendar-holiday-border)"
                            : "var(--calendar-grid-line)";

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
                                border: 'none',
                                borderLeft: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                                borderRight: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                                borderTop: `${CELL_BORDER_WIDTH}px solid ${horizontalBorderColor}`,
                                borderBottom: `${CELL_BORDER_WIDTH}px solid ${horizontalBorderColor}`,
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
                            <AllocationSpanBar
                              key={`${workCategoryRow.workCategoryId}-${spanIndex}-${span.startDate}`}
                              span={span}
                              eventRow={workCategoryRow}
                              leftOffset={leftOffset}
                              blockWidth={blockWidth}
                              verticalCenterOffset={verticalCenterOffset}
                              spanHeight={spanHeight}
                              timelineWidth={timelineWidth}
                              tooltipsEnabled={tooltipsEnabled}
                              onSpanMouseEnter={handleSpanMouseEnter}
                              onSpanMouseMove={handleSpanMouseMove}
                              onSpanMouseLeave={handleSpanMouseLeave}
                            />
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
