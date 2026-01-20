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

/**
 * Represents a phase transition where two phases share the same calendar date.
 * The earlier phase ends and the later phase starts on the same day.
 */
interface IntraDayTransition {
  date: string; // The shared date (YYYY-MM-DD)
  earlierSpanIndex: number; // Index of the phase that ends on this date
  laterSpanIndex: number; // Index of the phase that starts on this date
}

/**
 * Tracks single-day phases that all occur on the same date.
 * When 3+ phases share a single day, we collapse to show only the highest priority one.
 */
interface SingleDayCollapse {
  date: string;
  spanIndices: number[]; // All single-day spans on this date
  visibleSpanIndex: number; // The one to show (EVENT takes precedence)
}

// Canonical phase order: ASSEMBLY -> MOVE_IN -> EVENT -> MOVE_OUT -> DISMANTLE
const PHASE_ORDER: Record<string, number> = {
  'ASSEMBLY': 0,
  'MOVE_IN': 1,
  'EVENT': 2,
  'MOVE_OUT': 3,
  'DISMANTLE': 4,
};

// Phase abbreviations for compact display when sharing a date
const PHASE_ABBREVIATIONS: Record<string, string> = {
  'ASSEMBLY': 'A',
  'MOVE_IN': 'MI',
  'EVENT': 'E',
  'MOVE_OUT': 'MO',
  'DISMANTLE': 'D',
};

/**
 * Get the canonical order index for a phase name.
 * Returns a high number for unknown phases so they sort to the end.
 */
function getPhaseOrderIndex(phaseName: string | undefined): number {
  if (!phaseName) return 999;
  const normalized = phaseName.trim().toUpperCase();
  return PHASE_ORDER[normalized] ?? 999;
}

/**
 * Get abbreviated label for compact display when sharing a date.
 * Phase names get standard abbreviations, event names get truncated.
 */
function getAbbreviatedLabel(label: string, phaseName: string | undefined, isEventPhase: boolean): string {
  if (!isEventPhase && phaseName) {
    // It's a phase label - use standard abbreviation
    const normalized = phaseName.trim().toUpperCase();
    return PHASE_ABBREVIATIONS[normalized] ?? label.slice(0, 3);
  }
  // It's an event name - truncate to first 4 chars
  return label.length > 4 ? label.slice(0, 4) : label;
}

/**
 * Format phase name for display by replacing underscores with spaces.
 * e.g., "MOVE_IN" -> "MOVE IN"
 */
function formatPhaseNameForDisplay(phaseName: string): string {
  return phaseName.replace(/_/g, ' ');
}

interface EventRow {
  eventId: string;
  eventName: string;
  locationId: string;
  spans: CalendarSpan[];
  row: number;
  rangeStartMs: number;
  rangeEndMs: number;
  intraDayTransitions: IntraDayTransition[]; // Dates where phases transition within the same day
  singleDayCollapses: SingleDayCollapse[]; // Dates where 3+ single-day phases collapse to one
}

interface CalendarLocationRowProps {
  location: Location;
  events: Event[]; // Events that have this location
  timeline: TimelineLayout;
  tooltipsEnabled?: boolean;
  rowIndex?: number;
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
  rowIndex = 0,
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
        label: isEventPhaseName(phase.name) ? event.name : formatPhaseNameForDisplay(phase.name),
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

      // Detect intra-day transitions: where one phase ends and another starts on the same calendar date
      // Rule: earlier phase gets left half, later phase gets right half
      // Priority: 1) Time comparison, 2) Canonical phase order (ASSEMBLY -> MOVE_IN -> EVENT -> MOVE_OUT -> DISMANTLE)
      const intraDayTransitions: IntraDayTransition[] = [];
      for (let i = 0; i < spans.length - 1; i++) {
        const currentSpan = spans[i];
        const nextSpan = spans[i + 1];

        const currentEndDate = currentSpan.endDate.split('T')[0];
        const nextStartDate = nextSpan.startDate.split('T')[0];

        // Check if current phase ends on the same calendar date that the next phase starts
        if (currentEndDate === nextStartDate) {
          const currentEndTime = new Date(currentSpan.endDate).getTime();
          const nextStartTime = new Date(nextSpan.startDate).getTime();

          // Determine which phase is "earlier" for positioning
          let earlierIndex = i;
          let laterIndex = i + 1;

          if (currentEndTime === nextStartTime) {
            // Times are identical - use canonical phase order
            const currentPhaseOrder = getPhaseOrderIndex(currentSpan.phaseName);
            const nextPhaseOrder = getPhaseOrderIndex(nextSpan.phaseName);

            if (currentPhaseOrder > nextPhaseOrder) {
              // Current span's phase comes after next span's phase - swap
              earlierIndex = i + 1;
              laterIndex = i;
            }
          } else if (currentEndTime > nextStartTime) {
            // Current span ends after next span starts - swap
            earlierIndex = i + 1;
            laterIndex = i;
          }

          intraDayTransitions.push({
            date: currentEndDate,
            earlierSpanIndex: earlierIndex,
            laterSpanIndex: laterIndex,
          });
        }
      }

