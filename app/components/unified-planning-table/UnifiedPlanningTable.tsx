import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { PlanningTableHeader } from './PlanningTableHeader';
import { CalendarHeader } from './CalendarHeader';
import { CalendarLocationRow } from './rows/CalendarLocationRow';
import { CrossEventDemandRow } from './rows/CrossEventDemandRow';
import { CrossEventCapacityRow } from './rows/CrossEventCapacityRow';
import { TodayIndicator } from '../shared/TodayIndicator';
import { WorkCategoryRow } from '../WorkCategoryRow';
import { StickyLeftCell } from './shared/StickyLeftCell';
import { useTimelineLayout } from '../shared/useTimelineLayout';
import { centeredCellStyle } from '../shared/gridStyles';
import {
  Event,
  Location,
  EventLocation,
  WorkCategory,
  Allocation,
  AllocationDraft,
  Evaluation,
  CrossEventEvaluation,
} from '../../types/shared';
import {
  LEFT_COLUMNS,
  TIMELINE_DATE_COLUMN_WIDTH,
  TIMELINE_ORIGIN_PX,
  calculateLeftColumnOffsets,
  generateLeftColumnsTemplate,
} from '../layoutConstants';
import { useEventHoverHighlight } from '../shared/useEventHoverHighlight';

interface UnifiedPlanningTableProps {
  events: Event[];
  locations: Location[];
  eventLocations: EventLocation[];
  dates: string[];
  workCategories: WorkCategory[];
  allocations: Allocation[];
  evaluation: Evaluation;
  crossEventEvaluation: CrossEventEvaluation;
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
  tooltipsEnabled?: boolean;
  focusedEventId?: string | null;
  onLocateFailure?: (message: string) => void;
  onStartCreate(workCategoryId: string, date: string): void;
  onStartEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: 'HOURS' | 'FTE'): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  onDelete(allocationId: string): void;
}

/**
 * Unified planning table - combines EventCalendar, CrossEventContext, and PlanningBoardGrid
 * into a single scrollable table with no scroll synchronization needed.
 *
 * Benefits:
 * - Single scroll container (no sync logic required)
 * - Native sticky header (no duplicate header)
 * - Native sticky columns (works reliably in one scroll context)
 * - Simpler architecture and better performance
 */
