import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { TimelineLayout, Location, Event, EventPhase } from '../shared/types';
import { DateCellsContainer } from '../shared/DateCellsContainer';
import { StickyLeftCell } from '../shared/StickyLeftCell';
import { LEFT_COLUMNS, calculateLeftColumnOffsets } from '../../layoutConstants';
import { buildDateFlags } from '../../../utils/date';
import { Tooltip, TooltipState } from '../../tooltip';

interface CalendarSpan {
  eventId: string;
  locationId: string;
  label: string;
  startDate: string;
  endDate: string;
  phaseName?: string;
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

interface CalendarLocationRowProps {
  location: Location;
  events: Event[]; // Events that have this location
  timeline: TimelineLayout;
  tooltipsEnabled?: boolean;
}

const CELL_BORDER_WIDTH = 1;
const ROW_LAYER_HEIGHT = 24;
const TOOLTIP_DELAY_MS = 700;

/**
 * Renders one location row in the calendar section.
 * Shows event phases as colored timeline spans with vertical stacking for overlaps.
 */
export const CalendarLocationRow = memo(function CalendarLocationRow({
  location,
  events,
  timeline,
  tooltipsEnabled = true,
}: CalendarLocationRowProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const leftColumnOffsets = calculateLeftColumnOffsets(LEFT_COLUMNS);
  const timelineWidth = timeline.dates.length * timeline.dateColumnWidth;

  const isEventPhaseName = (name: string) => name.trim().toUpperCase() === 'EVENT';

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

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === timeline.dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(timeline.dates);
  }, [timeline.dates, timeline.dateMeta]);

  const weekendBackground = 'var(--calendar-weekend-bg)';
  const holidayBackground = 'var(--calendar-holiday-bg)';

