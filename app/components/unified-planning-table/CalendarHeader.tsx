import { memo, useMemo } from 'react';
import { TimelineLayout } from './shared/types';
import { DateCellsContainer } from './shared/DateCellsContainer';
import { StickyLeftCell } from './shared/StickyLeftCell';
import { buildDateFlags } from '../../utils/date';

interface CalendarHeaderProps {
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;

/**
 * Simple header for the calendar section with "Locations" label and date columns
 */
export const CalendarHeader = memo(function CalendarHeader({
  timeline,
}: CalendarHeaderProps) {
  const timelineWidth = timeline.dates.length * timeline.dateColumnWidth;
  const scrollWidth = timeline.timelineOriginPx + timelineWidth;

  const dateMeta = useMemo(() => {
    if (timeline.dateMeta && timeline.dateMeta.length === timeline.dates.length) {
      return timeline.dateMeta;
    }
    return buildDateFlags(timeline.dates);
  }, [timeline.dates, timeline.dateMeta]);

  const cellStyle: React.CSSProperties = {
    border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--sticky-corner-bg)',
    color: 'var(--sticky-corner-text)',
    minHeight: 'var(--row-min-height)',
    boxSizing: 'border-box' as const,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: `${timeline.timelineOriginPx}px`,
        backgroundColor: 'var(--sticky-header-bg)',
        fontWeight: 'var(--font-weight-bold)',
        border: `var(--border-width-medium) solid var(--sticky-header-border)`,
        position: 'relative',
        minWidth: `${scrollWidth}px`,
        width: `${scrollWidth}px`,
      }}
    >
      {/* Sticky "Locations" label cell */}
      <StickyLeftCell
        leftOffset={0}
        style={{
          ...cellStyle,
          width: `${timeline.timelineOriginPx}px`,
          textAlign: 'right',
          paddingRight: 'var(--space-md)',
        }}
      >
        Locations
      </StickyLeftCell>

      {/* Date header cells */}
      <DateCellsContainer
        timelineOriginPx={timeline.timelineOriginPx}
        timelineWidth={timelineWidth}
        height="var(--row-min-height)"
      >
        {timeline.dates.map((date, index) => {
          const dateObj = new Date(date);
          const day = dateObj.getDate();
          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
          const dateFlags = dateMeta[index];

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
                flexDirection: 'column',
                gap: '2px',
                backgroundColor: dateFlags?.isHoliday
                  ? 'var(--calendar-holiday-bg)'
                  : dateFlags?.isWeekend
                  ? 'var(--calendar-weekend-bg)'
                  : 'var(--sticky-header-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-header-border)`,
              }}
            >
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                {day}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                {month}
              </div>
            </div>
          );
        })}
      </DateCellsContainer>
    </header>
  );
});
