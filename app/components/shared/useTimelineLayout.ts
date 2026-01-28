import { useMemo } from 'react';
import { buildDateFlags, getTodayString } from '../../utils/date';
import { getHolidayDatesForRange } from '../../utils/holidays';
import { TIMELINE_DATE_COLUMN_WIDTH, TIMELINE_ORIGIN_PX } from '../layoutConstants';
import { TimelineLayout } from '../../types/shared';
import { DateFlags } from '../../utils/date';

interface TimelineLayoutResult {
  /** Holiday date strings within the date range */
  holidayDates: Set<string>;
  /** Metadata flags for each date (weekend, holiday, today) */
  dateMeta: DateFlags[];
  /** Index of today in the dates array, or -1 if not found */
  todayIndex: number;
  /** Total width of the timeline in pixels */
  timelineWidth: number;
  /** Total scrollable width including left columns */
  scrollWidth: number;
  /** Complete timeline layout object */
  timeline: TimelineLayout;
}

/**
 * Hook that computes timeline layout values from a date array.
 * Consolidates holiday detection, date metadata, and dimension calculations
 * used across calendar and planning components.
 */
export function useTimelineLayout(dates: string[]): TimelineLayoutResult {
  const holidayDates = useMemo(
    () => getHolidayDatesForRange(dates),
    [dates]
  );

  const dateMeta = useMemo(
    () => buildDateFlags(dates, holidayDates),
    [dates, holidayDates]
  );

  const todayIndex = useMemo(() => {
    const today = getTodayString();
    return dates.indexOf(today);
  }, [dates]);

  const timelineWidth = dates.length * TIMELINE_DATE_COLUMN_WIDTH;
  const scrollWidth = TIMELINE_ORIGIN_PX + timelineWidth;

  const timeline: TimelineLayout = useMemo(
    () => ({
      dates,
      dateColumnWidth: TIMELINE_DATE_COLUMN_WIDTH,
      timelineOriginPx: TIMELINE_ORIGIN_PX,
      dateMeta,
    }),
    [dates, dateMeta]
  );

  return {
    holidayDates,
    dateMeta,
    todayIndex,
    timelineWidth,
    scrollWidth,
    timeline,
  };
}
