import { memo, useMemo } from 'react';
import { TimelineLayout, DailyDemand, DailyCapacityComparison } from '../shared/types';
import { DateCellsContainer } from '../shared/DateCellsContainer';
import { StickyLeftCell } from '../shared/StickyLeftCell';
import { CROSS_EVENT_LEFT_COLUMNS, calculateLeftColumnOffsets } from '../../layoutConstants';
import { buildDateFlags } from '../../../utils/date';

interface CrossEventDemandRowProps {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;

/**
 * Shows aggregated demand across all events for each date.
 * Highlights dates that are over-allocated.
 */
export const CrossEventDemandRow = memo(function CrossEventDemandRow({
  dailyDemand,
  dailyCapacityComparison,
  timeline,
}: CrossEventDemandRowProps) {
  const leftColumnOffsets = calculateLeftColumnOffsets(CROSS_EVENT_LEFT_COLUMNS);
  const timelineWidth = timeline.dates.length * timeline.dateColumnWidth;

  const demandMap = useMemo(() => {
    const map = new Map<string, DailyDemand>();
    for (const demand of dailyDemand) {
      map.set(demand.date, demand);
    }
    return map;
  }, [dailyDemand]);

  const comparisonMap = useMemo(() => {
    const map = new Map<string, DailyCapacityComparison>();
    for (const comparison of dailyCapacityComparison) {
      map.set(comparison.date, comparison);
    }
    return map;
  }, [dailyCapacityComparison]);

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === timeline.dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(timeline.dates);
  }, [timeline.dates, timeline.dateMeta]);

  const weekendBackground = 'var(--calendar-weekend-bg)';
  const holidayBackground = 'var(--calendar-holiday-bg)';

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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: CROSS_EVENT_LEFT_COLUMNS.map((col) => `${col.width}px`).join(' '),
        backgroundColor: 'var(--sticky-header-bg)',
        border: 'var(--border-width-medium) solid var(--sticky-header-border)',
        position: 'relative',
        minWidth: `${timeline.timelineOriginPx + timelineWidth}px`,
      }}
    >
      {/* Sticky label cell */}
      <StickyLeftCell
        leftOffset={leftColumnOffsets[0]}
        style={{
          ...cellStyle,
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
          fontWeight: 'var(--font-weight-bold)',
          textAlign: 'right',
          paddingRight: 'var(--space-md)',
        }}
      >
        <div style={{ textAlign: 'right' }}>Total Demand (All Events)</div>
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-normal)',
            textAlign: 'right',
          }}
        >
          aggregated
        </div>
      </StickyLeftCell>

      {/* Date cells */}
      <DateCellsContainer timelineOriginPx={timeline.timelineOriginPx} timelineWidth={timelineWidth}>
        {timeline.dates.map((date, index) => {
          const crossDemand = demandMap.get(date);
          const crossComparison = comparisonMap.get(date);
          const hasIssue = crossComparison?.isOverAllocated;
          const dateFlags = dateMeta[index];
          const baseBackground = dateFlags?.isHoliday
            ? holidayBackground
            : dateFlags?.isWeekend
            ? weekendBackground
            : 'var(--calendar-weekday-bg)';
          const borderColor = dateFlags?.isHoliday
            ? 'var(--calendar-holiday-border)'
            : dateFlags?.isWeekend
            ? 'var(--calendar-weekend-border)'
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
                fontWeight: 'var(--font-weight-bold)',
                color: hasIssue ? 'var(--capacity-over-text)' : 'inherit',
                backgroundColor: hasIssue ? 'var(--capacity-over)' : baseBackground,
                border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
              }}
            >
              {crossDemand && crossDemand.totalEffortHours > 0 ? `${crossDemand.totalEffortHours}h` : '—'}
            </div>
          );
        })}
      </DateCellsContainer>
    </div>
  );
});
