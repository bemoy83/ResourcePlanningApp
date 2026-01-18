const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = date.split("-");
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
}

export function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateLocal(date: Date): string {
  return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return monthDays[month - 1];
}

export function nextDateString(date: string): string {
  const { year, month, day } = parseDateParts(date);
  let nextDay = day + 1;
  let nextMonth = month;
  let nextYear = year;

  if (nextDay > daysInMonth(year, month)) {
    nextDay = 1;
    nextMonth += 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
  }

  return formatDateParts(nextYear, nextMonth, nextDay);
}

export function previousDateString(date: string): string {
  const { year, month, day } = parseDateParts(date);
  let prevDay = day - 1;
  let prevMonth = month;
  let prevYear = year;

  if (prevDay < 1) {
    prevMonth -= 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    prevDay = daysInMonth(prevYear, prevMonth);
  }

  return formatDateParts(prevYear, prevMonth, prevDay);
}

export function addDays(date: string, delta: number): string {
  if (delta === 0) {
    return date;
  }
  const steps = Math.abs(delta);
  let current = date;
  for (let i = 0; i < steps; i += 1) {
    current = delta > 0 ? nextDateString(current) : previousDateString(current);
  }
  return current;
}

export function getDayOfWeek(date: string): number {
  const { year, month, day } = parseDateParts(date);
  return new Date(year, month - 1, day).getDay();
}

export interface DateFlags {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isNonWorking: boolean;
  isToday: boolean;
}

export function getTodayString(): string {
  return formatDateLocal(new Date());
}

export function buildDateFlags(dates: string[], holidayDates?: Set<string>): DateFlags[] {
  const today = getTodayString();
  return dates.map((date) => {
    const dayOfWeek = getDayOfWeek(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates ? holidayDates.has(date) : false;
    return {
      date,
      isWeekend,
      isHoliday,
      isNonWorking: isWeekend || isHoliday,
      isToday: date === today,
    };
  });
}

export function formatLabelDate(date: string): string {
  const { month, day } = parseDateParts(date);
  return `${MONTH_NAMES[month - 1]} ${day}`;
}
