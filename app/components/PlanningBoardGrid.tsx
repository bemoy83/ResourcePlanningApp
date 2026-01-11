import { WorkCategoryRow } from './WorkCategoryRow';

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

export function PlanningBoardGrid({
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
  // Build event lookup map
  const eventMap = new Map<string, Event>();
  for (const event of events) {
    eventMap.set(event.id, event);
  }

  const workCategoriesByEvent = new Map<string, WorkCategory[]>();
  for (const workCategory of workCategories) {
    const existing = workCategoriesByEvent.get(workCategory.eventId);
    if (existing) {
      existing.push(workCategory);
    } else {
      workCategoriesByEvent.set(workCategory.eventId, [workCategory]);
    }
  }

  // Use timeline contract if provided, otherwise use legacy values
  const dateColumnWidth = timeline?.dateColumnWidth ?? 100;
  const leftColumns = [
    { key: "event", width: 200 },
    { key: "workCategory", width: 200 },
    { key: "estimate", width: 100 },
    { key: "allocated", width: 100 },
    { key: "remaining", width: 100 },
  ];
  const leftColumnOffsets: number[] = [];
  let leftColumnsWidth = 0;
  for (const col of leftColumns) {
    leftColumnOffsets.push(leftColumnsWidth);
    leftColumnsWidth += col.width;
  }
  const timelineOriginPx = timeline?.timelineOriginPx ?? leftColumnsWidth;
  const leftColumnsTemplate = leftColumns.map((col) => `${col.width}px`).join(" ");
  const gridTemplateColumns = leftColumnsTemplate;
  const timelineWidth = dates.length * dateColumnWidth;
  const scrollWidth = timelineOriginPx + timelineWidth;
  const rowMinHeight = 46;
  const cellStyle = {
    border: '1px solid #999',
    padding: '8px',
    textAlign: 'center' as const,
    fontSize: '12px',
    backgroundColor: '#fff',
    color: '#000',
    minHeight: `${rowMinHeight}px`,
    boxSizing: 'border-box' as const,
  };

  // Build pressure map for quick lookup
  const pressureMap = new Map<string, WorkCategoryPressure>();
  for (const pressure of evaluation.workCategoryPressure) {
    pressureMap.set(pressure.workCategoryId, pressure);
  }

  // Build capacity comparison map for quick lookup
  const capacityMap = new Map<string, DailyCapacityComparison>();
  for (const comparison of evaluation.dailyCapacityComparison) {
    capacityMap.set(comparison.date, comparison);
  }

  const stickyColumnStyle = (offset: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex: 3,
    backgroundColor: '#fff',
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

      for (const location of locations) {
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
              backgroundColor: '#fff',
              fontWeight: 'bold',
              border: '2px solid #666',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0]) }}>
              <div>Event</div>
            </div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1]) }}>
              <div>Work Category</div>
            </div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2]) }}>
              <div>Estimate</div>
              <div style={{ fontSize: '10px', fontWeight: 'normal' }}>total hours</div>
            </div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3]) }}>
              <div>Allocated</div>
              <div style={{ fontSize: '10px', fontWeight: 'normal' }}>total hours</div>
            </div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4]) }}>
              <div>Remaining</div>
              <div style={{ fontSize: '10px', fontWeight: 'normal' }}>to allocate</div>
            </div>
            <div style={{
              position: 'absolute',
              left: `${timelineOriginPx}px`,
              top: 0,
              height: '100%',
              width: `${timelineWidth}px`,
            }}>
              {dates.map((date, index) => (
                <div
                  key={date}
                  style={{
                    ...cellStyle,
                    position: 'absolute',
                    left: `${index * dateColumnWidth}px`,
                    top: 0,
                    width: `${dateColumnWidth}px`,
                    height: '100%',
                  }}
                >
                  <div>{date}</div>
                </div>
              ))}
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
            zIndex: 1,
          }}
        >
          {/* Work category rows */}
          <div style={{ border: '1px solid #666' }}>
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
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {row.locationName}
                  </div>
                </div>

                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[1]),
                  fontStyle: 'italic',
                  color: '#666',
                }}>
                  (No work defined yet)
                </div>

                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2]), color: '#999' }}>—</div>
                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3]), color: '#999' }}>—</div>
                <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4]), color: '#999' }}>—</div>

                <div style={{
                  position: 'absolute',
                  left: `${timelineOriginPx}px`,
                  top: 0,
                  height: '100%',
                  width: `${timelineWidth}px`,
                }}>
                  {dates.map((date, index) => (
                    <div
                      key={`${row.eventId}-${row.locationId}-${date}`}
                      style={{
                        ...cellStyle,
                        position: 'absolute',
                        left: `${index * dateColumnWidth}px`,
                        top: 0,
                        width: `${dateColumnWidth}px`,
                        height: '100%',
                        backgroundColor: '#fff',
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Capacity comparison row */}
          {evaluation.dailyCapacityComparison.length > 0 && (
            <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '2px', border: '2px solid #666', position: 'relative' }}>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0]) }}></div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1]), fontWeight: 'bold' }}>
                <div>Capacity</div>
                <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>available per day</div>
              </div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2]) }}></div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3]) }}></div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4]) }}></div>
              <div style={{
                position: 'absolute',
                left: `${timelineOriginPx}px`,
                top: 0,
                height: '100%',
                width: `${timelineWidth}px`,
              }}>
                {dates.map((date, index) => {
                  const comparison = capacityMap.get(date);
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
                        }}
                      >
                        —
                      </div>
                    );
                  }

                  const statusStyle = comparison.isOverAllocated
                    ? { ...cellStyle, backgroundColor: '#fee', color: 'red' }
                    : comparison.isUnderAllocated
                      ? { ...cellStyle, backgroundColor: '#efe', color: 'green' }
                      : cellStyle;

                  return (
                    <div key={date} style={{
                      ...statusStyle,
                      position: 'absolute',
                      left: `${index * dateColumnWidth}px`,
                      top: 0,
                      width: `${dateColumnWidth}px`,
                      height: '100%',
                    }} title={`Demand: ${comparison.demandHours}h, Capacity: ${comparison.capacityHours}h`}>
                      <div style={{ fontWeight: 'bold' }}>{comparison.capacityHours}h</div>
                      {comparison.isOverAllocated && (
                        <div style={{ fontSize: '10px' }}>
                          +{(comparison.demandHours - comparison.capacityHours).toFixed(1)}h over
                        </div>
                      )}
                      {comparison.isUnderAllocated && (
                        <div style={{ fontSize: '10px' }}>
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
}
