"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnifiedPlanningTable } from "../../components/unified-planning-table/UnifiedPlanningTable";
import { Chip } from "../../components/Chip";
import { Button } from "../../components/Button";
import { FilterBar } from "../../components/FilterBar";
import { LocationFilter } from "../../components/LocationFilter";
import { EventFilter } from "../../components/EventFilter";
import { DateRangeChipFilter, DateRangePreset, DateRange, getDateRangeFromPreset } from "../../components/DateRangeChipFilter";
import { TooltipToggle, useTooltipPreference } from "../../components/TooltipToggle";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SegmentedControl } from "../../components/SegmentedControl";
import { daysInMonth, formatDateLocal, formatDateParts, nextDateString, parseDateParts } from "../../utils/date";

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  phases?: EventPhase[];
}

interface EventPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
}

interface Location {
  id: string;
  name: string;
}

interface LocationTagGroup {
  name: string;
  locationIds: string[];
}

interface EventLocation {
  id: string;
  eventId: string;
  locationId: string;
}

interface Allocation {
  id: string;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

interface DailyDemand {
  date: string;
  totalEffortHours: number;
}

interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

interface AllocationDraft {
  allocationId: string | null;
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

interface Evaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

interface CrossEventEvaluation {
  crossEventDailyDemand: DailyDemand[];
  crossEventCapacityComparison: DailyCapacityComparison[];
}

function PlanningToolbar({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function resolveVisibleDateRange(event: Event) {
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
}

export default function WorkspacePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [eventLocations, setEventLocations] = useState<EventLocation[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation>({
    dailyDemand: [],
    dailyCapacityComparison: [],
    workCategoryPressure: [],
  });
  const [crossEventEvaluation, setCrossEventEvaluation] = useState<CrossEventEvaluation>({
    crossEventDailyDemand: [],
    crossEventCapacityComparison: [],
  });
  const [drafts, setDrafts] = useState<AllocationDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorsByCellKey, setErrorsByCellKey] = useState<Record<string, string>>({});
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [locationTagGroups, setLocationTagGroups] = useState<LocationTagGroup[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("next-3-months");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [dateRangeSource, setDateRangeSource] = useState<"preset" | "custom" | "year-month">("preset");
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = previous month, +1 = next month
  const [tooltipsEnabled, setTooltipsEnabled] = useTooltipPreference();
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const selectedEventsForNavigation = useMemo(() => {
    return events
      .filter((event) => selectedEventIds.has(event.id))
      .sort((a, b) => {
        const startDelta = a.startDate.localeCompare(b.startDate);
        if (startDelta !== 0) return startDelta;
        return a.name.localeCompare(b.name);
      });
  }, [events, selectedEventIds]);

  const selectedEventKey = useMemo(() => {
    return [...selectedEventIds].sort().join("|");
  }, [selectedEventIds]);

  useEffect(() => {
    setCurrentEventIndex(-1);
    setFocusedEventId(null);
  }, [selectedEventKey]);

  useEffect(() => {
    if (selectedEventsForNavigation.length === 0) {
      setCurrentEventIndex(-1);
      setFocusedEventId(null);
    } else if (currentEventIndex >= selectedEventsForNavigation.length) {
      setCurrentEventIndex(selectedEventsForNavigation.length - 1);
    }
  }, [currentEventIndex, selectedEventsForNavigation.length]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedEventIds(new Set());
    setSelectedLocationIds(new Set());
    setCurrentEventIndex(-1);
    setFocusedEventId(null);
  }, []);

  const handlePresetChange = useCallback((preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset !== "custom") {
      setDateRangeSource("preset");
    }
    // Reset month offset when switching away from "this-month"
    if (preset !== "this-month") {
      setMonthOffset(0);
    }
  }, []);

  const handleCustomRangeChange = useCallback((range: DateRange) => {
    setCustomDateRange(range);
    setDateRangeSource("custom");
  }, []);

  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year);
    setDateRangeSource("year-month");
    if (year === null) {
      setSelectedMonth(null);
    }
  }, []);

  const handleMonthChange = useCallback((month: number | null) => {
    setSelectedMonth(month);
    setDateRangeSource("year-month");
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setMonthOffset((prev) => prev - 1);
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthOffset((prev) => prev + 1);
  }, []);

  const getCurrentMonthName = useCallback((): string => {
    const today = formatDateLocal(new Date());
    const { year, month } = parseDateParts(today);
    let targetYear = year;
    let targetMonth = month + monthOffset;
    
    // Handle year rollover
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthLabels[targetMonth - 1]} ${targetYear}`;
  }, [monthOffset]);

  const handleLocatePrevious = useCallback(() => {
    if (selectedEventsForNavigation.length === 0) return;
    const previousIndex = Math.max(currentEventIndex - 1, 0);
    if (previousIndex === currentEventIndex) return;
    const previousEvent = selectedEventsForNavigation[previousIndex];
    if (!previousEvent) return;
    setCurrentEventIndex(previousIndex);
    setFocusedEventId(previousEvent.id);
  }, [currentEventIndex, selectedEventsForNavigation]);

  const handleLocateNext = useCallback(() => {
    if (selectedEventsForNavigation.length === 0) return;
    const nextIndex = Math.min(currentEventIndex + 1, selectedEventsForNavigation.length - 1);
    if (nextIndex === currentEventIndex) return;
    const nextEvent = selectedEventsForNavigation[nextIndex];
    if (!nextEvent) return;
    setCurrentEventIndex(nextIndex);
    setFocusedEventId(nextEvent.id);
  }, [currentEventIndex, selectedEventsForNavigation]);

  // Load all data
  useEffect(() => {
    async function loadAllData() {
      setIsLoading(true);
      setError(null);

      try {
        const [
          eventsRes,
          workCategoriesRes,
          allocationsRes,
          locationsRes,
          eventLocationsRes,
        ] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/work-categories"),
          fetch("/api/schedule/allocations"),
          fetch("/api/locations"),
          fetch("/api/event-locations"),
        ]);

        if (!eventsRes.ok) {
          throw new Error("Failed to load events");
        }
        if (!workCategoriesRes.ok) {
          throw new Error("Failed to load work categories");
        }

        const eventsData: Event[] = await eventsRes.json();
        const activeEvents = eventsData.filter((e) => e.status === "ACTIVE");
        const workCategoriesData: WorkCategory[] = await workCategoriesRes.json();
        const allocationsData: Allocation[] = allocationsRes.ok ? await allocationsRes.json() : [];
        const locationsData: Location[] = locationsRes.ok ? await locationsRes.json() : [];
        const eventLocationsData: EventLocation[] = eventLocationsRes.ok
          ? await eventLocationsRes.json()
          : [];

        setEvents(activeEvents);
        setWorkCategories(workCategoriesData);
        setAllocations(allocationsData);
        setLocations(locationsData);
        setEventLocations(eventLocationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadAllData();
  }, []);

  // Load cross-event evaluation
  useEffect(() => {
    async function loadCrossEventEvaluation() {
      try {
        const res = await fetch('/api/schedule/evaluation/cross-event');
        if (res.ok) {
          const data = await res.json();
          setCrossEventEvaluation(data);
        }
      } catch (err) {
        console.warn("Failed to load cross-event evaluation:", err);
      }
    }

    loadCrossEventEvaluation();
  }, [allocations]);

  // Refresh evaluation after allocations change
  async function refreshEvaluation() {
    try {
      const res = await fetch('/api/schedule/evaluation/cross-event');
      if (res.ok) {
        const data = await res.json();
        setCrossEventEvaluation(data);
      }
    } catch (err) {
      console.warn("Failed to refresh evaluation:", err);
    }
  }

  // Allocation handlers
  function startCreateAllocation(workCategoryId: string, date: string) {
    const draftKey = `${workCategoryId}::${date}`;
    const existingDraft = drafts.find((d) => d.key === draftKey);
    if (existingDraft) return;

    const existingAllocation = allocations.find(
      (a) => a.workCategoryId === workCategoryId && a.date === date
    );
    if (existingAllocation) return;

    const draft: AllocationDraft = {
      allocationId: null,
      key: draftKey,
      workCategoryId,
      date,
      effortValue: 0,
      effortUnit: "HOURS",
    };

    setDrafts((prev) => [...prev, draft]);
  }

  function startEditAllocation(allocationId: string, workCategoryId: string, date: string, effortHours: number) {
    const draftKey = `${workCategoryId}::${date}`;
    const existingDraft = drafts.find((d) => d.key === draftKey);
    if (existingDraft) return;

    const draft: AllocationDraft = {
      allocationId,
      key: draftKey,
      workCategoryId,
      date,
      effortValue: effortHours,
      effortUnit: "HOURS",
    };

    setDrafts((prev) => [...prev, draft]);
  }

  function changeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") {
    setDrafts((prev) =>
      prev.map((d) => (d.key === draftKey ? { ...d, effortValue, effortUnit } : d))
    );
  }

  async function commitDraft(draftKey: string) {
    const draft = drafts.find((d) => d.key === draftKey);
    if (!draft) return;

    const workCategory = workCategories.find((wc) => wc.id === draft.workCategoryId);
    if (!workCategory) return;

    try {
      let res: Response;

      if (draft.allocationId) {
        res = await fetch(`/api/schedule/allocations/${draft.allocationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: workCategory.eventId,
            workCategoryId: draft.workCategoryId,
            date: draft.date,
            effortValue: draft.effortValue,
            effortUnit: draft.effortUnit,
          }),
        });
      } else {
        res = await fetch("/api/schedule/allocations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: workCategory.eventId,
            workCategoryId: draft.workCategoryId,
            date: draft.date,
            effortValue: draft.effortValue,
            effortUnit: draft.effortUnit,
          }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || "Failed to save allocation";
        setErrorsByCellKey((prev) => ({ ...prev, [draftKey]: errorMessage }));
        return;
      }

      const savedAllocation = await res.json();

      if (draft.allocationId) {
        setAllocations((prev) =>
          prev.map((a) => (a.id === draft.allocationId ? savedAllocation : a))
        );
      } else {
        setAllocations((prev) => [...prev, savedAllocation]);
      }

      setDrafts((prev) => prev.filter((d) => d.key !== draftKey));
      setErrorsByCellKey((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });

      await refreshEvaluation();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save allocation";
      setErrorsByCellKey((prev) => ({ ...prev, [draftKey]: errorMessage }));
    }
  }

  function cancelDraft(draftKey: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== draftKey));
    setErrorsByCellKey((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }

  async function deleteAllocation(allocationId: string) {
    try {
      const res = await fetch(`/api/schedule/allocations/${allocationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete allocation");
      }

      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
      await refreshEvaluation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete allocation");
    }
  }

  const eventsForYearOptions = useMemo(() => {
    let filtered = events;

    if (selectedEventIds.size > 0) {
      filtered = filtered.filter((event) => selectedEventIds.has(event.id));
    }

    const eventsWithSelectedLocations =
      selectedLocationIds.size > 0
        ? new Set(
            eventLocations
              .filter((el) => selectedLocationIds.has(el.locationId))
              .map((el) => el.eventId)
          )
        : null;

    if (eventsWithSelectedLocations) {
      filtered = filtered.filter((event) => eventsWithSelectedLocations.has(event.id));
    }

    return filtered;
  }, [events, eventLocations, selectedEventIds, selectedLocationIds]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const event of eventsForYearOptions) {
      const range = resolveVisibleDateRange(event);
      const startYear = parseDateParts(range.startDate).year;
      const endYear = parseDateParts(range.endDate).year;
      for (let year = startYear; year <= endYear; year += 1) {
        years.add(year);
      }
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [eventsForYearOptions]);

  useEffect(() => {
    if (selectedYear !== null && !availableYears.includes(selectedYear)) {
      setSelectedYear(null);
      setSelectedMonth(null);
    }
  }, [availableYears, selectedMonth, selectedYear]);

  // Calculate active date range from last user selection
  const activeDateRange = useMemo(() => {
    if (dateRangeSource === "year-month") {
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

    // Handle month offset for "this-month" preset
    if (dateRangePreset === "this-month" && monthOffset !== 0) {
      const today = formatDateLocal(new Date());
      const { year, month } = parseDateParts(today);
      let targetYear = year;
      let targetMonth = month + monthOffset;
      
      // Handle year rollover
      while (targetMonth < 1) {
        targetMonth += 12;
        targetYear -= 1;
      }
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
      
      const startDate = formatDateParts(targetYear, targetMonth, 1);
      const endDate = formatDateParts(targetYear, targetMonth, daysInMonth(targetYear, targetMonth));
      return { startDate, endDate };
    }

    return getDateRangeFromPreset(dateRangePreset, customDateRange);
  }, [customDateRange, dateRangePreset, dateRangeSource, selectedMonth, selectedYear, monthOffset]);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = events;

    if (selectedEventIds.size > 0) {
      filtered = filtered.filter((event) => selectedEventIds.has(event.id));
    }

    const eventsWithSelectedLocations =
      selectedLocationIds.size > 0
        ? new Set(
            eventLocations
              .filter((el) => selectedLocationIds.has(el.locationId))
              .map((el) => el.eventId)
          )
        : null;

    if (eventsWithSelectedLocations) {
      filtered = filtered.filter((event) => eventsWithSelectedLocations.has(event.id));
    }

    if (activeDateRange.startDate && activeDateRange.endDate) {
      filtered = filtered.filter((event) => {
        const eventStart = event.startDate;
        const eventEnd = event.endDate;
        return eventEnd >= activeDateRange.startDate! && eventStart <= activeDateRange.endDate!;
      });
    }

    const filteredEventIds = new Set(filtered.map((e) => e.id));
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
        if (activeDateRange.startDate && activeDateRange.endDate) {
          return dd.date >= activeDateRange.startDate && dd.date <= activeDateRange.endDate;
        }
        return true;
      }),
      dailyCapacityComparison: evaluation.dailyCapacityComparison.filter((dcc) => {
        if (activeDateRange.startDate && activeDateRange.endDate) {
          return dcc.date >= activeDateRange.startDate && dcc.date <= activeDateRange.endDate;
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
      const [workCategoryId] = cellKey.split('::');
      if (filteredWorkCategoryIds.has(workCategoryId)) {
        filteredErrorsByCellKey[cellKey] = error;
      }
    }

    // Filter locations to only those with filtered events
    const filteredLocationIds = new Set(
      filteredEventLocations.map((el) => el.locationId)
    );
    const filteredLocations = locations.filter((loc) =>
      filteredLocationIds.has(loc.id)
    );

    return {
      events: filtered,
      locations: filteredLocations,
      workCategories: filteredWorkCategories,
      allocations: filteredAllocations,
      evaluation: filteredEvaluation,
      eventLocations: filteredEventLocations,
      drafts: filteredDrafts,
      errorsByCellKey: filteredErrorsByCellKey,
    };
  }, [
    events,
    locations,
    workCategories,
    allocations,
    evaluation,
    eventLocations,
    drafts,
    errorsByCellKey,
    selectedEventIds,
    selectedLocationIds,
    activeDateRange,
  ]);

  // Calculate date range
  const { dates, minDate, maxDate } = useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;

    if (activeDateRange.startDate && activeDateRange.endDate) {
      min = activeDateRange.startDate;
      max = activeDateRange.endDate;
    } else {
      for (const event of filteredData.events) {
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
      while (current <= max) {
        datesArray.push(current);
        current = nextDateString(current);
      }
    }

    return { dates: datesArray, minDate: min, maxDate: max };
  }, [activeDateRange, filteredData.events]);

  const hasNavigationSelection = selectedEventsForNavigation.length > 0;
  const hasSelectionFilters =
    selectedEventIds.size > 0 || selectedLocationIds.size > 0;
  const canLocatePrevious = hasNavigationSelection && currentEventIndex > 0;
  const canLocateNext =
    hasNavigationSelection && currentEventIndex < selectedEventsForNavigation.length - 1;
  const navigatorLabel = !hasNavigationSelection
    ? "Locate"
    : currentEventIndex < 0
    ? `Locate (${selectedEventsForNavigation.length} selected)`
    : `Locate ${currentEventIndex + 1} of ${selectedEventsForNavigation.length}`;
  const navigatorTitle =
    currentEventIndex >= 0 ? selectedEventsForNavigation[currentEventIndex]?.name : undefined;

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
      }}>
        <div style={{
          padding: "var(--space-xl) var(--space-2xl)",
          backgroundColor: "var(--surface-default)",
          border: "var(--border-width-thin) solid var(--border-secondary)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          color: "var(--text-secondary)",
          fontSize: "var(--font-size-md)",
          fontWeight: "var(--font-weight-medium)",
        }}>
          Loading workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
      }}>
        <div style={{
          padding: "var(--space-xl) var(--space-2xl)",
          backgroundColor: "var(--surface-default)",
          border: "var(--border-width-thin) solid var(--status-error)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          color: "var(--status-error)",
          fontSize: "var(--font-size-md)",
          fontWeight: "var(--font-weight-medium)",
        }}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (events.length === 0 && !isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
      }}>
        <div style={{
          padding: "var(--space-xl) var(--space-2xl)",
          backgroundColor: "var(--surface-default)",
          border: "var(--border-width-thin) solid var(--border-secondary)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          color: "var(--text-secondary)",
          fontSize: "var(--font-size-md)",
          fontWeight: "var(--font-weight-medium)",
        }}>
          No active events
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
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <div style={{ marginBottom: "var(--space-xs)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Resource Planning
          </div>
          <h1 style={{
            margin: "0 0 var(--space-sm) 0",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}>
            Planning Workspace
          </h1>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-tertiary)"
          }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              padding: "4px 12px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "var(--radius-full)",
            }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              padding: "4px 12px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "var(--radius-full)",
            }}>
              {workCategories.length} categor{workCategories.length !== 1 ? 'ies' : 'y'}
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              padding: "4px 12px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "var(--radius-full)",
            }}>
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {(events.length > 0 || locations.length > 0) && (
          <>
            <FilterBar>
              <SegmentedControl
                style={{
                  flexWrap: "wrap",
                  gap: "var(--space-sm)",
                }}
              >
                {events.length > 0 && (
                  <EventFilter
                    events={events}
                    selectedEventIds={selectedEventIds}
                    onSelectionChange={setSelectedEventIds}
                  />
                )}
                {locations.length > 0 && (
                  <LocationFilter
                    locations={locations}
                    selectedLocationIds={selectedLocationIds}
                    onSelectionChange={setSelectedLocationIds}
                    onTagsChange={setLocationTagGroups}
                  />
                )}
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
              {hasNavigationSelection && (
                <SegmentedControl
                  style={{
                    marginLeft: "var(--space-sm)",
                  }}
                  title={navigatorTitle}
                >
                  <Button
                    onClick={handleLocatePrevious}
                    disabled={!canLocatePrevious}
                    aria-label="Locate previous selected event"
                    variant="segmented"
                    size="sm"
                    style={{
                      padding: "6px 14px",
                    }}
                  >
                    Prev
                  </Button>
                  <Button
                    onClick={handleLocateNext}
                    disabled={!canLocateNext}
                    aria-label="Locate next selected event"
                    variant="segmented"
                    size="sm"
                    style={{
                      padding: "6px 14px",
                    }}
                  >
                    Next
                  </Button>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--text-tertiary)",
                      padding: "0 var(--space-sm)",
                      minWidth: "100px",
                    }}
                  >
                    {navigatorLabel}
                  </span>
                </SegmentedControl>
              )}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <TooltipToggle enabled={tooltipsEnabled} onChange={setTooltipsEnabled} />
                <ThemeToggle />
              </div>
            </FilterBar>

            {locationTagGroups.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  flexWrap: "wrap",
                  marginBottom: "var(--space-md)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--text-tertiary)",
                    marginRight: "var(--space-xs)",
                  }}
                >
                  Location Tags:
                </span>
                <SegmentedControl
                  style={{
                    flexWrap: "wrap",
                    gap: "var(--space-sm)",
                  }}
                >
                  {locationTagGroups.map((group) => {
                    const tagCount = group.locationIds.length;
                    const matchingCount = group.locationIds.filter((id) =>
                      selectedLocationIds.has(id)
                    ).length;
                    const isTagSelected = tagCount > 0 && matchingCount === tagCount;
                    return (
                      <Chip
                        key={group.name}
                        selected={isTagSelected}
                        disabled={tagCount === 0}
                        onClick={() => {
                          if (tagCount === 0) return;
                          if (matchingCount === tagCount) {
                            const nextSelection = new Set(selectedLocationIds);
                            for (const id of group.locationIds) {
                              nextSelection.delete(id);
                            }
                            setSelectedLocationIds(nextSelection);
                            return;
                          }
                          const nextSelection = new Set(selectedLocationIds);
                          for (const id of group.locationIds) {
                            nextSelection.add(id);
                          }
                          setSelectedLocationIds(nextSelection);
                        }}
                        variant="segmented"
                      >
                        {group.name} ({tagCount})
                      </Chip>
                    );
                  })}
                </SegmentedControl>
              </div>
            )}

            <div style={{ marginBottom: "var(--space-md)" }}>
              <DateRangeChipFilter
                selectedPreset={dateRangePreset}
                customRange={customDateRange}
                onPresetChange={handlePresetChange}
                onCustomRangeChange={handleCustomRangeChange}
                availableYears={availableYears}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={handleYearChange}
                onMonthChange={handleMonthChange}
                monthOffset={monthOffset}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
              />
            </div>
          </>
        )}
      </PlanningToolbar>

      {/* Unified Planning Table - Single scroll container */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <UnifiedPlanningTable
          events={filteredData.events}
          locations={filteredData.locations}
          eventLocations={filteredData.eventLocations}
          dates={dates}
          workCategories={filteredData.workCategories}
          allocations={filteredData.allocations}
          evaluation={filteredData.evaluation}
          crossEventEvaluation={crossEventEvaluation}
          drafts={filteredData.drafts}
          errorsByCellKey={filteredData.errorsByCellKey}
          tooltipsEnabled={tooltipsEnabled}
          focusedEventId={focusedEventId}
          onLocateFailure={showToast}
          onStartCreate={startCreateAllocation}
          onStartEdit={startEditAllocation}
          onChangeDraft={changeDraft}
          onCommit={commitDraft}
          onCancel={cancelDraft}
          onDelete={deleteAllocation}
        />
      </div>
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: "var(--space-xl)",
            bottom: "var(--space-xl)",
            padding: "12px 20px",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-thin) solid var(--border-secondary)",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            zIndex: 2000,
            animation: "dropdownEnter 200ms var(--ease-spring)",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
