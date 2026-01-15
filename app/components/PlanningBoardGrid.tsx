import { memo, useMemo } from 'react';
import { WorkCategoryRow } from './WorkCategoryRow';
import {
  LEFT_COLUMNS,
  TIMELINE_DATE_COLUMN_WIDTH,
  TIMELINE_ORIGIN_PX,
  calculateLeftColumnOffsets,
  generateLeftColumnsTemplate,
} from './layoutConstants';
import { buildDateFlags, DateFlags } from '../utils/date';

interface Event {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface EventLocation {
  id: string;
  eventId: string;
  locationId: string;
}

interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
}

interface Allocation {
  id: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

interface AllocationDraft {
  allocationId: string | null;
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

interface DailyDemand {
  date: string;
  totalEffortHours: number;
}

interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

interface Evaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  dateMeta?: DateFlags[];
}

interface PlanningBoardGridProps {
  events: Event[];
  locations?: Location[];
  eventLocations?: EventLocation[];
  dates: string[];
  timeline?: TimelineLayout;
  workCategories: WorkCategory[];
  allocations: Allocation[];
  evaluation: Evaluation;
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
  onStartCreate(workCategoryId: string, date: string): void;
  onStartEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  onDelete(allocationId: string): void;
  hideHeader?: boolean;
}

// Phase 2.2: Memoize component to prevent unnecessary re-renders
export const PlanningBoardGrid = memo(function PlanningBoardGrid({
  events,
  locations,
  eventLocations,
  dates,
  timeline,
  workCategories,
  allocations,
  evaluation,
  drafts,
  errorsByCellKey,
  onStartCreate,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  onDelete,
  hideHeader = false,
}: PlanningBoardGridProps) {
  // Memoize event lookup map (Phase 2.2)
  const eventMap = useMemo(() => {
    const map = new Map<string, Event>();
    for (const event of events) {
      map.set(event.id, event);
    }
    return map;
  }, [events]);

  // Memoize work categories by event map (Phase 2.2)
  const workCategoriesByEvent = useMemo(() => {
    const map = new Map<string, WorkCategory[]>();
    for (const workCategory of workCategories) {
      const existing = map.get(workCategory.eventId);
      if (existing) {
        existing.push(workCategory);
      } else {
        map.set(workCategory.eventId, [workCategory]);
      }
    }
    return map;
  }, [workCategories]);

  // Use timeline contract if provided, otherwise use shared constants
  const dateColumnWidth = timeline?.dateColumnWidth ?? TIMELINE_DATE_COLUMN_WIDTH;
  const timelineOriginPx = timeline?.timelineOriginPx ?? TIMELINE_ORIGIN_PX;
  const leftColumnOffsets = calculateLeftColumnOffsets(LEFT_COLUMNS);
  const gridTemplateColumns = generateLeftColumnsTemplate(LEFT_COLUMNS);
  const timelineWidth = dates.length * dateColumnWidth;
  const scrollWidth = timelineOriginPx + timelineWidth;
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

  // Memoize pressure map for quick lookup (Phase 2.2)
  const pressureMap = useMemo(() => {
    const map = new Map<string, WorkCategoryPressure>();
    for (const pressure of evaluation.workCategoryPressure) {
      map.set(pressure.workCategoryId, pressure);
    }
    return map;
  }, [evaluation.workCategoryPressure]);

  // Memoize capacity comparison map for quick lookup (Phase 2.2)
  const capacityMap = useMemo(() => {
    const map = new Map<string, DailyCapacityComparison>();
    for (const comparison of evaluation.dailyCapacityComparison) {
      map.set(comparison.date, comparison);
    }
    return map;
  }, [evaluation.dailyCapacityComparison]);

  const dateMeta = useMemo(() => {
    if (timeline?.dateMeta && timeline.dateMeta.length === dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(dates);
  }, [dates, timeline?.dateMeta]);

  const weekendBackground = "var(--calendar-weekend-bg)";
  const holidayBackground = "var(--calendar-holiday-bg)";

  const CELL_BORDER_WIDTH = 1;

  const stickyColumnStyle = (offset: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex: 'var(--z-sticky-column)' as any,
    backgroundColor: 'var(--sticky-column-bg)',
    border: `${CELL_BORDER_WIDTH}px solid var(--sticky-column-border)`,
    color: 'var(--sticky-column-text)',
  });

  const emptyRows = (() => {
    if (!locations || !eventLocations) return [];

    const locationMap = new Map<string, Location>();
    for (const location of locations) {
      locationMap.set(location.id, location);
    }

    const locationsByEvent = new Map<string, Set<string>>();
    for (const eventLocation of eventLocations) {
      if (!locationMap.has(eventLocation.locationId)) continue;
      const existing = locationsByEvent.get(eventLocation.eventId);
      if (existing) {
        existing.add(eventLocation.locationId);
      } else {
        locationsByEvent.set(eventLocation.eventId, new Set([eventLocation.locationId]));
      }
    }

    const rows: { eventId: string; eventName: string; locationId: string; locationName: string }[] = [];
    for (const event of events) {
      const eventWorkCategories = workCategoriesByEvent.get(event.id);
      if (eventWorkCategories && eventWorkCategories.length > 0) continue;

      const locationIds = locationsByEvent.get(event.id);
      if (!locationIds || locationIds.size === 0) continue;

      for (const location of [...locations].sort((a, b) => a.name.localeCompare(b.name))) {
        if (!locationIds.has(location.id)) continue;
        rows.push({
          eventId: event.id,
          eventName: event.name,
          locationId: location.id,
          locationName: location.name,
        });
      }
    }

    return rows;
  })();

  return (
    <section style={{ minWidth: `${scrollWidth}px`, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        className="planning-grid-viewport"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        {!hideHeader && (
          <header
            className="planning-grid-header"
            style={{
              display: 'grid',
              gridTemplateColumns,
              backgroundColor: 'var(--sticky-header-bg)',
              fontWeight: 'var(--font-weight-bold)',
              border: 'var(--border-width-medium) solid var(--sticky-header-border)',
              position: 'sticky',
              top: 0,
              zIndex: 'var(--z-sticky)' as any,
            }}
          >
            <div style={{
              ...cellStyle,
              ...stickyColumnStyle(leftColumnOffsets[0]),
              backgroundColor: 'var(--sticky-corner-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
              color: 'var(--sticky-corner-text)',
            }}>
              <div>Event</div>
            </div>
            <div style={{
              ...cellStyle,
              ...stickyColumnStyle(leftColumnOffsets[1]),
              backgroundColor: 'var(--sticky-corner-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
              color: 'var(--sticky-corner-text)',
            }}>
              <div>Work Category</div>
            </div>
            <div style={{
              ...cellStyle,
              ...stickyColumnStyle(leftColumnOffsets[2]),
              backgroundColor: 'var(--sticky-corner-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
              color: 'var(--sticky-corner-text)',
            }}>
              <div>Estimate</div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>total hours</div>
            </div>
            <div style={{
              ...cellStyle,
              ...stickyColumnStyle(leftColumnOffsets[3]),
              backgroundColor: 'var(--sticky-corner-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
              color: 'var(--sticky-corner-text)',
            }}>
              <div>Allocated</div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>total hours</div>
            </div>
            <div style={{
              ...cellStyle,
              ...stickyColumnStyle(leftColumnOffsets[4]),
              backgroundColor: 'var(--sticky-corner-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
              color: 'var(--sticky-corner-text)',
            }}>
              <div>Remaining</div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>to allocate</div>
            </div>
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
                  : 'var(--sticky-header-cell-bg)';
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
                      left: `${index * dateColumnWidth}px`,
                      top: 0,
                      width: `${dateColumnWidth}px`,
                      height: '100%',
                      backgroundColor,
                      border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                      color: 'var(--sticky-header-text)',
                    }}
                  >
                    <div>{date}</div>
                  </div>
                );
              })}
            </div>
          </header>
        )}

        <div
          className="planning-grid-body"
          style={{
            overflowY: 'visible',
            overflowX: 'visible',
            flex: 1,
            minHeight: 0,
            position: 'relative',
            zIndex: 'var(--z-base)' as any,
          }}
        >
          {/* Work category rows */}
          <div style={{ border: 'var(--border-width-thin) solid var(--border-strong)' }}>
            {workCategories.map((workCategory) => {
              const pressure = pressureMap.get(workCategory.id);
              const allocatedTotal = allocations
                .filter((a) => a.workCategoryId === workCategory.id)
                .reduce((sum, a) => sum + a.effortHours, 0);
              const remaining = workCategory.estimatedEffortHours - allocatedTotal;

              // Look up event name for this work category
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
                  dateMeta={dateMeta}
                />
              );
            })}

            {emptyRows.map((row) => (
              <section
                key={`${row.eventId}-${row.locationId}`}
                style={{ display: 'grid', gridTemplateColumns, position: 'relative' }}
              >
                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0]) }}>
                  <div>{row.eventName}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-xxs)' }}>
                    {row.locationName}
                  </div>
                </div>

                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[1]),
                  fontStyle: 'italic',
                  color: 'var(--text-tertiary)',
                }}>
                  (No work defined yet)
                </div>

                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2]), color: 'var(--border-primary)' }}>—</div>
                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3]), color: 'var(--border-primary)' }}>—</div>
                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4]), color: 'var(--border-primary)' }}>—</div>

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
                      : 'var(--surface-default)';
                    const borderColor = dateFlags?.isHoliday
                      ? "var(--calendar-holiday-border)"
                      : dateFlags?.isWeekend
                      ? "var(--calendar-weekend-border)"
                      : "var(--border-primary)";

                    return (
                      <div
                        key={`${row.eventId}-${row.locationId}-${date}`}
                        style={{
                          ...cellStyle,
                          position: 'absolute',
                          left: `${index * dateColumnWidth}px`,
                          top: 0,
                          width: `${dateColumnWidth}px`,
                          height: '100%',
                          backgroundColor,
                          border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Capacity comparison row */}
          {evaluation.dailyCapacityComparison.length > 0 && (
            <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: 'var(--sticky-header-bg)', marginTop: 'var(--space-xxs)', border: 'var(--border-width-medium) solid var(--sticky-header-border)', position: 'relative' }}>
              <div style={{
                ...cellStyle,
                ...stickyColumnStyle(leftColumnOffsets[0]),
                backgroundColor: 'var(--sticky-corner-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                color: 'var(--sticky-corner-text)',
              }}></div>
              <div style={{
                ...cellStyle,
                ...stickyColumnStyle(leftColumnOffsets[1]),
                backgroundColor: 'var(--sticky-corner-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                color: 'var(--sticky-corner-text)',
              }}></div>
              <div style={{
                ...cellStyle,
                ...stickyColumnStyle(leftColumnOffsets[2]),
                backgroundColor: 'var(--sticky-corner-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                color: 'var(--sticky-corner-text)',
              }}></div>
              <div style={{
                ...cellStyle,
                ...stickyColumnStyle(leftColumnOffsets[3]),
                backgroundColor: 'var(--sticky-corner-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                color: 'var(--sticky-corner-text)',
              }}></div>
              <div style={{
                ...cellStyle,
                ...stickyColumnStyle(leftColumnOffsets[4]),
                backgroundColor: 'var(--sticky-corner-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                color: 'var(--sticky-corner-text)',
                fontWeight: 'var(--font-weight-bold)',
              }}>
                <div>Capacity</div>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>available per day</div>
              </div>
              <div style={{
                position: 'absolute',
                left: `${timelineOriginPx}px`,
                top: 0,
                height: '100%',
                width: `${timelineWidth}px`,
              }}>
                {dates.map((date, index) => {
                  const comparison = capacityMap.get(date);
                  const dateFlags = dateMeta[index];
                  const baseBackground = dateFlags?.isHoliday
                    ? holidayBackground
                    : dateFlags?.isWeekend
                    ? weekendBackground
                    : 'var(--surface-default)';
                  const borderColor = dateFlags?.isHoliday
                    ? "var(--calendar-holiday-border)"
                    : dateFlags?.isWeekend
                    ? "var(--calendar-weekend-border)"
                    : "var(--border-primary)";

                  if (!comparison || comparison.capacityHours === 0) {
                    return (
                      <div
                        key={date}
                        style={{
                          ...cellStyle,
                          position: 'absolute',
                          left: `${index * dateColumnWidth}px`,
                          top: 0,
                          width: `${dateColumnWidth}px`,
                          height: '100%',
                          backgroundColor: baseBackground,
                          border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                        }}
                      >
                        —
                      </div>
                    );
                  }

                  const statusStyle = comparison.isOverAllocated
                    ? { ...cellStyle, backgroundColor: 'var(--capacity-over)', color: 'var(--capacity-over-text)', border: `${CELL_BORDER_WIDTH}px solid ${borderColor}` }
                    : comparison.isUnderAllocated
                      ? { ...cellStyle, backgroundColor: 'var(--capacity-under)', color: 'var(--capacity-under-text)', border: `${CELL_BORDER_WIDTH}px solid ${borderColor}` }
                      : { ...cellStyle, backgroundColor: baseBackground, border: `${CELL_BORDER_WIDTH}px solid ${borderColor}` };

                  return (
                    <div key={date} style={{
                      ...statusStyle,
                      position: 'absolute',
                      left: `${index * dateColumnWidth}px`,
                      top: 0,
                      width: `${dateColumnWidth}px`,
                      height: '100%',
                    }} title={`Demand: ${comparison.demandHours}h, Capacity: ${comparison.capacityHours}h`}>
                      <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{comparison.capacityHours}h</div>
                      {comparison.isOverAllocated && (
                        <div style={{ fontSize: 'var(--font-size-xs)' }}>
                          +{(comparison.demandHours - comparison.capacityHours).toFixed(1)}h over
                        </div>
                      )}
                      {comparison.isUnderAllocated && (
                        <div style={{ fontSize: 'var(--font-size-xs)' }}>
                          {(comparison.capacityHours - comparison.demandHours).toFixed(1)}h free
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </footer>
          )}
        </div>
      </div>
    </section>
  );
});
