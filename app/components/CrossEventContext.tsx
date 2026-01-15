import { memo, useMemo } from 'react';
import {
  CROSS_EVENT_LEFT_COLUMNS,
  calculateLeftColumnOffsets,
  generateLeftColumnsTemplate,
} from './layoutConstants';
import { buildDateFlags, DateFlags } from '../utils/date';

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
  dateMeta?: DateFlags[];
}

interface CrossEventContextProps {
  crossEventEvaluation: CrossEventEvaluation;
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;

// Phase 2.3: Memoize component to prevent unnecessary re-renders
export const CrossEventContext = memo(function CrossEventContext({ crossEventEvaluation, timeline }: CrossEventContextProps) {
  if (crossEventEvaluation.crossEventDailyDemand.length === 0) {
    return null;
  }

  const dates = timeline.dates;
  const dateColumnWidth = timeline.dateColumnWidth;
  const timelineOriginPx = timeline.timelineOriginPx;

  const leftColumnOffsets = calculateLeftColumnOffsets(CROSS_EVENT_LEFT_COLUMNS);
  const gridTemplateColumns = generateLeftColumnsTemplate(CROSS_EVENT_LEFT_COLUMNS);
  const timelineWidth = dates.length * dateColumnWidth;
  const scrollWidth = timelineOriginPx + timelineWidth;

  const cellStyle: React.CSSProperties = {
    border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--surface-default)',
    color: 'var(--text-primary)',
    minHeight: 'var(--row-min-height)',
    boxSizing: 'border-box' as const,
  };

  const stickyColumnStyle = (offset: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex: 'var(--z-sticky-column)' as any,
    backgroundColor: 'var(--sticky-column-bg)',
    border: `${CELL_BORDER_WIDTH}px solid var(--sticky-column-border)`,
    color: 'var(--sticky-column-text)',
  });

  // Memoize demand map for O(1) lookups (Phase 2.3)
  const demandMap = useMemo(() => {
    const map = new Map<string, DailyDemand>();
    for (const demand of crossEventEvaluation.crossEventDailyDemand) {
      map.set(demand.date, demand);
    }
    return map;
  }, [crossEventEvaluation.crossEventDailyDemand]);

  // Memoize comparison map for O(1) lookups (Phase 2.3)
  const comparisonMap = useMemo(() => {
    const map = new Map<string, DailyCapacityComparison>();
    for (const comparison of crossEventEvaluation.crossEventCapacityComparison) {
      map.set(comparison.date, comparison);
    }
    return map;
  }, [crossEventEvaluation.crossEventCapacityComparison]);

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(dates);
  }, [dates, timeline.dateMeta]);

  const weekendBackground = "var(--calendar-weekend-bg)";
  const holidayBackground = "var(--calendar-holiday-bg)";

  return (
    <section style={{ minWidth: `${scrollWidth}px`, marginBottom: 'var(--space-xl)' }}>
      {/* Cross-event demand row */}
      <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: 'var(--sticky-header-bg)', border: 'var(--border-width-medium) solid var(--sticky-header-border)', position: 'relative' }}>
        <div style={{
          ...cellStyle,
          ...stickyColumnStyle(leftColumnOffsets[0]),
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
          fontWeight: 'var(--font-weight-bold)',
          textAlign: 'right',
        }}>
            <div style={{ textAlign: 'right' }}>Total Demand (All Events)</div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)', textAlign: 'right' }}>aggregated</div>
          </div>
          <div style={{
            position: 'absolute',
            left: `${timelineOriginPx}px`,
            top: 0,
            height: '100%',
            width: `${timelineWidth}px`,
          }}>
            {dates.map((date, index) => {
              const crossDemand = demandMap.get(date);
              const crossComparison = comparisonMap.get(date);

              // Color code based on cross-event pressure
              const hasIssue = crossComparison?.isOverAllocated;
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

              return (
                <div key={date} style={{
                  ...cellStyle,
                  position: 'absolute',
                  left: `${index * dateColumnWidth}px`,
                  top: 0,
                  width: `${dateColumnWidth}px`,
                  height: '100%',
                  fontWeight: 'var(--font-weight-bold)',
                  color: hasIssue ? 'var(--capacity-over-text)' : 'inherit',
                  backgroundColor: hasIssue ? 'var(--capacity-over)' : baseBackground,
                  border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                }}>
                  {crossDemand && crossDemand.totalEffortHours > 0 ? `${crossDemand.totalEffortHours}h` : '—'}
                </div>
              );
            })}
          </div>
        </footer>

        {/* Cross-event capacity comparison row */}
        {crossEventEvaluation.crossEventCapacityComparison.length > 0 && (
          <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: 'var(--sticky-header-bg)', marginTop: '2px', border: 'var(--border-width-medium) solid var(--sticky-header-border)', position: 'relative' }}>
          <div style={{
            ...cellStyle,
            ...stickyColumnStyle(leftColumnOffsets[0]),
            backgroundColor: 'var(--sticky-corner-bg)',
            border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
            color: 'var(--sticky-corner-text)',
            fontWeight: 'var(--font-weight-bold)',
            textAlign: 'right',
          }}>
              <div style={{ textAlign: 'right' }}>Total Capacity Status</div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)', textAlign: 'right' }}>demand vs capacity</div>
            </div>
            <div style={{
              position: 'absolute',
              left: `${timelineOriginPx}px`,
              top: 0,
              height: '100%',
              width: `${timelineWidth}px`,
            }}>
              {dates.map((date, index) => {
                const crossComparison = comparisonMap.get(date);
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

                if (!crossComparison || crossComparison.capacityHours === 0) {
                  return (
                    <div key={date} style={{
                      ...cellStyle,
                      position: 'absolute',
                      left: `${index * dateColumnWidth}px`,
                      top: 0,
                      width: `${dateColumnWidth}px`,
                      height: '100%',
                      backgroundColor: baseBackground,
                      border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                    }}>—</div>
                  );
                }

                const statusStyle = crossComparison.isOverAllocated
                  ? { ...cellStyle, backgroundColor: 'var(--capacity-over)', color: 'var(--capacity-over-text)', border: `${CELL_BORDER_WIDTH}px solid ${borderColor}` }
                  : crossComparison.isUnderAllocated
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
                  }} title={`All Events Demand: ${crossComparison.demandHours}h, Total Capacity: ${crossComparison.capacityHours}h`}>
                    <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{crossComparison.capacityHours}h</div>
                    {crossComparison.isOverAllocated && (
                      <div style={{ fontSize: 'var(--font-size-xs)' }}>
                        +{(crossComparison.demandHours - crossComparison.capacityHours).toFixed(1)}h over
                      </div>
                    )}
                    {crossComparison.isUnderAllocated && (
                      <div style={{ fontSize: 'var(--font-size-xs)' }}>
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
});