      // Detect single-day collapses: when 3+ single-day phases share the same date
      // In this case, show only the EVENT phase (or highest priority if no EVENT)
      const singleDayCollapses: SingleDayCollapse[] = [];
      const singleDaySpansByDate = new Map<string, number[]>();

      // Group single-day spans by their date
      spans.forEach((span, index) => {
        const startDate = span.startDate.split('T')[0];
        const endDate = span.endDate.split('T')[0];
        if (startDate === endDate) {
          // This is a single-day span
          const existing = singleDaySpansByDate.get(startDate) || [];
          existing.push(index);
          singleDaySpansByDate.set(startDate, existing);
        }
      });

      // For dates with 3+ single-day spans, create a collapse entry
      for (const [date, spanIndices] of singleDaySpansByDate) {
        if (spanIndices.length >= 3) {
          // Find the EVENT phase, or the one with highest display priority
          // Priority for display: EVENT > others (we want to show the main event)
          let visibleSpanIndex = spanIndices[0];
          let hasEventPhase = false;

          for (const idx of spanIndices) {
            const span = spans[idx];
            if (isEventPhaseName(span.phaseName || '')) {
              visibleSpanIndex = idx;
              hasEventPhase = true;
              break;
            }
          }

          // If no EVENT phase, show the middle one in canonical order (likely EVENT-adjacent)
          if (!hasEventPhase) {
            // Sort by canonical phase order and pick the middle
            const sorted = [...spanIndices].sort((a, b) => {
              const orderA = getPhaseOrderIndex(spans[a].phaseName);
              const orderB = getPhaseOrderIndex(spans[b].phaseName);
              return orderA - orderB;
            });
            visibleSpanIndex = sorted[Math.floor(sorted.length / 2)];
          }

          singleDayCollapses.push({
            date,
            spanIndices,
            visibleSpanIndex,
          });
        }
      }

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
        intraDayTransitions,
        singleDayCollapses,
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