  // Calculate event rows with overlap detection
  const eventRows: EventRow[] = useMemo(() => {
    const rows: EventRow[] = [];

    for (const event of events) {
      const spans: CalendarSpan[] = (event.phases || []).map((phase) => ({
        eventId: event.id,
        locationId: location.id,
        label: isEventPhaseName(phase.name) ? event.name : phase.name,
        startDate: phase.startDate,
        endDate: phase.endDate,
        phaseName: phase.name,
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

      rows.push({
        eventId: event.id,
        eventName: event.name,
        locationId: location.id,
        spans,
        row: 0,
        rangeStartMs: new Date(rangeStart).getTime(),
        rangeEndMs: new Date(rangeEnd).getTime(),
      });
    }

    rows.sort((a, b) => {
      const startDelta = a.rangeStartMs - b.rangeStartMs;
      if (startDelta !== 0) return startDelta;
      return a.eventName.localeCompare(b.eventName);
    });

    // Assign rows based on event-level overlap
    const placedRows: { row: number; rangeStartMs: number; rangeEndMs: number }[] = [];
    for (const eventRow of rows) {
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

    return rows;
  }, [events, location.id]);

  const maxRows = eventRows.length > 0 ? Math.max(...eventRows.map((r) => r.row)) + 1 : 0;
  const rowHeight = Math.max(maxRows, 1) * ROW_LAYER_HEIGHT;

  // Tooltip handlers
  const calculateDayCount = (startDate: string, endDate: string): number => {
    try {
      const start = new Date(startDate.split('T')[0]);
      const end = new Date(endDate.split('T')[0]);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1;
    } catch {
      return 0;
    }
  };

  const calculateTooltipPosition = (clientX: number, clientY: number) => {
    const tooltipWidth = 250;
    const tooltipHeight = 120;
    const spacing = 8;

    let top = clientY;
    let left = clientX;

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

  const handleSpanMouseEnter = (
    event: React.MouseEvent<HTMLDivElement>,
    eventRow: EventRow,
    span: CalendarSpan
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
    const phaseName = span.label === eventRow.eventName ? (span.phaseName || 'EVENT') : span.label;
    const mouseX = event.clientX;
    const mouseY = event.clientY;

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

  const handleSpanMouseLeave = () => {
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
      tooltipShowTimeoutRef.current = null;
    }
    setTooltip(null);
  };

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
    border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: '11px',
    backgroundColor: 'var(--surface-default)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <>
      <Tooltip tooltip={tooltip} />

      {/* Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: LEFT_COLUMNS.map(col => `${col.width}px`).join(' '),
          borderBottom: `1px solid var(--calendar-row-separator)`,
          position: 'relative',
          height: `${rowHeight}px`,
          boxSizing: 'border-box',
          minWidth: `${timeline.timelineOriginPx + timelineWidth}px`,
        }}
      >
        {/* Sticky location name cell - spans all 5 left columns */}
        <StickyLeftCell
          leftOffset={0}
          style={{
            ...cellStyle,
            backgroundColor: 'var(--sticky-column-bg)',
            textAlign: 'right',
            fontWeight: 'var(--font-weight-medium)',
            fontSize: '11px',
            color: 'var(--sticky-column-text)',
            height: `${rowHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderRight: '1px solid var(--sticky-column-border)',
            borderBottom: '1px solid var(--calendar-row-separator)',
            paddingRight: 'var(--space-md)',
            gridColumn: '1 / -1',
            width: `${timeline.timelineOriginPx}px`,
          }}
        >
          {location.name}
        </StickyLeftCell>

        {/* Date cells container */}
        <DateCellsContainer
          timelineOriginPx={timeline.timelineOriginPx}
          timelineWidth={timelineWidth}
          height={rowHeight}
        >
          {/* Background date cells */}
          {timeline.dates.map((date, index) => {
            const dateFlags = dateMeta[index];
            const backgroundColor = dateFlags?.isHoliday
              ? holidayBackground
              : dateFlags?.isWeekend
              ? weekendBackground
              : 'var(--calendar-weekday-bg)';
            const borderColor = dateFlags?.isHoliday
              ? 'var(--calendar-holiday-border)'
              : 'var(--calendar-grid-line)';

            return (
              <div
                key={date}
                style={{
                  ...cellStyle,
                  position: 'absolute',
                  left: `${index * timeline.dateColumnWidth}px`,
                  top: 0,
                  width: `${timeline.dateColumnWidth}px`,
                  height: '100%',
                  backgroundColor,
                  border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                }}
              />
            );
          })}

          {/* Event phase spans */}
          {eventRows.flatMap((eventRow) =>
            eventRow.spans.map((span, spanIndex) => {
              const normalizedStart = span.startDate.split('T')[0];
              const normalizedEnd = span.endDate.split('T')[0];

              const startIndex = timeline.dates.indexOf(normalizedStart);
              const endIndex = timeline.dates.indexOf(normalizedEnd);

              if (startIndex === -1 && endIndex === -1) return null;

              const spanStart = Math.max(startIndex, 0);
              const spanEnd = Math.min(endIndex === -1 ? timeline.dates.length - 1 : endIndex, timeline.dates.length - 1);
              const spanLength = spanEnd - spanStart + 1;

              const leftOffset = spanStart * timeline.dateColumnWidth;
              const blockWidth = spanLength * timeline.dateColumnWidth;
              const topOffset = eventRow.row * ROW_LAYER_HEIGHT;
              const spanHeight = maxRows === 1 ? rowHeight : ROW_LAYER_HEIGHT;

              return (
                <div
                  key={`${eventRow.eventId}-${eventRow.locationId}-${spanIndex}-${span.startDate}-${span.endDate}`}
                  data-event-id={eventRow.eventId}
                  style={{
                    position: 'absolute',
                    top: `${topOffset}px`,
                    left: `${leftOffset}px`,
                    width: `${blockWidth}px`,
                    height: `${spanHeight}px`,
                    backgroundColor: getPhaseBackgroundColor(span.phaseName),
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 10px',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: '11px',
                    color: 'var(--text-inverse)',
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
        </DateCellsContainer>
      </div>
    </>
  );
});
