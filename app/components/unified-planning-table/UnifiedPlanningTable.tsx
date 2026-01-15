import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { PlanningTableHeader } from './PlanningTableHeader';
import { CalendarLocationRow } from './rows/CalendarLocationRow';
import { CrossEventDemandRow } from './rows/CrossEventDemandRow';
import { CrossEventCapacityRow } from './rows/CrossEventCapacityRow';
import { WorkCategoryRow } from '../WorkCategoryRow';
import {
  TimelineLayout,
  Event,
  Location,
  WorkCategory,
  Allocation,
  AllocationDraft,
  Evaluation,
  CrossEventEvaluation,
} from './shared/types';
import {
  LEFT_COLUMNS,
  TIMELINE_DATE_COLUMN_WIDTH,
  TIMELINE_ORIGIN_PX,
  calculateLeftColumnOffsets,
  generateLeftColumnsTemplate,
} from '../layoutConstants';
import { buildDateFlags } from '../../utils/date';

interface EventLocation {
  id: string;
  eventId: string;
  locationId: string;
}

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

  // Build timeline layout
  const timeline: TimelineLayout = useMemo(
    () => ({
      dates,
      dateColumnWidth: TIMELINE_DATE_COLUMN_WIDTH,
      timelineOriginPx: TIMELINE_ORIGIN_PX,
      dateMeta: buildDateFlags(dates),
    }),
    [dates]
  );

  // Calculate scroll width
  const timelineWidth = dates.length * TIMELINE_DATE_COLUMN_WIDTH;
  const scrollWidth = TIMELINE_ORIGIN_PX + timelineWidth;

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

  const cellStyle: React.CSSProperties = {
    border: 'var(--border-width-thin) solid var(--border-primary)',
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--surface-default)',
    color: 'var(--text-primary)',
    minHeight: 'var(--row-min-height)',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <div
      className="unified-planning-table"
      ref={scrollContainerRef}
      style={{
        overflow: 'auto',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Content wrapper with explicit width */}
      <div style={{ minWidth: `${scrollWidth}px` }}>
        {/* Sticky Header */}
        <PlanningTableHeader timeline={timeline} />

        {/* Calendar Section - One row per location */}
        {sortedLocations.length > 0 && (
          <section className="calendar-section" style={{ borderTop: 'var(--border-width-thin) solid var(--border-strong)' }}>
            {sortedLocations.map((location) => {
              const locationEvents = eventsForLocation(location);
              if (locationEvents.length === 0) return null;

              return (
                <CalendarLocationRow
                  key={location.id}
                  location={location}
                  events={locationEvents}
                  timeline={timeline}
                  tooltipsEnabled={tooltipsEnabled}
                />
              );
            })}
          </section>
        )}

        {/* Cross-Event Section - Summary rows */}
        {crossEventEvaluation.crossEventDailyDemand.length > 0 && (
          <section className="cross-event-section" style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <CrossEventDemandRow
              dailyDemand={crossEventEvaluation.crossEventDailyDemand}
              dailyCapacityComparison={crossEventEvaluation.crossEventCapacityComparison}
              timeline={timeline}
            />
            <CrossEventCapacityRow
              dailyCapacityComparison={crossEventEvaluation.crossEventCapacityComparison}
              timeline={timeline}
            />
          </section>
        )}

        {/* Planning Grid Section - One row per work category */}
        <section className="planning-grid-section" style={{ border: 'var(--border-width-thin) solid var(--border-strong)' }}>
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
              dateMeta={timeline.dateMeta}
            />
          );
        })}
      </section>
      </div>
    </div>
  );
}
