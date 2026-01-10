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

interface CrossEventEvaluation {
  crossEventDailyDemand: DailyDemand[];
  crossEventCapacityComparison: DailyCapacityComparison[];
}

interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
}

interface CrossEventContextProps {
  crossEventEvaluation: CrossEventEvaluation;
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;

export function CrossEventContext({ crossEventEvaluation, timeline }: CrossEventContextProps) {
  if (crossEventEvaluation.crossEventDailyDemand.length === 0) {
    return null;
  }

  const dates = timeline.dates;
  const dateColumnWidth = timeline.dateColumnWidth;
  const timelineOriginPx = timeline.timelineOriginPx;

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

  const leftColumnsTemplate = leftColumns.map((col) => `${col.width}px`).join(" ");
  const gridTemplateColumns = leftColumnsTemplate;
  const timelineWidth = dates.length * dateColumnWidth;
  const scrollWidth = timelineOriginPx + timelineWidth;
  const rowMinHeight = 46;

  const cellStyle = {
    border: `${CELL_BORDER_WIDTH}px solid #999`,
    padding: '8px',
    textAlign: 'center' as const,
    fontSize: '12px',
    backgroundColor: '#fff',
    color: '#000',
    minHeight: `${rowMinHeight}px`,
    boxSizing: 'border-box' as const,
  };

  const stickyColumnStyle = (offset: number, zIndex: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex,
  });

  return (
    <section style={{ minWidth: `${scrollWidth}px`, marginBottom: '20px' }}>
      <div style={{
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        border: '2px solid #666',
        fontSize: '12px',
        color: '#000',
      }}>
        <strong>Cross-Event Context (Read-Only):</strong> Total demand across all active events. This is advisory context only—no events are modified.
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
    </section>
  );
}
