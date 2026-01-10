import { WorkCategoryRow } from './WorkCategoryRow';

interface Event {
  id: string;
  name: string;
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

interface CrossEventEvaluation {
  crossEventDailyDemand: DailyDemand[];
  crossEventCapacityComparison: DailyCapacityComparison[];
}

interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
}

interface PlanningBoardGridProps {
  events: Event[];
  dates: string[];
  timeline?: TimelineLayout;
  workCategories: WorkCategory[];
  allocations: Allocation[];
  evaluation: Evaluation;
  crossEventEvaluation: CrossEventEvaluation;
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
  onStartCreate(workCategoryId: string, date: string): void;
  onStartEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  onDelete(allocationId: string): void;
}

export function PlanningBoardGrid({
  events,
  dates,
  timeline,
  workCategories,
  allocations,
  evaluation,
  crossEventEvaluation,
  drafts,
  errorsByCellKey,
  onStartCreate,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  onDelete,
}: PlanningBoardGridProps) {
  // Build event lookup map
  const eventMap = new Map<string, Event>();
  for (const event of events) {
    eventMap.set(event.id, event);
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

  const stickyColumnStyle = (offset: number, zIndex: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex,
  });

  return (
    <section style={{ minWidth: `${scrollWidth}px` }}>
      <div style={{
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        border: '2px solid #666',
        fontSize: '12px',
        color: '#000',
      }}>
        <strong>Planning Grid:</strong> Click any cell to add or edit allocations. All values shown in hours (h).
      </div>

      {/* Header */}
      <header style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', fontWeight: 'bold', border: '2px solid #666', position: 'sticky', top: 0, zIndex: 4 }}>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0], 5) }}>
          <div>Event</div>
        </div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1], 5) }}>
          <div>Work Category</div>
        </div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2], 5) }}>
          <div>Estimate</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal' }}>total hours</div>
        </div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3], 5) }}>
          <div>Allocated</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal' }}>total hours</div>
        </div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4], 5) }}>
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
      </div>

      {/* Footer with totals */}
      <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '10px', border: '2px solid #666', position: 'relative' }}>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0], 2) }}></div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1], 2), fontWeight: 'bold' }}>
          <div>Total Demand</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>per day</div>
        </div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2], 2) }}></div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3], 2) }}></div>
        <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4], 2) }}></div>
        <div style={{
          position: 'absolute',
          left: `${timelineOriginPx}px`,
          top: 0,
          height: '100%',
          width: `${timelineWidth}px`,
        }}>
          {dates.map((date, index) => {
            const demand = evaluation.dailyDemand.find((d) => d.date === date);
            const comparison = capacityMap.get(date);

            // Determine if this day has any issues
            const hasIssue = comparison?.isOverAllocated;

            return (
              <div key={date} style={{
                ...cellStyle,
                position: 'absolute',
                left: `${index * dateColumnWidth}px`,
                top: 0,
                width: `${dateColumnWidth}px`,
                height: '100%',
                fontWeight: 'bold',
                color: hasIssue ? 'red' : 'inherit',
              }}>
                {demand && demand.totalEffortHours > 0 ? `${demand.totalEffortHours}h` : '—'}
              </div>
            );
          })}
        </div>
      </footer>

      {/* Capacity comparison row */}
      {evaluation.dailyCapacityComparison.length > 0 && (
        <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '2px', border: '2px solid #666', position: 'relative' }}>
          <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0], 2) }}></div>
          <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1], 2), fontWeight: 'bold' }}>
            <div>Capacity</div>
            <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>available per day</div>
          </div>
          <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2], 2) }}></div>
          <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3], 2) }}></div>
          <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4], 2) }}></div>
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

      {/* Cross-Event Context Section */}
      {crossEventEvaluation.crossEventDailyDemand.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          border: '3px solid #333',
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#000',
            borderBottom: '2px solid #666',
            paddingBottom: '8px',
          }}>
            Cross-Event Context (Read-Only)
          </h3>
          <div style={{ fontSize: '11px', color: '#333', marginBottom: '12px' }}>
            Total demand across all active events. This is advisory context only—no events are modified.
          </div>

          {/* Cross-event demand row */}
          <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', border: '2px solid #666', position: 'relative' }}>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0], 2) }}></div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1], 2), fontWeight: 'bold' }}>
              <div>Total Demand (All Events)</div>
              <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>aggregated</div>
            </div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2], 2) }}></div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3], 2) }}></div>
            <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4], 2) }}></div>
            <div style={{
              position: 'absolute',
              left: `${timelineOriginPx}px`,
              top: 0,
              height: '100%',
              width: `${timelineWidth}px`,
            }}>
              {dates.map((date, index) => {
                const crossDemand = crossEventEvaluation.crossEventDailyDemand.find((d) => d.date === date);
                const crossComparison = crossEventEvaluation.crossEventCapacityComparison.find((c) => c.date === date);

                // Color code based on cross-event pressure
                const hasIssue = crossComparison?.isOverAllocated;

                return (
                  <div key={date} style={{
                    ...cellStyle,
                    position: 'absolute',
                    left: `${index * dateColumnWidth}px`,
                    top: 0,
                    width: `${dateColumnWidth}px`,
                    height: '100%',
                    fontWeight: 'bold',
                    color: hasIssue ? 'red' : 'inherit',
                    backgroundColor: hasIssue ? '#fee' : '#fff',
                  }}>
                    {crossDemand && crossDemand.totalEffortHours > 0 ? `${crossDemand.totalEffortHours}h` : '—'}
                  </div>
                );
              })}
            </div>
          </footer>

          {/* Cross-event capacity comparison row */}
          {crossEventEvaluation.crossEventCapacityComparison.length > 0 && (
            <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '2px', border: '2px solid #666', position: 'relative' }}>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[0], 2) }}></div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[1], 2), fontWeight: 'bold' }}>
                <div>Total Capacity Status</div>
                <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>demand vs capacity</div>
              </div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[2], 2) }}></div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[3], 2) }}></div>
              <div style={{ ...cellStyle, ...stickyColumnStyle(leftColumnOffsets[4], 2) }}></div>
              <div style={{
                position: 'absolute',
                left: `${timelineOriginPx}px`,
                top: 0,
                height: '100%',
                width: `${timelineWidth}px`,
              }}>
                {dates.map((date, index) => {
                  const crossComparison = crossEventEvaluation.crossEventCapacityComparison.find((c) => c.date === date);
                  if (!crossComparison || crossComparison.capacityHours === 0) {
                    return (
                      <div key={date} style={{
                        ...cellStyle,
                        position: 'absolute',
                        left: `${index * dateColumnWidth}px`,
                        top: 0,
                        width: `${dateColumnWidth}px`,
                        height: '100%',
                      }}>—</div>
                    );
                  }

                  const statusStyle = crossComparison.isOverAllocated
                    ? { ...cellStyle, backgroundColor: '#fee', color: 'red' }
                    : crossComparison.isUnderAllocated
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
                    }} title={`All Events Demand: ${crossComparison.demandHours}h, Total Capacity: ${crossComparison.capacityHours}h`}>
                      <div style={{ fontWeight: 'bold' }}>{crossComparison.capacityHours}h</div>
                      {crossComparison.isOverAllocated && (
                        <div style={{ fontSize: '10px' }}>
                          +{(crossComparison.demandHours - crossComparison.capacityHours).toFixed(1)}h over
                        </div>
                      )}
                      {crossComparison.isUnderAllocated && (
                        <div style={{ fontSize: '10px' }}>
                          {(crossComparison.capacityHours - crossComparison.demandHours).toFixed(1)}h free
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </footer>
          )}
        </div>
      )}
    </section>
  );
}
