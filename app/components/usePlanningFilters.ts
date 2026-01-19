"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, DateRangePreset, getDateRangeFromPreset } from "./dateRange";
import { daysInMonth, formatDateLocal, formatDateParts, nextDateString, parseDateParts } from "../utils/date";

export interface PlanningEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  phases?: EventPhase[];
}

export interface EventPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
}

export interface Location {
  id: string;
  name: string;
}

export interface EventLocation {
  id: string;
  eventId: string;
  locationId: string;
}

export interface Allocation {
  id: string;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

export interface DailyDemand {
  date: string;
  totalEffortHours: number;
}

export interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

export interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

export interface AllocationDraft {
  allocationId: string | null;
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

export interface Evaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

type DateRangeSource = "preset" | "custom" | "year-month";

export interface PlanningFilterInput {
  events: PlanningEvent[];
  locations: Location[];
  workCategories: WorkCategory[];
  eventLocations: EventLocation[];
  allocations: Allocation[];
  evaluation: Evaluation;
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
}

export interface FilteredPlanningData {
  events: PlanningEvent[];
  locations: Location[];
  workCategories: WorkCategory[];
  allocations: Allocation[];
  evaluation: Evaluation;
  eventLocations: EventLocation[];
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
}

const resolveVisibleDateRange = (event: PlanningEvent) => {
  let minDate = event.startDate;
  let maxDate = event.endDate;

  if (event.phases) {
    for (const phase of event.phases) {
      if (phase.startDate < minDate) {
        minDate = phase.startDate;
      }
      if (phase.endDate > maxDate) {
        maxDate = phase.endDate;
      }
    }
  }

  return { startDate: minDate, endDate: maxDate };
};

export function usePlanningFilters({
  events,
  locations,
  workCategories,
  eventLocations,
  allocations,
  evaluation,
  drafts,
  errorsByCellKey,
}: PlanningFilterInput) {
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("next-3-months");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [dateRangeSource, setDateRangeSource] = useState<DateRangeSource>("preset");
  const [monthOffset, setMonthOffset] = useState(0);
  const [isRangeLocked, setIsRangeLocked] = useState(true);
  const lastPresetRef = useRef<DateRangePreset>("next-3-months");

  const handlePresetChange = useCallback((preset: DateRangePreset) => {
    setDateRangePreset(preset);
    setIsRangeLocked(true);
    if (preset === "year-month") {
      setDateRangeSource("year-month");
      return;
    }
    lastPresetRef.current = preset;
    if (preset === "this-month") {
      const today = formatDateLocal(new Date());
      const { year, month } = parseDateParts(today);
      setSelectedYear(year);
      setSelectedMonth(month);
      setMonthOffset(0);
    } else {
      setSelectedYear(null);
      setSelectedMonth(null);
    }
    if (preset !== "custom") {
      setDateRangeSource("preset");
    }
    if (preset !== "this-month") {
      setMonthOffset(0);
    }
  }, []);

  const handleCustomRangeChange = useCallback((range: DateRange) => {
    setCustomDateRange(range);
    setIsRangeLocked(true);
    setDateRangeSource("custom");
  }, []);

  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year);
    setIsRangeLocked(true);
    if (year === null) {
      setSelectedMonth(null);
      setDateRangeSource("preset");
      setDateRangePreset(lastPresetRef.current);
      return;
    }
    setDateRangeSource("year-month");
    setDateRangePreset("year-month");
    setMonthOffset(0);
  }, []);

  const handleMonthChange = useCallback((month: number | null) => {
    setSelectedMonth(month);
    setIsRangeLocked(true);
    if (month === null) {
      setDateRangeSource("preset");
      setDateRangePreset(lastPresetRef.current);
      return;
    }
    setDateRangeSource("year-month");
    setDateRangePreset("year-month");
    setMonthOffset(0);
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setMonthOffset((prev) => {
      const nextOffset = prev - 1;
      if (dateRangePreset === "this-month") {
        const today = formatDateLocal(new Date());
        const { year, month } = parseDateParts(today);
        let targetYear = year;
        let targetMonth = month + nextOffset;
        while (targetMonth < 1) {
          targetMonth += 12;
          targetYear -= 1;
        }
        while (targetMonth > 12) {
          targetMonth -= 12;
          targetYear += 1;
        }
        setSelectedYear(targetYear);
        setSelectedMonth(targetMonth);
      }
      return nextOffset;
    });
  }, [dateRangePreset]);

  const handleNextMonth = useCallback(() => {
    setMonthOffset((prev) => {
      const nextOffset = prev + 1;
      if (dateRangePreset === "this-month") {
        const today = formatDateLocal(new Date());
        const { year, month } = parseDateParts(today);
        let targetYear = year;
        let targetMonth = month + nextOffset;
        while (targetMonth < 1) {
          targetMonth += 12;
          targetYear -= 1;
        }
        while (targetMonth > 12) {
          targetMonth -= 12;
          targetYear += 1;
        }
        setSelectedYear(targetYear);
        setSelectedMonth(targetMonth);
      }
      return nextOffset;
    });
  }, [dateRangePreset]);

  const handleYearMonthPrevious = useCallback(() => {
    if (selectedYear === null || selectedMonth === null) return;
    let year = selectedYear;
    let month = selectedMonth - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    setSelectedYear(year);
    setSelectedMonth(month);
    setDateRangeSource("year-month");
    setDateRangePreset("year-month");
  }, [selectedMonth, selectedYear]);

  const handleYearMonthNext = useCallback(() => {
    if (selectedYear === null || selectedMonth === null) return;
    let year = selectedYear;
    let month = selectedMonth + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setSelectedYear(year);
    setSelectedMonth(month);
    setDateRangeSource("year-month");
    setDateRangePreset("year-month");
  }, [selectedMonth, selectedYear]);

  const eventIdsForSelectedLocations = useMemo(() => {
    if (selectedLocationIds.size === 0) {
      return null;
    }
    const ids = new Set<string>();
    for (const el of eventLocations) {
      if (selectedLocationIds.has(el.locationId)) {
        ids.add(el.eventId);
      }
    }
    return ids;
  }, [eventLocations, selectedLocationIds]);

  const applySelectionFilters = useCallback(
    (sourceEvents: PlanningEvent[]) => {
      let filtered = sourceEvents;

      if (selectedEventIds.size > 0) {
        filtered = filtered.filter((event) => selectedEventIds.has(event.id));
      }

      if (eventIdsForSelectedLocations) {
        filtered = filtered.filter((event) => eventIdsForSelectedLocations.has(event.id));
      }

      return filtered;
    },
    [eventIdsForSelectedLocations, selectedEventIds]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const event of events) {
      const range = resolveVisibleDateRange(event);
      const startYear = parseDateParts(range.startDate).year;
      const endYear = parseDateParts(range.endDate).year;
      for (let year = startYear; year <= endYear; year += 1) {
        years.add(year);
      }
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [events]);

  useEffect(() => {
    if (selectedYear !== null && !availableYears.includes(selectedYear)) {
      setSelectedYear(null);
      setSelectedMonth(null);
    }
  }, [availableYears, selectedMonth, selectedYear]);

  const activeDateRange = useMemo(() => {
    if (dateRangeSource === "year-month") {
      if (availableYears.length > 0 && selectedYear !== null && !availableYears.includes(selectedYear)) {
        return getDateRangeFromPreset(lastPresetRef.current, customDateRange);
      }
      if (selectedYear !== null) {
        if (selectedMonth !== null) {
          const startDate = formatDateParts(selectedYear, selectedMonth, 1);
          const endDate = formatDateParts(
            selectedYear,
            selectedMonth,
            daysInMonth(selectedYear, selectedMonth)
          );
          return { startDate, endDate };
        }
        return {
          startDate: formatDateParts(selectedYear, 1, 1),
          endDate: formatDateParts(selectedYear, 12, 31),
        };
      }
      return getDateRangeFromPreset(dateRangePreset, customDateRange);
    }

    if (dateRangeSource === "custom") {
      return customDateRange;
    }

    if (dateRangePreset === "this-month" && monthOffset !== 0) {
      const today = formatDateLocal(new Date());
      const { year, month } = parseDateParts(today);
      let targetYear = year;
      let targetMonth = month + monthOffset;

      while (targetMonth < 1) {
        targetMonth += 12;
        targetYear -= 1;
      }
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }

      const startDate = formatDateParts(targetYear, targetMonth, 1);
      const endDate = formatDateParts(
        targetYear,
        targetMonth,
        daysInMonth(targetYear, targetMonth)
      );
      return { startDate, endDate };
    }

    return getDateRangeFromPreset(dateRangePreset, customDateRange);
  }, [
    availableYears,
    customDateRange,
    dateRangePreset,
    dateRangeSource,
    monthOffset,
    selectedMonth,
    selectedYear,
  ]);

  const hasActiveDateRange = Boolean(activeDateRange.startDate && activeDateRange.endDate);

  const browseYear = useMemo(() => {
    if (selectedYear !== null) {
      return selectedYear;
    }
    const anchorDate = activeDateRange.startDate ?? activeDateRange.endDate;
    if (anchorDate) {
      return parseDateParts(anchorDate).year;
    }
    const { year: todayYear } = parseDateParts(formatDateLocal(new Date()));
    if (availableYears.length > 0) {
      if (availableYears.includes(todayYear)) {
        return todayYear;
      }
      return availableYears[availableYears.length - 1];
    }
    return todayYear;
  }, [activeDateRange.endDate, activeDateRange.startDate, availableYears, selectedYear]);

  const viewDateRange = useMemo(() => {
    if (isRangeLocked) {
      return activeDateRange;
    }
    return {
      startDate: formatDateParts(browseYear, 1, 1),
      endDate: formatDateParts(browseYear, 12, 31),
    };
  }, [activeDateRange, browseYear, isRangeLocked]);

  const isRangeFilteringActive = isRangeLocked && hasActiveDateRange;

  const applyDateRangeFilter = useCallback(
    (sourceEvents: PlanningEvent[]) => {
      if (!isRangeFilteringActive) {
        return sourceEvents;
      }
      return sourceEvents.filter((event) => {
        const eventRange = resolveVisibleDateRange(event);
        return (
          eventRange.endDate >= activeDateRange.startDate! &&
          eventRange.startDate <= activeDateRange.endDate!
        );
      });
    },
    [activeDateRange.endDate, activeDateRange.startDate, isRangeFilteringActive]
  );

  const eventIdsInActiveDateRange = useMemo(() => {
    if (!isRangeFilteringActive) {
      return null;
    }
    const ids = new Set<string>();
    for (const event of events) {
      const range = resolveVisibleDateRange(event);
      if (
        range.endDate >= activeDateRange.startDate &&
        range.startDate <= activeDateRange.endDate
      ) {
        ids.add(event.id);
      }
    }
    return ids;
  }, [activeDateRange.endDate, activeDateRange.startDate, events, isRangeFilteringActive]);

  const filteredEvents = useMemo(() => {
    return applyDateRangeFilter(applySelectionFilters(events));
  }, [applyDateRangeFilter, applySelectionFilters, events]);

  const filteredData = useMemo<FilteredPlanningData>(() => {
    const filteredEventIds = new Set(filteredEvents.map((e) => e.id));
    const filteredWorkCategories = workCategories.filter((wc) => filteredEventIds.has(wc.eventId));
    const filteredAllocations = allocations.filter((a) => filteredEventIds.has(a.eventId));
    const filteredEventLocations = eventLocations.filter((el) => {
      if (!filteredEventIds.has(el.eventId)) {
        return false;
      }
      if (selectedLocationIds.size > 0 && !selectedLocationIds.has(el.locationId)) {
        return false;
      }
      return true;
    });

    const filteredWorkCategoryIds = new Set(filteredWorkCategories.map((wc) => wc.id));
    const filteredEvaluation: Evaluation = {
      dailyDemand: evaluation.dailyDemand.filter((dd) => {
        if (viewDateRange.startDate && viewDateRange.endDate) {
          return dd.date >= viewDateRange.startDate && dd.date <= viewDateRange.endDate;
        }
        return true;
      }),
      dailyCapacityComparison: evaluation.dailyCapacityComparison.filter((dcc) => {
        if (viewDateRange.startDate && viewDateRange.endDate) {
          return dcc.date >= viewDateRange.startDate && dcc.date <= viewDateRange.endDate;
        }
        return true;
      }),
      workCategoryPressure: evaluation.workCategoryPressure.filter((wcp) =>
        filteredWorkCategoryIds.has(wcp.workCategoryId)
      ),
    };

    const filteredDrafts = drafts.filter((d) => filteredWorkCategoryIds.has(d.workCategoryId));

    const filteredErrorsByCellKey: Record<string, string> = {};
    for (const [cellKey, error] of Object.entries(errorsByCellKey)) {
      const [workCategoryId] = cellKey.split("::");
      if (filteredWorkCategoryIds.has(workCategoryId)) {
        filteredErrorsByCellKey[cellKey] = error;
      }
    }

    const filteredLocationIds = new Set(filteredEventLocations.map((el) => el.locationId));
    const filteredLocations = locations.filter((loc) => filteredLocationIds.has(loc.id));

    return {
      events: filteredEvents,
      locations: filteredLocations,
      workCategories: filteredWorkCategories,
      allocations: filteredAllocations,
      evaluation: filteredEvaluation,
      eventLocations: filteredEventLocations,
      drafts: filteredDrafts,
      errorsByCellKey: filteredErrorsByCellKey,
    };
  }, [
    viewDateRange.endDate,
    viewDateRange.startDate,
    allocations,
    drafts,
    errorsByCellKey,
    evaluation.dailyCapacityComparison,
    evaluation.dailyDemand,
    evaluation.workCategoryPressure,
    eventLocations,
    filteredEvents,
    locations,
    selectedLocationIds,
    workCategories,
  ]);

  const { dates, minDate, maxDate } = useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;

    if (viewDateRange.startDate && viewDateRange.endDate) {
      min = viewDateRange.startDate;
      max = viewDateRange.endDate;
    } else {
      for (const event of filteredEvents) {
        const range = resolveVisibleDateRange(event);
        if (!min || range.startDate < min) {
          min = range.startDate;
        }
        if (!max || range.endDate > max) {
          max = range.endDate;
        }
      }
    }

    const datesArray: string[] = [];
    if (min && max) {
      let current = min;
      let guard = 0;
      while (current <= max) {
        datesArray.push(current);
        const next = nextDateString(current);
        if (next === current) {
          console.warn("Date range loop stopped due to invalid date:", current);
          break;
        }
        current = next;
        guard += 1;
        if (guard > 20000) {
          console.warn("Date range loop exceeded guard limit.");
          break;
        }
      }
    }

    return { dates: datesArray, minDate: min, maxDate: max };
  }, [filteredEvents, viewDateRange.endDate, viewDateRange.startDate]);

  const hasSelectionFilters = selectedEventIds.size > 0 || selectedLocationIds.size > 0;

  return {
    selectedLocationIds,
    setSelectedLocationIds,
    selectedEventIds,
    setSelectedEventIds,
    dateRangePreset,
    customDateRange,
    selectedYear,
    selectedMonth,
    monthOffset,
    availableYears,
    activeDateRange,
    isRangeLocked,
    setIsRangeLocked,
    filteredData,
    dates,
    minDate,
    maxDate,
    hasSelectionFilters,
    eventIdsForSelectedLocations,
    eventIdsInActiveDateRange,
    handlePresetChange,
    handleCustomRangeChange,
    handleYearChange,
    handleMonthChange,
    handlePreviousMonth,
    handleNextMonth,
    handleYearMonthPrevious,
    handleYearMonthNext,
  };
}
