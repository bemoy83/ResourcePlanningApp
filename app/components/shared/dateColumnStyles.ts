import { DateFlags } from '../../utils/date';

interface DateColumnStyles {
  backgroundColor: string;
  borderColor: string;
}

/**
 * Returns background and border colors for a date column based on its flags.
 * Handles today, holiday, weekend, and regular weekday styling.
 */
export function getDateColumnStyles(
  dateFlags: DateFlags | undefined,
  options?: { isHeader?: boolean; isToday?: boolean }
): DateColumnStyles {
  const isToday = options?.isToday ?? dateFlags?.isToday ?? false;
  const isHeader = options?.isHeader ?? false;

  let backgroundColor: string;
  if (isToday && isHeader) {
    backgroundColor = 'var(--today-header-bg)';
  } else if (dateFlags?.isHoliday) {
    backgroundColor = 'var(--calendar-holiday-bg)';
  } else if (dateFlags?.isWeekend) {
    backgroundColor = 'var(--calendar-weekend-bg)';
  } else if (isHeader) {
    backgroundColor = 'var(--sticky-header-cell-bg)';
  } else {
    backgroundColor = 'var(--calendar-weekday-bg)';
  }

  let borderColor: string;
  if (dateFlags?.isHoliday) {
    borderColor = 'var(--calendar-holiday-border)';
  } else if (dateFlags?.isWeekend) {
    borderColor = 'var(--calendar-weekend-border)';
  } else {
    borderColor = 'var(--border-primary)';
  }

  return { backgroundColor, borderColor };
}

/**
 * Returns text color for a date column header based on today status.
 */
export function getDateHeaderTextColor(isToday: boolean): string {
  return isToday ? 'var(--today-header-text)' : 'var(--sticky-header-text)';
}