  // Calculate the maximum number of rows needed for overlapping events
  // eventRow.row is 0-indexed, so we add 1 to get the total count
  // Example: if highest row index is 3, we need 4 rows (0, 1, 2, 3)
  const maxRows = eventRows.length > 0 ? Math.max(...eventRows.map((r) => r.row)) + 1 : 0;
  // Calculate total row height: maxRows * ROW_LAYER_HEIGHT
  // Ensure minimum height of 1 row (24px) even if no events
  // Example: if maxRows = 4, rowHeight = 4 * 24 = 96px
  const rowHeight = Math.max(maxRows, 1) * ROW_LAYER_HEIGHT;
  const isAlternateRow = rowIndex % 2 === 1;
  const rowOverlay = isAlternateRow
    ? 'linear-gradient(var(--calendar-row-alt-overlay), var(--calendar-row-alt-overlay))'
    : 'none';
  const horizontalBorderColor = 'var(--calendar-grid-line-soft)';

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
    // For tooltip: use formatted phase name (span.label already formatted, but for EVENT phase use original phaseName formatted)
    const phaseName = span.label === eventRow.eventName
      ? formatPhaseNameForDisplay(span.phaseName || 'EVENT')
      : span.label;
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    tooltipShowTimeoutRef.current = setTimeout(() => {
      const position = calculateTooltipPosition(mouseX, mouseY);
      setTooltip({
        visible: true,
        content: {
          eventName: eventRow.eventName,
          phaseName: phaseName,
          locationName: location.name,
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
          borderBottom: 'none',
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
            backgroundImage: rowOverlay,
            textAlign: 'right',
            fontWeight: 'var(--font-weight-medium)',
            fontSize: '11px',
            color: 'var(--sticky-column-text)',
            height: `${rowHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderRight: '1px solid var(--sticky-column-border)',
            borderBottom: '1px solid var(--calendar-grid-line-soft)',
            borderTop: '1px solid var(--calendar-grid-line-soft)',
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
            const overlay = isAlternateRow && !dateFlags?.isHoliday && !dateFlags?.isWeekend
              ? rowOverlay
              : 'none';
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
                  backgroundImage: overlay,
                  border: 'none',
                  borderLeft: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                  borderRight: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                  borderTop: `${CELL_BORDER_WIDTH}px solid ${horizontalBorderColor}`,
                  borderBottom: `${CELL_BORDER_WIDTH}px solid ${horizontalBorderColor}`,
                }}
              />
            );
          })}

          {/* Event phase spans */}
          {eventRows.flatMap((eventRow) =>
            eventRow.spans.map((span, spanIndex) => {
              const normalizedStart = span.startDate.split('T')[0];
              const normalizedEnd = span.endDate.split('T')[0];

              // Check if this span is part of a 3+ way collapse
              // If so, only render if it's the visible one; skip the others
              for (const collapse of eventRow.singleDayCollapses) {
                if (collapse.spanIndices.includes(spanIndex)) {
                  if (spanIndex !== collapse.visibleSpanIndex) {
                    // This span is hidden in favor of the visible one
                    return null;
                  }
                  // This is the visible span - it takes the full day (no transitions apply)
                  break;
                }
              }

              const startIndex = timeline.dates.indexOf(normalizedStart);
              const endIndex = timeline.dates.indexOf(normalizedEnd);

              if (startIndex === -1 && endIndex === -1) return null;

              const spanStart = Math.max(startIndex, 0);
              const spanEnd = Math.min(endIndex === -1 ? timeline.dates.length - 1 : endIndex, timeline.dates.length - 1);
              const spanLength = spanEnd - spanStart + 1;

              // Check if this span is the visible one in a collapse (takes full width, no transitions)
              const isCollapsedVisible = eventRow.singleDayCollapses.some(
                (collapse) => collapse.visibleSpanIndex === spanIndex
              );

              // Check for intra-day transitions affecting this span
              // If this span is the "earlier" one in a transition, it loses the right half of its end date
              // If this span is the "later" one in a transition, it loses the left half of its start date
              // Skip transition adjustments if this span is the visible one in a collapse
              let leftAdjustment = 0;
              let widthAdjustment = 0;
              let isInTransition = false;

              if (!isCollapsedVisible) {
                for (const transition of eventRow.intraDayTransitions) {
                  if (transition.earlierSpanIndex === spanIndex) {
                    // This span ends on the transition date - lose right half of that day
                    widthAdjustment -= timeline.dateColumnWidth / 2;
                    isInTransition = true;
                  }
                  if (transition.laterSpanIndex === spanIndex) {
                    // This span starts on the transition date - lose left half of that day
                    leftAdjustment += timeline.dateColumnWidth / 2;
                    widthAdjustment -= timeline.dateColumnWidth / 2;
                    isInTransition = true;
                  }
                }
              }

              const leftOffset = spanStart * timeline.dateColumnWidth + leftAdjustment;
              const blockWidth = spanLength * timeline.dateColumnWidth + widthAdjustment;
              // Position phase span vertically: each row is ROW_LAYER_HEIGHT (24px) tall
              // Example: row 0 = top 0px, row 1 = top 24px, row 2 = top 48px, row 3 = top 72px
              const topOffset = eventRow.row * ROW_LAYER_HEIGHT;
              // If only one row, span fills entire row height; otherwise each span is ROW_LAYER_HEIGHT
              // Example: if maxRows = 4, each span height = 24px (not 96px)
              const spanHeight = maxRows === 1 ? rowHeight : ROW_LAYER_HEIGHT;

              // Use abbreviated label only when span is a single-day phase in a 2-way transition
              // Multi-day phases have enough width to show the full label even when sharing an edge
              // Collapsed spans show full label since they take the whole day
              const isEventPhase = isEventPhaseName(span.phaseName || '');
              const isSingleDaySpan = spanLength === 1;
              const displayLabel = isInTransition && isSingleDaySpan
                ? getAbbreviatedLabel(span.label, span.phaseName, isEventPhase)
                : span.label;

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
                    zIndex: 'var(--z-phase)' as any,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: tooltipsEnabled ? 'help' : 'default',
                  }}
                  onMouseEnter={(e) => handleSpanMouseEnter(e, eventRow, span)}
                  onMouseMove={handleSpanMouseMove}
                  onMouseLeave={handleSpanMouseLeave}
                >
                  {displayLabel}
                </div>
              );
            })
          )}
        </DateCellsContainer>
      </div>
    </>
  );
});
