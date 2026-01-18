import { memo, useMemo } from 'react';
import { TimelineLayout } from './shared/types';
import { DateCellsContainer } from './shared/DateCellsContainer';
import { StickyLeftCell } from './shared/StickyLeftCell';
import {
  CALENDAR_MONTH_HEADER_HEIGHT,
  CALENDAR_WEEK_HEADER_HEIGHT,
} from '../layoutConstants';
import { buildDateFlags } from '../../utils/date';

interface CalendarHeaderProps {
  timeline: TimelineLayout;
}

const CELL_BORDER_WIDTH = 1;
const WEEK_HEADER_HEIGHT = CALENDAR_WEEK_HEADER_HEIGHT;
const MONTH_HEADER_HEIGHT = CALENDAR_MONTH_HEADER_HEIGHT;

/**
 * Gets ISO week number and year for a date
 * ISO weeks start on Monday, week 1 is the first week with at least 4 days in the new year
 * Returns both week number and the ISO week year (which may differ from calendar year)
 */
function getISOWeek(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  // Move to Thursday of the week (always in the correct ISO week year)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}

/**
 * Groups consecutive dates by week and returns week spans with positions
 */
function groupDatesByWeek(dates: string[], dateColumnWidth: number) {
  const spans: Array<{
    weekNumber: number;
    year: number;
    startIndex: number;
    endIndex: number;
    left: number;
    width: number;
  }> = [];

  if (dates.length === 0) return spans;

  let currentWeekKey = '';
  let startIndex = 0;

  dates.forEach((date, index) => {
    const dateObj = new Date(date);
    const { weekNumber, year: weekYear } = getISOWeek(dateObj);
    const weekKey = `${weekYear}-W${weekNumber}`;

    if (weekKey !== currentWeekKey) {
      // Save previous span if exists
      if (currentWeekKey !== '') {
        const prevDate = new Date(dates[startIndex]);
        const prevWeek = getISOWeek(prevDate);
        spans.push({
          weekNumber: prevWeek.weekNumber,
          year: prevWeek.year,
          startIndex,
          endIndex: index - 1,
          left: startIndex * dateColumnWidth,
          width: (index - startIndex) * dateColumnWidth,
        });
      }
      // Start new span
      currentWeekKey = weekKey;
      startIndex = index;
    }
  });

  // Add final span
  if (currentWeekKey !== '') {
    const lastDate = new Date(dates[startIndex]);
    const lastWeek = getISOWeek(lastDate);
    spans.push({
      weekNumber: lastWeek.weekNumber,
      year: lastWeek.year,
      startIndex,
      endIndex: dates.length - 1,
      left: startIndex * dateColumnWidth,
      width: (dates.length - startIndex) * dateColumnWidth,
    });
  }

  return spans;
}

/**
 * Groups consecutive dates by month and returns month spans with positions
 */
function groupDatesByMonth(dates: string[], dateColumnWidth: number) {
  const spans: Array<{
    monthYear: string;
    startIndex: number;
    endIndex: number;
    left: number;
    width: number;
  }> = [];

  if (dates.length === 0) return spans;

  let currentMonthKey = '';
  let startIndex = 0;

  dates.forEach((date, index) => {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const monthKey = `${year}-${month}`;

    if (monthKey !== currentMonthKey) {
      // Save previous span if exists
      if (currentMonthKey !== '') {
        const prevDate = new Date(dates[startIndex]);
        spans.push({
          monthYear: prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          startIndex,
          endIndex: index - 1,
          left: startIndex * dateColumnWidth,
          width: (index - startIndex) * dateColumnWidth,
        });
      }
      // Start new span
      currentMonthKey = monthKey;
      startIndex = index;
    }
  });

  // Add final span
  if (currentMonthKey !== '') {
    const lastDate = new Date(dates[startIndex]);
    spans.push({
      monthYear: lastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      startIndex,
      endIndex: dates.length - 1,
      left: startIndex * dateColumnWidth,
      width: (dates.length - startIndex) * dateColumnWidth,
    });
  }

  return spans;
}

/**
 * Simple header for the calendar section with "Locations" label and date columns
 * Now includes a month header row above the date cells
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

  // Group dates by week for week header
  const weekSpans = useMemo(() => {
    return groupDatesByWeek(timeline.dates, timeline.dateColumnWidth);
  }, [timeline.dates, timeline.dateColumnWidth]);

  // Group dates by month for month header
  const monthSpans = useMemo(() => {
    return groupDatesByMonth(timeline.dates, timeline.dateColumnWidth);
  }, [timeline.dates, timeline.dateColumnWidth]);

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
        gridTemplateRows: `${MONTH_HEADER_HEIGHT}px ${WEEK_HEADER_HEIGHT}px var(--row-min-height)`,
        backgroundColor: 'var(--sticky-header-bg)',
        fontWeight: 'var(--font-weight-bold)',
        border: `var(--border-width-medium) solid var(--sticky-header-border)`,
        position: 'relative',
        minWidth: `${scrollWidth}px`,
        width: `${scrollWidth}px`,
      }}
    >
      {/* Sticky "Locations" label cell - spans all three rows */}
      <StickyLeftCell
        leftOffset={0}
        style={{
          ...cellStyle,
          width: `${timeline.timelineOriginPx}px`,
          textAlign: 'right',
          paddingRight: 'var(--space-md)',
          paddingBottom: 'var(--space-sm)',
          gridRow: 'span 3',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
        }}
      >
        Locations
      </StickyLeftCell>

      {/* Month header row */}
      <DateCellsContainer
        timelineOriginPx={timeline.timelineOriginPx}
        timelineWidth={timelineWidth}
        height={MONTH_HEADER_HEIGHT}
        style={{ left: `${timeline.timelineOriginPx - CELL_BORDER_WIDTH}px` }}
      >
        {monthSpans.map((span, index) => (
          <div
            key={`month-${span.startIndex}-${span.endIndex}`}
            style={{
              position: 'absolute',
              left: `${span.left}px`,
              top: 0,
              width: `${span.width}px`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--sticky-header-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-header-border)`,
              borderBottom: 'none',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--sticky-header-text)',
              padding: 'var(--space-xs)',
              letterSpacing: '0.01em',
            }}
          >
            {span.monthYear}
          </div>
        ))}
      </DateCellsContainer>

      {/* Week number header row */}
      <DateCellsContainer
        timelineOriginPx={timeline.timelineOriginPx}
        timelineWidth={timelineWidth}
        height={WEEK_HEADER_HEIGHT}
        style={{ 
          top: `${MONTH_HEADER_HEIGHT}px`,
          left: `${timeline.timelineOriginPx - CELL_BORDER_WIDTH}px`
        }}
      >
        {weekSpans.map((span, index) => (
          <div
            key={`week-${span.startIndex}-${span.endIndex}`}
            style={{
              position: 'absolute',
              left: `${span.left}px`,
              top: 0,
              width: `${span.width}px`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--sticky-header-bg)',
              border: `${CELL_BORDER_WIDTH}px solid var(--sticky-header-border)`,
              borderBottom: 'none',
              fontSize: '10px',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-tertiary)',
              padding: 'var(--space-xs)',
              letterSpacing: '0.02em',
            }}
          >
            W{span.weekNumber}
          </div>
        ))}
      </DateCellsContainer>

      {/* Date header cells */}
      <DateCellsContainer
        timelineOriginPx={timeline.timelineOriginPx}
        timelineWidth={timelineWidth}
        height="var(--row-min-height)"
        style={{ 
          top: `${MONTH_HEADER_HEIGHT + WEEK_HEADER_HEIGHT}px`,
          left: `${timeline.timelineOriginPx - CELL_BORDER_WIDTH}px`
        }}
      >
        {timeline.dates.map((date, index) => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const day = dateObj.getDate();
          const dateFlags = dateMeta[index];

          const isToday = dateFlags?.isToday ?? false;

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
                backgroundColor: isToday
                  ? 'var(--today-header-bg)'
                  : dateFlags?.isHoliday
                  ? 'var(--calendar-holiday-bg)'
                  : dateFlags?.isWeekend
                  ? 'var(--calendar-weekend-bg)'
                  : 'var(--sticky-header-bg)',
                border: `${CELL_BORDER_WIDTH}px solid var(--sticky-header-border)`,
              }}
            >
              <div style={{
                fontSize: '10px',
                fontWeight: 'var(--font-weight-medium)',
                color: isToday ? 'var(--today-header-text)' : 'var(--text-tertiary)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.02em',
              }}>
                {dayName}
              </div>
              <div style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)',
                color: isToday ? 'var(--today-header-text)' : 'var(--sticky-header-text)',
              }}>
                {day}
              </div>
            </div>
          );
        })}
      </DateCellsContainer>
    </header>
  );
});
