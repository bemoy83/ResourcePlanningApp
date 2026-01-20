import { memo, useMemo } from 'react';
import { TimelineLayout, DailyCapacityComparison } from '../shared/types';
import { DateCellsContainer } from '../shared/DateCellsContainer';
import { StickyLeftCell } from '../shared/StickyLeftCell';
import { CROSS_EVENT_LEFT_COLUMNS, calculateLeftColumnOffsets } from '../../layoutConstants';
import { buildDateFlags } from '../../../utils/date';

interface CrossEventCapacityRowProps {
  dailyCapacityComparison: DailyCapacityComparison[];
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;

/**
 * Shows capacity status (demand vs capacity) across all events for each date.
 * Color-coded: red for over-allocated, green for under-allocated.
 */
export const CrossEventCapacityRow = memo(function CrossEventCapacityRow({
  dailyCapacityComparison,
  timeline,
}: CrossEventCapacityRowProps) {
  const leftColumnOffsets = calculateLeftColumnOffsets(CROSS_EVENT_LEFT_COLUMNS);
  const timelineWidth = timeline.dates.length * timeline.dateColumnWidth;

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
  const horizontalBorderColor = 'var(--calendar-grid-line-soft)';

  const cellStyle: React.CSSProperties = {
    border: `${CELL_BORDER_WIDTH}px solid var(--border-primary)`,
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
      style={{
        display: 'grid',
        gridTemplateColumns: CROSS_EVENT_LEFT_COLUMNS.map((col) => `${col.width}px`).join(' '),
        backgroundColor: 'var(--sticky-header-bg)',
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
          borderTop: 'none',
          color: 'var(--sticky-corner-text)',
          fontWeight: 'var(--font-weight-bold)',
          textAlign: 'right',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingRight: 'var(--space-md)',
        }}
      >
        <div style={{ textAlign: 'right' }}>Total Capacity Status</div>
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-normal)',
            textAlign: 'right',
          }}
        >
          demand vs capacity
        </div>
      </StickyLeftCell>

      {/* Date cells */}
      <DateCellsContainer timelineOriginPx={timeline.timelineOriginPx} timelineWidth={timelineWidth}>
        {timeline.dates.map((date, index) => {
          const crossComparison = comparisonMap.get(date);
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
          const dateCellBorders = {
            border: 'none',
            borderLeft: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
            borderRight: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
            borderTop: `${CELL_BORDER_WIDTH}px solid ${horizontalBorderColor}`,
            borderBottom: `${CELL_BORDER_WIDTH}px solid ${horizontalBorderColor}`,
          };

          if (!crossComparison || crossComparison.capacityHours === 0) {
            return (
              <div
                key={date}
                style={{
                  ...cellStyle,
                  ...dateCellBorders,
                  position: 'absolute',
                  left: `${index * timeline.dateColumnWidth}px`,
                  top: 0,
                  width: `${timeline.dateColumnWidth}px`,
                  height: '100%',
                  backgroundColor: baseBackground,
                }}
              >
              </div>
            );
          }

          const statusStyle = crossComparison.isOverAllocated
            ? {
                ...cellStyle,
                backgroundColor: 'var(--capacity-over)',
              color: 'var(--capacity-over-text)',
              }
            : crossComparison.isUnderAllocated
            ? {
                ...cellStyle,
                backgroundColor: 'var(--capacity-under)',
                color: 'var(--capacity-under-text)',
              }
            : {
                ...cellStyle,
                backgroundColor: baseBackground,
              };

          return (
            <div
              key={date}
              style={{
                ...statusStyle,
                ...dateCellBorders,
                position: 'absolute',
                left: `${index * timeline.dateColumnWidth}px`,
                top: 0,
                width: `${timeline.dateColumnWidth}px`,
                height: '100%',
              }}
              title={`All Events Demand: ${crossComparison.demandHours}h, Total Capacity: ${crossComparison.capacityHours}h`}
            >
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
      </DateCellsContainer>
    </div>
  );
});
