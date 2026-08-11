import {
  daysInMonth,
  formatDateLocal,
  formatDateParts,
  getDayOfWeek,
  parseDateParts,
  MONTH_LABELS,
} from "../../utils/date";
import { CalendarDay } from "./types";

export const monthLabels = MONTH_LABELS;
export const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function addMonthsToDate(date: string, deltaMonths: number): string {
  if (deltaMonths === 0) return date;
  const { year, month, day } = parseDateParts(date);
  let targetYear = year;
  let targetMonth = month + deltaMonths;
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }
  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }
  const maxDay = daysInMonth(targetYear, targetMonth);
  return formatDateParts(targetYear, targetMonth, Math.min(day, maxDay));
}

export function isDateInRange(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

export function buildCalendarDays(
  year: number,
  month: number,
  rangeStart: string | null,
  rangeEnd: string | null
): CalendarDay[] {
  const today = formatDateLocal(new Date());
  const firstDayOfMonth = formatDateParts(year, month, 1);
  const startDayOfWeek = getDayOfWeek(firstDayOfMonth);
  const daysCount = daysInMonth(year, month);

  const days: CalendarDay[] = [];

  // Previous month days
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevMonthDays = daysInMonth(prevYear, prevMonth);

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const date = formatDateParts(prevYear, prevMonth, day);
    days.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: date === today,
      isSelected: date === rangeStart || date === rangeEnd,
      isInRange: isDateInRange(date, rangeStart, rangeEnd),
      isRangeStart: date === rangeStart,
      isRangeEnd: date === rangeEnd,
    });
  }

  // Current month days
  for (let day = 1; day <= daysCount; day++) {
    const date = formatDateParts(year, month, day);
    days.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: date === today,
      isSelected: date === rangeStart || date === rangeEnd,
      isInRange: isDateInRange(date, rangeStart, rangeEnd),
      isRangeStart: date === rangeStart,
      isRangeEnd: date === rangeEnd,
    });
  }

  // Next month days to fill remaining cells (up to 42 total for 6 rows)
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = formatDateParts(nextYear, nextMonth, day);
    days.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: date === today,
      isSelected: date === rangeStart || date === rangeEnd,
      isInRange: isDateInRange(date, rangeStart, rangeEnd),
      isRangeStart: date === rangeStart,
      isRangeEnd: date === rangeEnd,
    });
  }

  return days;
}