export function UnifiedPlanningTable({
  events,
  locations,
  eventLocations,
  dates,
  workCategories,
  allocations,
  evaluation,
  crossEventEvaluation,
  drafts,
  errorsByCellKey,
  tooltipsEnabled = true,
  focusedEventId = null,
  onLocateFailure,
  onStartCreate,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  onDelete,
}: UnifiedPlanningTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  const datesRef = useRef(dates);
  const prevDatesRef = useRef<string[]>(dates);

  // Use shared timeline layout hook
  const { timeline, todayIndex, scrollWidth } = useTimelineLayout(dates);

  // Map events to locations
  const eventLocationMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const el of eventLocations) {
      if (!map.has(el.eventId)) {
        map.set(el.eventId, []);
      }
      map.get(el.eventId)!.push(el.locationId);
    }
    return map;
  }, [eventLocations]);

  const { setHoveredEventId, highlightedIds: highlightedLocationIds } =
    useEventHoverHighlight<string>(eventLocationMap);

  // Callback for CalendarLocationRow to report hovered event
  const handleEventHover = useCallback((eventId: string | null) => {
    setHoveredEventId(eventId);
  }, [setHoveredEventId]);

  // Group events by location for calendar rows
  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );

  const eventsForLocation = (location: Location): Event[] => {
    return events.filter((event) => {
      const locIds = eventLocationMap.get(event.id) || [];
      return locIds.includes(location.id);
    });
  };
  const calendarRows = sortedLocations
    .map((location) => ({
      location,
      events: eventsForLocation(location),
    }))
    .filter(({ events: locationEvents }) => locationEvents.length > 0);

  // Event map for work category rows
  const eventMap = useMemo(() => {
    const map = new Map<string, Event>();
    for (const event of events) {
      map.set(event.id, event);
    }
    return map;
  }, [events]);

  // Pressure and capacity maps
  const pressureMap = useMemo(() => {
    const map = new Map();
    for (const pressure of evaluation.workCategoryPressure) {
      map.set(pressure.workCategoryId, pressure);
    }
    return map;
  }, [evaluation.workCategoryPressure]);

  const leftColumnOffsets = calculateLeftColumnOffsets(LEFT_COLUMNS);
  const gridTemplateColumns = generateLeftColumnsTemplate(LEFT_COLUMNS);
  const dateColumnWidth = TIMELINE_DATE_COLUMN_WIDTH;
  const timelineOriginPx = TIMELINE_ORIGIN_PX;

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    datesRef.current = dates;
  }, [dates]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const prevDates = prevDatesRef.current;
    if (!container || prevDates.length === 0 || dates.length === 0) {
      prevDatesRef.current = dates;
      return;
    }

    const prevStart = prevDates[0];
    const indexInNew = dates.indexOf(prevStart);
    if (indexInNew > 0) {
      container.scrollLeft += indexInNew * TIMELINE_DATE_COLUMN_WIDTH;
    }

    prevDatesRef.current = dates;
  }, [dates]);

  const resolveEventRange = (event: Event) => {
    let minDate = event.startDate;
    let maxDate = event.endDate;

    if (event.phases) {
      for (const phase of event.phases) {
        if (phase.startDate < minDate) {
          minDate = phase.startDate;
        }
        if (phase.endDate > maxDate) {
          maxDate = phase.endDate;
        }
      }
    }

    return { startDate: minDate, endDate: maxDate };
  };

  useLayoutEffect(() => {
    if (!focusedEventId) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentDates = datesRef.current;
    const currentEvents = eventsRef.current;
    const timelineWidth = currentDates.length * TIMELINE_DATE_COLUMN_WIDTH;
    const currentScrollWidth = TIMELINE_ORIGIN_PX + timelineWidth;

    if (currentDates.length === 0) {
      onLocateFailure?.('No dates available for the current range.');
      return;
    }

    const event = currentEvents.find((item) => item.id === focusedEventId);
    if (!event) {
      onLocateFailure?.('Selected event is hidden by current filters.');
      return;
    }

    const range = resolveEventRange(event);
    const normalizedStart = range.startDate.split('T')[0];
    const normalizedEnd = range.endDate.split('T')[0];
    const visibleStart = currentDates[0];
    const visibleEnd = currentDates[currentDates.length - 1];
    const startIndex = currentDates.indexOf(normalizedStart);
    const endIndex = currentDates.indexOf(normalizedEnd);

    if (normalizedEnd < visibleStart || normalizedStart > visibleEnd) {
      onLocateFailure?.('Selected event is outside the current date range.');
      return;
    }

    const clampedStart = startIndex === -1 ? 0 : startIndex;
    const clampedEnd = endIndex === -1 ? currentDates.length - 1 : endIndex;
    const centerIndex = Math.floor((clampedStart + clampedEnd) / 2);
    const eventCenterPx =
      timelineOriginPx + centerIndex * dateColumnWidth + dateColumnWidth / 2;
    const maxScrollLeft = Math.max(currentScrollWidth - container.clientWidth, 0);
    const targetScrollLeft = Math.min(
      Math.max(eventCenterPx - container.clientWidth / 2, 0),
      maxScrollLeft
    );

    let targetScrollTop = container.scrollTop;
    const anchor = container.querySelector(
      `[data-event-id="${focusedEventId}"]`
    ) as HTMLElement | null;
    if (anchor) {
      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      targetScrollTop =
        container.scrollTop +
        (anchorRect.top - containerRect.top) -
        containerRect.height / 2 +
        anchorRect.height / 2;
    }
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    targetScrollTop = Math.min(Math.max(targetScrollTop, 0), maxScrollTop);

    container.scrollTo({
      left: targetScrollLeft,
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }, [dateColumnWidth, focusedEventId, onLocateFailure, timelineOriginPx]);

  const cellStyle = centeredCellStyle;

  return (
    <div
      ref={scrollContainerRef}
      className="unified-planning-table"
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div style={{ minWidth: `${scrollWidth}px`, position: 'relative' }}>
        {/* Sticky Navigation Sections - Calendar + Cross-Event Context */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Calendar Header - "Locations" label - highest z-index to stay on top */}
          <div style={{ position: 'relative', zIndex: 20 }}>
            <CalendarHeader timeline={timeline} />
          </div>

          {/* Calendar Section - One row per location */}
          <section className="calendar-section" style={{ position: 'relative', zIndex: 1 }}>
            {calendarRows.map(({ location, events: locationEvents }, index) => (
              <CalendarLocationRow
                key={location.id}
                location={location}
                events={locationEvents}
                timeline={timeline}
                tooltipsEnabled={tooltipsEnabled}
                rowIndex={index}
                isHighlighted={highlightedLocationIds.has(location.id)}
                onEventHover={handleEventHover}
              />
            ))}
            {/* Today indicator line inside calendar section - above calendar content (z-index 1) but below sticky columns (z-index 3) */}
            <TodayIndicator
              todayIndex={todayIndex}
              dateColumnWidth={TIMELINE_DATE_COLUMN_WIDTH}
              timelineOriginPx={TIMELINE_ORIGIN_PX}
              topOffset={0}
            />
          </section>

          {/* Cross-Event Section - Summary rows */}
          <section className="cross-event-section" style={{ position: 'relative', zIndex: 1, marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <CrossEventDemandRow
              dailyDemand={crossEventEvaluation.crossEventDailyDemand}
              dailyCapacityComparison={crossEventEvaluation.crossEventCapacityComparison}
              timeline={timeline}
            />
            <CrossEventCapacityRow
              dailyCapacityComparison={crossEventEvaluation.crossEventCapacityComparison}
              timeline={timeline}
            />
            {/* Today indicator line inside cross-event section - above cross-event content but below sticky columns (z-index 3) */}
            <TodayIndicator
              todayIndex={todayIndex}
              dateColumnWidth={TIMELINE_DATE_COLUMN_WIDTH}
              timelineOriginPx={TIMELINE_ORIGIN_PX}
              topOffset={0}
            />
          </section>

          {/* Work Categories Labels Row - Sticky below cross-event */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 11,
              backgroundColor: 'var(--sticky-header-bg)',
              border: 'var(--border-width-medium) solid var(--sticky-header-border)',
              display: 'grid',
              gridTemplateColumns: gridTemplateColumns,
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--font-size-sm)',
              minWidth: `${scrollWidth}px`,
              width: `${scrollWidth}px`,
              alignItems: 'stretch',
              boxSizing: 'border-box',
            }}
          >
            <StickyLeftCell
              leftOffset={leftColumnOffsets[0]}
              style={{
                padding: 'var(--space-sm)',
                textAlign: 'center',
                backgroundColor: 'var(--sticky-corner-bg)',
                color: 'var(--sticky-corner-text)',
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                height: '100%',
                alignSelf: 'stretch',
                boxSizing: 'border-box',
              }}
            >
              Event
            </StickyLeftCell>
            <StickyLeftCell
              leftOffset={leftColumnOffsets[1]}
              style={{
                padding: 'var(--space-sm)',
                textAlign: 'center',
                backgroundColor: 'var(--sticky-corner-bg)',
                color: 'var(--sticky-corner-text)',
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                height: '100%',
                alignSelf: 'stretch',
                boxSizing: 'border-box',
              }}
            >
              Work Category
            </StickyLeftCell>
            <StickyLeftCell
              leftOffset={leftColumnOffsets[2]}
              style={{
                padding: 'var(--space-sm)',
                textAlign: 'center',
                backgroundColor: 'var(--sticky-corner-bg)',
                color: 'var(--sticky-corner-text)',
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                height: '100%',
                alignSelf: 'stretch',
                boxSizing: 'border-box',
              }}
            >
              Estimate
            </StickyLeftCell>
            <StickyLeftCell
              leftOffset={leftColumnOffsets[3]}
              style={{
                padding: 'var(--space-sm)',
                textAlign: 'center',
                backgroundColor: 'var(--sticky-corner-bg)',
                color: 'var(--sticky-corner-text)',
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                height: '100%',
                alignSelf: 'stretch',
                boxSizing: 'border-box',
              }}
            >
              Allocated
            </StickyLeftCell>
            <StickyLeftCell
              leftOffset={leftColumnOffsets[4]}
              style={{
                padding: 'var(--space-sm)',
                textAlign: 'center',
                backgroundColor: 'var(--sticky-corner-bg)',
                color: 'var(--sticky-corner-text)',
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                height: '100%',
                alignSelf: 'stretch',
                boxSizing: 'border-box',
              }}
            >
              Remaining
            </StickyLeftCell>
          </div>
        </div>

        {/* Planning Grid Section - Scrollable work categories */}
        <section className="planning-grid-section" style={{ position: 'relative', border: 'none' }}>
          {/* Today indicator line for planning grid section - below sticky columns (z-index 3) */}
          <TodayIndicator
            todayIndex={todayIndex}
            dateColumnWidth={TIMELINE_DATE_COLUMN_WIDTH}
            timelineOriginPx={TIMELINE_ORIGIN_PX}
            topOffset={0}
          />
          {workCategories.map((workCategory) => {
            const pressure = pressureMap.get(workCategory.id);
            const allocatedTotal = allocations
              .filter((a) => a.workCategoryId === workCategory.id)
              .reduce((sum, a) => sum + a.effortHours, 0);
            const remaining = workCategory.estimatedEffortHours - allocatedTotal;
            const event = eventMap.get(workCategory.eventId);
            const eventName = event?.name || 'Unknown Event';

            return (
              <WorkCategoryRow
                key={workCategory.id}
                eventName={eventName}
                eventStartDate={event?.startDate}
                eventEndDate={event?.endDate}
                workCategory={workCategory}
                allocatedTotal={allocatedTotal}
                remaining={remaining}
                pressure={pressure}
                dates={dates}
                dateColumnWidth={dateColumnWidth}
                timelineOriginPx={timelineOriginPx}
                leftColumnOffsets={leftColumnOffsets}
                allocations={allocations}
                drafts={drafts}
                errorsByCellKey={errorsByCellKey}
                onStartCreate={onStartCreate}
                onStartEdit={onStartEdit}
                onChangeDraft={onChangeDraft}
                onCommit={onCommit}
                onCancel={onCancel}
                onDelete={onDelete}
                gridTemplateColumns={gridTemplateColumns}
                cellStyle={cellStyle}
                dateMeta={timeline.dateMeta ?? []}
              />
            );
          })}
        </section>

      </div>
    </div>
  );
}
