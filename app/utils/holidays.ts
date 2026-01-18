export const HOLIDAY_DATES_BY_YEAR: Record<number, string[]> = {
  2026: [
    "2026-01-01",
    "2026-03-29",
    "2026-04-02",
    "2026-04-03",
    "2026-04-05",
    "2026-04-06",
    "2026-05-01",
    "2026-05-14",
    "2026-05-17",
    "2026-05-24",
    "2026-05-25",
    "2026-12-25",
    "2026-12-26",
  ],
  2027: [
    "2027-01-01",
    "2027-03-21",
    "2027-03-25",
    "2027-03-26",
    "2027-03-28",
    "2027-03-29",
    "2027-05-01",
    "2027-05-06",
    "2027-05-16",
    "2027-05-17",
    "2027-12-25",
    "2027-12-26",
  ],
};

export function getHolidayDatesForYears(years: number[]): Set<string> {
  const dates = new Set<string>();
  for (const year of years) {
    const list = HOLIDAY_DATES_BY_YEAR[year];
    if (!list) continue;
    for (const date of list) {
      dates.add(date);
    }
  }
  return dates;
}

export function getHolidayDatesForRange(dates: string[]): Set<string> {
  const years = new Set<number>();
  for (const date of dates) {
    const year = Number(date.slice(0, 4));
    if (!Number.isNaN(year)) {
      years.add(year);
    }
  }
  return getHolidayDatesForYears([...years]);
}
