import { memo, useMemo } from 'react';
import { TimelineLayout } from './shared/types';
import { DateCellsContainer } from './shared/DateCellsContainer';
import { StickyLeftCell } from './shared/StickyLeftCell';
import {
  LEFT_COLUMNS,
  TIMELINE_DATE_COLUMN_WIDTH,
  calculateLeftColumnOffsets,
  generateLeftColumnsTemplate,
} from '../layoutConstants';
import { buildDateFlags } from '../../utils/date';

interface PlanningTableHeaderProps {
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;

/**
 * Sticky header for the unified planning table.
 * Shows date columns and 5 sticky left columns (Event, Work Category, Estimate, Allocated, Remaining).
 * Sticks to the top during vertical scrolling.
 */
export const PlanningTableHeader = memo(function PlanningTableHeader({
  timeline,
}: PlanningTableHeaderProps) {
  const leftColumnOffsets = calculateLeftColumnOffsets(LEFT_COLUMNS);
  const gridTemplateColumns = generateLeftColumnsTemplate(LEFT_COLUMNS);
  const timelineWidth = timeline.dates.length * timeline.dateColumnWidth;
  const scrollWidth = timeline.timelineOriginPx + timelineWidth;

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === timeline.dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(timeline.dates);
  }, [timeline.dates, timeline.dateMeta]);

  const cellStyle: React.CSSProperties = {
    border: `var(--border-width-thin) solid var(--border-primary)`,
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
    <header
      style={{
        display: 'grid',
        gridTemplateColumns,
        backgroundColor: 'var(--sticky-header-bg)',
        fontWeight: 'var(--font-weight-bold)',
        border: `var(--border-width-medium) solid var(--sticky-header-border)`,
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky-header)' as any,
        minWidth: `${scrollWidth}px`,
        width: `${scrollWidth}px`,
      }}
    >
      {/* Sticky left columns */}
      <StickyLeftCell
        leftOffset={leftColumnOffsets[0]}
        style={{
          ...cellStyle,
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
        }}
      >
        <div>Event</div>
      </StickyLeftCell>

      <StickyLeftCell
        leftOffset={leftColumnOffsets[1]}
        style={{
          ...cellStyle,
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
        }}
      >
        <div>Work Category</div>
      </StickyLeftCell>

      <StickyLeftCell
        leftOffset={leftColumnOffsets[2]}
        style={{
          ...cellStyle,
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
        }}
      >
        <div>Estimate</div>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>
          total hours
        </div>
      </StickyLeftCell>

      <StickyLeftCell
        leftOffset={leftColumnOffsets[3]}
        style={{
          ...cellStyle,
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
        }}
      >
        <div>Allocated</div>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>
          total hours
        </div>
      </StickyLeftCell>

      <StickyLeftCell
        leftOffset={leftColumnOffsets[4]}
        style={{
          ...cellStyle,
          backgroundColor: 'var(--sticky-corner-bg)',
          border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
          color: 'var(--sticky-corner-text)',
        }}
      >
        <div>Remaining</div>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>
          to allocate
        </div>
      </StickyLeftCell>

      {/* Date columns */}
      <DateCellsContainer
        timelineOriginPx={timeline.timelineOriginPx}
        timelineWidth={timelineWidth}
      >
        {timeline.dates.map((date, index) => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const dateFlags = dateMeta[index];
          const backgroundColor = dateFlags?.isHoliday
            ? 'var(--calendar-holiday-bg)'
            : dateFlags?.isWeekend
            ? 'var(--calendar-weekend-bg)'
            : 'var(--sticky-header-cell-bg)';
          const borderColor = dateFlags?.isHoliday
            ? 'var(--calendar-holiday-border)'
            : dateFlags?.isWeekend
            ? 'var(--calendar-weekend-border)'
            : 'var(--border-primary)';

          return (
            <div
              key={date}
              style={{
                ...cellStyle,
                position: 'absolute',
                left: `${index * TIMELINE_DATE_COLUMN_WIDTH}px`,
                top: 0,
                width: `${TIMELINE_DATE_COLUMN_WIDTH}px`,
                height: '100%',
                backgroundColor,
                border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                color: 'var(--sticky-header-text)',
              }}
            >
              <div>{dayName}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>
                {dateStr}
              </div>
            </div>
          );
        })}
      </DateCellsContainer>
    </header>
  );
});
