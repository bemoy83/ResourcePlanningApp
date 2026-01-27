"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UnifiedPlanningTable } from "../../components/unified-planning-table/UnifiedPlanningTable";
import { Chip } from "../../components/Chip";
import { Button } from "../../components/Button";
import { FilterBar } from "../../components/FilterBar";
import { LocationFilter } from "../../components/LocationFilter";
import { EventFilter } from "../../components/EventFilter";
import { UnifiedDateRangeButton } from "../../components/UnifiedDateRangeButton";
import { TooltipToggle, useTooltipPreference } from "../../components/TooltipToggle";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
  usePlanningFilters,
  Allocation,
  AllocationDraft,
  DailyCapacityComparison,
  DailyDemand,
  Evaluation,
  EventLocation,
  Location,
  PlanningEvent,
  WorkCategory,
} from "../../components/usePlanningFilters";

interface LocationTagGroup {
  name: string;
  locationIds: string[];
}

interface CrossEventEvaluation {
  crossEventDailyDemand: DailyDemand[];
  crossEventCapacityComparison: DailyCapacityComparison[];
}

function PlanningToolbar({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export default function WorkspacePage() {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
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
  const [locationTagGroups, setLocationTagGroups] = useState<LocationTagGroup[]>([]);
  const [tooltipsEnabled, setTooltipsEnabled] = useTooltipPreference();
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const lastAlertKeyRef = useRef<string | null>(null);

  const {
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
  } = usePlanningFilters({
    events,
    locations,
    workCategories,
    eventLocations,
    allocations,
    evaluation,
    drafts,
    errorsByCellKey,
  });

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

  const selectedLocationKey = useMemo(() => {
    return [...selectedLocationIds].sort().join("|");
  }, [selectedLocationIds]);

  const filterAlertKey = useMemo(() => {
    return [
      selectedEventKey,
      selectedLocationKey,
      activeDateRange.startDate ?? "",
      activeDateRange.endDate ?? "",
    ].join("::");
  }, [activeDateRange.endDate, activeDateRange.startDate, selectedEventKey, selectedLocationKey]);
  const hasActiveDateRange = Boolean(activeDateRange.startDate && activeDateRange.endDate);

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

  useEffect(() => {
    if (filteredData.events.length > 0 && toastMessage) {
      setToastMessage(null);
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    }
  }, [filteredData.events.length, toastMessage]);

  useEffect(() => {
    if (lastAlertKeyRef.current === filterAlertKey) {
      return;
    }
    lastAlertKeyRef.current = filterAlertKey;
    if (!filterAlertKey) return;
    if (filteredData.events.length > 0) {
      return;
    }
    if (
      selectedEventIds.size === 0 &&
      selectedLocationIds.size === 0 &&
      !hasActiveDateRange
    ) {
      return;
    }

    const hasDateRange = isRangeLocked && hasActiveDateRange;
    const hasEventSelection = selectedEventIds.size > 0;
    const hasLocationSelection = selectedLocationIds.size > 0;

    if (hasEventSelection && hasDateRange && eventIdsInActiveDateRange) {
      const hasEventInRange = [...selectedEventIds].some((id) =>
        eventIdsInActiveDateRange.has(id)
      );
      if (!hasEventInRange) {
        showToast("Selected events are outside the current date range.");
        return;
      }
    }

    if (hasLocationSelection && hasDateRange && eventIdsForSelectedLocations && eventIdsInActiveDateRange) {
      const hasLocationInRange = [...eventIdsForSelectedLocations].some((id) =>
        eventIdsInActiveDateRange.has(id)
      );
      if (!hasLocationInRange) {
        showToast("Selected locations have no events in the current date range.");
        return;
      }
    }

    if (hasEventSelection && hasLocationSelection && eventIdsForSelectedLocations) {
      const hasOverlap = [...selectedEventIds].some((id) =>
        eventIdsForSelectedLocations.has(id)
      );
      if (!hasOverlap) {
        showToast("Selected events are not scheduled at the selected locations.");
        return;
      }
    }

    if (hasDateRange && !hasEventSelection && !hasLocationSelection && eventIdsInActiveDateRange) {
      if (eventIdsInActiveDateRange.size === 0) {
        showToast("No events fall within the selected date range.");
        return;
      }
    }

    showToast("No events match the current filters.");
  }, [
    activeDateRange.endDate,
    activeDateRange.startDate,
    eventIdsForSelectedLocations,
    eventIdsInActiveDateRange,
    filteredData.events.length,
    filterAlertKey,
    hasActiveDateRange,
    isRangeLocked,
    selectedEventIds,
    selectedLocationIds,
    showToast,
  ]);

  const handleClearFilters = useCallback(() => {
    setSelectedEventIds(new Set());
    setSelectedLocationIds(new Set());
    setCurrentEventIndex(-1);
    setFocusedEventId(null);
  }, []);

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

  const yearMonthPrevDisabled = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return true;
    let year = selectedYear;
    let month = selectedMonth - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    return availableYears.length > 0 && !availableYears.includes(year);
  }, [availableYears, selectedMonth, selectedYear]);

  const yearMonthNextDisabled = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return true;
    let year = selectedYear;
    let month = selectedMonth + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return availableYears.length > 0 && !availableYears.includes(year);
  }, [availableYears, selectedMonth, selectedYear]);

  const handleYearMonthPreviousWithAlert = useCallback(() => {
    if (selectedYear === null || selectedMonth === null) return;
    let year = selectedYear;
    let month = selectedMonth - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      showToast(`No events exist in ${year}.`);
      return;
    }
    handleYearMonthPrevious();
  }, [availableYears, handleYearMonthPrevious, selectedMonth, selectedYear, showToast]);

  const handleYearMonthNextWithAlert = useCallback(() => {
    if (selectedYear === null || selectedMonth === null) return;
    let year = selectedYear;
    let month = selectedMonth + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      showToast(`No events exist in ${year}.`);
      return;
    }
    handleYearMonthNext();
  }, [availableYears, handleYearMonthNext, selectedMonth, selectedYear, showToast]);

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

        const eventsData: PlanningEvent[] = await eventsRes.json();
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

  const hasNavigationSelection = selectedEventsForNavigation.length > 0;
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
        <div style={{ marginBottom: "var(--space-xl)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
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
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <Link
              href="/planning/work/gantt"
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
              Work Gantt
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
              Add Work
            </Link>
            <TooltipToggle enabled={tooltipsEnabled} onChange={setTooltipsEnabled} />
            <ThemeToggle />
          </div>
        </div>

        {(events.length > 0 || locations.length > 0) && (
          <>
            <FilterBar>
              <SegmentedControl
                style={{
                  flexWrap: "wrap",
                  gap: "var(--space-sm)",
                  minHeight: "36px", // Ensure consistent height with other SegmentedControls
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
                onYearMonthPrevious={handleYearMonthPreviousWithAlert}
                onYearMonthNext={handleYearMonthNextWithAlert}
                yearMonthPrevDisabled={yearMonthPrevDisabled}
                yearMonthNextDisabled={yearMonthNextDisabled}
              />
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
            top: "var(--space-xl)",
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
            maxWidth: "min(80vw, 480px)",
            textAlign: "center",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
