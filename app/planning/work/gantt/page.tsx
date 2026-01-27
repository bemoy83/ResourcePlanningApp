"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WorkGanttCalendar } from "../../../components/WorkGanttCalendar";
import { Button } from "../../../components/Button";
import { EventFilter } from "../../../components/EventFilter";
import { TooltipToggle, useTooltipPreference } from "../../../components/TooltipToggle";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { UnifiedDateRangeButton } from "../../../components/UnifiedDateRangeButton";
import { SegmentedControl } from "../../../components/SegmentedControl";
import {
  DateRange,
  DateRangePreset,
  getDateRangeFromPreset,
} from "../../../components/dateRange";
import {
  addDays,
  daysInMonth,
  formatDateLocal,
  formatDateParts,
  nextDateString,
  parseDateParts,
} from "../../../utils/date";
import { getHolidayDatesForRange } from "../../../utils/holidays";

interface PlanningEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
  phase?: string;
}

interface Allocation {
  id: string;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

function PlanningToolbar({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export default function WorkGanttPage() {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useTooltipPreference();
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  // Date range state - initialize with a range centered on today (2 weeks before and after)
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("custom");
  const [customDateRange, setCustomDateRange] = useState<DateRange>(() => {
    const today = formatDateLocal(new Date());
    const startDate = addDays(today, -14); // 2 weeks before today
    const endDate = addDays(today, 14); // 2 weeks after today
    return {
      startDate,
      endDate,
    };
  });
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isRangeLocked, setIsRangeLocked] = useState(false);

  // Load all data
  useEffect(() => {
    async function loadAllData() {
      setIsLoading(true);
      setError(null);

      try {
        const [eventsRes, workCategoriesRes, allocationsRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/work-categories"),
          fetch("/api/schedule/allocations"),
        ]);

        if (!eventsRes.ok) {
          throw new Error("Failed to load events");
        }
        if (!workCategoriesRes.ok) {
          throw new Error("Failed to load work categories");
        }

        const eventsData: PlanningEvent[] = await eventsRes.json();
        const activeEvents = eventsData.filter((e) => e.status === "ACTIVE");
        const workCategoriesData: WorkCategory[] = await workCategoriesRes.json();
        const allocationsData: Allocation[] = allocationsRes.ok
          ? await allocationsRes.json()
          : [];

        setEvents(activeEvents);
        setWorkCategories(workCategoriesData);
        setAllocations(allocationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadAllData();
  }, []);

  // Calculate available years from events
  const availableYears = useMemo(() => {
    if (events.length === 0) return [];
    const years = new Set<number>();
    for (const event of events) {
      const startYear = new Date(event.startDate).getFullYear();
      const endYear = new Date(event.endDate).getFullYear();
      years.add(startYear);
      if (endYear !== startYear) {
        years.add(endYear);
      }
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [events]);

  // Initialize date range based on events
  useEffect(() => {
    if (events.length === 0) return;

    if (selectedYear === null || selectedMonth === null) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Use current year/month if available, otherwise use first event's date
      if (availableYears.includes(currentYear)) {
        setSelectedYear(currentYear);
        setSelectedMonth(currentMonth);
      } else if (availableYears.length > 0) {
        const firstEvent = events[0];
        const firstEventDate = new Date(firstEvent.startDate);
        setSelectedYear(firstEventDate.getFullYear());
        setSelectedMonth(firstEventDate.getMonth() + 1);
      }
    }
  }, [events, availableYears, selectedYear, selectedMonth]);

  // Calculate active date range
  const activeDateRange = useMemo(() => {
    if (dateRangePreset === "custom") {
      return customDateRange;
    }

    if (dateRangePreset === "year-month" && selectedYear !== null && selectedMonth !== null) {
      const adjustedMonth = selectedMonth + monthOffset;
      let finalYear = selectedYear;
      let finalMonth = adjustedMonth;

      while (finalMonth > 12) {
        finalMonth -= 12;
        finalYear += 1;
      }
      while (finalMonth < 1) {
        finalMonth += 12;
        finalYear -= 1;
      }

      const numDays = daysInMonth(finalYear, finalMonth);
      const startDate = formatDateParts(finalYear, finalMonth, 1);
      const endDate = formatDateParts(finalYear, finalMonth, numDays);
      return { startDate, endDate };
    }

    return getDateRangeFromPreset(dateRangePreset, customDateRange);
  }, [dateRangePreset, customDateRange, selectedYear, selectedMonth, monthOffset]);

  // Generate dates array for timeline
  const dates = useMemo(() => {
    if (!activeDateRange.startDate || !activeDateRange.endDate) {
      return [];
    }

    const result: string[] = [];
    let current = activeDateRange.startDate;
    const end = activeDateRange.endDate;

    while (current <= end) {
      result.push(current);
      current = nextDateString(current);
    }

    return result;
  }, [activeDateRange]);

  // Filter data based on selected events and date range
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by selected events
    if (selectedEventIds.size > 0) {
      filtered = filtered.filter((e) => selectedEventIds.has(e.id));
    }

    // Filter by date range if locked
    if (isRangeLocked && activeDateRange.startDate && activeDateRange.endDate) {
      filtered = filtered.filter((event) => {
        return !(
          event.endDate < activeDateRange.startDate! ||
          event.startDate > activeDateRange.endDate!
        );
      });
    }

    return filtered;
  }, [events, selectedEventIds, isRangeLocked, activeDateRange]);

  const filteredWorkCategories = useMemo(() => {
    const eventIds = new Set(filteredEvents.map((e) => e.id));
    return workCategories.filter((wc) => eventIds.has(wc.eventId));
  }, [workCategories, filteredEvents]);

  const filteredAllocations = useMemo(() => {
    const workCategoryIds = new Set(filteredWorkCategories.map((wc) => wc.id));
    return allocations.filter((a) => workCategoryIds.has(a.workCategoryId));
  }, [allocations, filteredWorkCategories]);

  // Build timeline layout
  const timeline = useMemo(() => {
    const holidayDates = getHolidayDatesForRange(dates);
    return {
      dates,
      dateColumnWidth: 60,
      timelineOriginPx: 200,
      dateMeta: undefined, // Will be calculated in component
    };
  }, [dates]);

  // Date range handlers
  const handlePresetChange = useCallback((preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset === "year-month") {
      setMonthOffset(0);
    }
  }, []);

  const handleCustomRangeChange = useCallback((range: DateRange) => {
    setCustomDateRange(range);
  }, []);

  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year);
    setMonthOffset(0);
  }, []);

  const handleMonthChange = useCallback((month: number | null) => {
    setSelectedMonth(month);
    setMonthOffset(0);
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setMonthOffset((prev) => prev - 1);
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthOffset((prev) => prev + 1);
  }, []);

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
    setMonthOffset(0);
  }, [selectedYear, selectedMonth]);

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
    setMonthOffset(0);
  }, [selectedYear, selectedMonth]);

  const handleClearFilters = useCallback(() => {
    setSelectedEventIds(new Set());
  }, []);

  const hasSelectionFilters = selectedEventIds.size > 0;

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            padding: "var(--space-xl) var(--space-2xl)",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-thin) solid var(--border-secondary)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          Loading work gantt...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            padding: "var(--space-xl) var(--space-2xl)",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-thin) solid var(--status-error)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--status-error)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  if (events.length === 0 && !isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            padding: "var(--space-xl) var(--space-2xl)",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-thin) solid var(--border-secondary)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          No active events found.{" "}
          <Link
            href="/data/events/import"
            style={{ color: "var(--status-info)", textDecoration: "underline" }}
          >
            Import events
          </Link>{" "}
          to get started.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "var(--space-xl)",
        maxWidth: "100%",
        backgroundColor: "var(--bg-primary)",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <PlanningToolbar>
        <div
          style={{
            marginBottom: "var(--space-xl)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                marginBottom: "var(--space-xs)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Work Visualization
            </div>
            <h1
              style={{
                margin: "0 0 var(--space-sm) 0",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "var(--letter-spacing-tight)",
              }}
            >
              Work Gantt View
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <Link
              href="/workspace"
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                textDecoration: "none",
                color: "var(--text-primary)",
                backgroundColor: "var(--surface-default)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Workspace
            </Link>
            <Link
              href="/planning/work"
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                textDecoration: "none",
                color: "var(--text-primary)",
                backgroundColor: "var(--surface-default)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Add Work Categories
            </Link>
            <TooltipToggle enabled={tooltipsEnabled} onChange={setTooltipsEnabled} />
            <ThemeToggle />
          </div>
        </div>

        {events.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
              alignItems: "center",
              marginBottom: "var(--space-lg)",
            }}
          >
            <SegmentedControl
              style={{
                flexWrap: "wrap",
                gap: "var(--space-sm)",
                minHeight: "36px",
              }}
            >
              <EventFilter
                events={events}
                selectedEventIds={selectedEventIds}
                onSelectionChange={setSelectedEventIds}
              />
              <Button
                onClick={handleClearFilters}
                disabled={!hasSelectionFilters}
                variant="segmented"
                size="sm"
                style={{
                  padding: "6px 14px",
                  opacity: hasSelectionFilters ? 1 : 0.6,
                }}
              >
                Clear Filters
              </Button>
            </SegmentedControl>
            <UnifiedDateRangeButton
              selectedPreset={dateRangePreset}
              customRange={customDateRange}
              onPresetChange={handlePresetChange}
              onCustomRangeChange={handleCustomRangeChange}
              availableYears={availableYears}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
              activeDateRange={activeDateRange}
              isRangeLocked={isRangeLocked}
              onRangeLockChange={setIsRangeLocked}
              monthOffset={monthOffset}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onYearMonthPrevious={handleYearMonthPrevious}
              onYearMonthNext={handleYearMonthNext}
            />
          </div>
        )}
      </PlanningToolbar>

      {/* Work Gantt Calendar */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <WorkGanttCalendar
          events={filteredEvents}
          workCategories={filteredWorkCategories}
          allocations={filteredAllocations}
          timeline={timeline}
          tooltipsEnabled={tooltipsEnabled}
        />
      </div>
    </div>
  );
}
