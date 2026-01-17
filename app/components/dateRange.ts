import {
  addDays,
  daysInMonth,
  formatDateLocal,
  formatDateParts,
  getDayOfWeek,
  parseDateParts,
} from "../utils/date";

export type DateRangePreset =
  | "this-week"
  | "next-2-weeks"
  | "this-month"
  | "next-3-months"
  | "next-6-months"
  | "this-year"
  | "year-month"
  | "custom";

export interface DateRange {
  startDate: string | null; // ISO date string YYYY-MM-DD
  endDate: string | null;   // ISO date string YYYY-MM-DD
}

export function getDateRangeFromPreset(preset: DateRangePreset, customRange: DateRange): DateRange {
  const today = formatDateLocal(new Date());

  switch (preset) {
    case "this-week": {
      const dayOfWeek = getDayOfWeek(today);
      const monday = addDays(today, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const sunday = addDays(monday, 6);
      return {
        startDate: monday,
        endDate: sunday,
      };
    }

    case "next-2-weeks": {
      const endDate = addDays(today, 14);
      return {
        startDate: today,
        endDate,
      };
    }

    case "this-month": {
      const { year, month } = parseDateParts(today);
      const firstDay = formatDateParts(year, month, 1);
      const lastDay = formatDateParts(year, month, daysInMonth(year, month));
      return {
        startDate: firstDay,
        endDate: lastDay,
      };
    }

    case "next-3-months": {
      const endDate = addDays(today, 90);
      return {
        startDate: today,
        endDate,
      };
    }

    case "next-6-months": {
      const endDate = addDays(today, 180);
      return {
        startDate: today,
        endDate,
      };
    }

    case "this-year": {
      const { year } = parseDateParts(today);
      const firstDay = formatDateParts(year, 1, 1);
      const lastDay = formatDateParts(year, 12, 31);
      return {
        startDate: firstDay,
        endDate: lastDay,
      };
    }

    case "custom":
      return customRange;
    case "year-month":
      return customRange;

    default:
      return { startDate: null, endDate: null };
  }
}
