"use client";

import { ReactNode, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { PlanningBoardGrid } from "../../components/PlanningBoardGrid";
import { EventCalendar } from "../../components/EventCalendar";
import { CrossEventContext } from "../../components/CrossEventContext";
import { FilterBar } from "../../components/FilterBar";
import { LocationFilter } from "../../components/LocationFilter";
import { EventFilter } from "../../components/EventFilter";
import { DateRangeChipFilter, DateRangePreset, DateRange, getDateRangeFromPreset } from "../../components/DateRangeChipFilter";
import { TooltipToggle, useTooltipPreference } from "../../components/TooltipToggle";
import { ThemeToggle } from "../../components/ThemeToggle";
import { UnifiedEvent } from "@/types/calendar";
import {
  LEFT_COLUMNS,
  TIMELINE_DATE_COLUMN_WIDTH,
  TIMELINE_ORIGIN_PX,
  calculateLeftColumnOffsets,
  generateLeftColumnsTemplate,
} from "../../components/layoutConstants";
import { useElementHeight } from "../../components/useElementHeight";
import { buildDateFlags, DateFlags, nextDateString } from "../../utils/date";
import { HOLIDAY_DATES_2026 } from "../../utils/holidays";

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

// Timeline layout contract (shared axis for calendar and grid)
interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  dateMeta?: DateFlags[];
}

// Timeline constants are imported from layoutConstants.ts

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
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("next-3-months");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [tooltipsEnabled, setTooltipsEnabled] = useTooltipPreference();

  // Refs for synchronized horizontal scrolling
  const eventCalendarScrollRef = useRef<HTMLDivElement>(null);
  const crossEventScrollRef = useRef<HTMLDivElement>(null);
  const planningGridHeaderScrollRef = useRef<HTMLDivElement>(null);
  const planningGridScrollRef = useRef<HTMLDivElement>(null);
  const syncingContainersRef = useRef<Set<React.RefObject<HTMLDivElement>>>(new Set());
  const scrollTimeoutRef = useRef<number | null>(null);

  // Refs for measuring sticky header heights
  const eventCalendarContainerRef = useRef<HTMLDivElement>(null);
  const crossEventContainerRef = useRef<HTMLDivElement>(null);

  // Use ResizeObserver to reactively measure element heights
  const eventCalendarHeight = useElementHeight(eventCalendarContainerRef, 0);
  const crossEventHeight = useElementHeight(
    crossEventContainerRef,
    0,
    crossEventEvaluation.crossEventDailyDemand.length > 0
  );

  // Calculate sticky top offsets based on measured heights (with validation)
  const crossEventTop = Math.max(0, eventCalendarHeight);
  const planningGridHeaderTop = Math.max(
    0,
    eventCalendarHeight + (crossEventEvaluation.crossEventDailyDemand.length > 0 ? crossEventHeight : 0)
  );

  // Load all data (events, work categories, allocations, locations)
  useEffect(() => {
    async function loadAllData() {
      setIsLoading(true);
      setError(null);

      try {
        // Load all data in parallel
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
        // Silently fail - evaluation is advisory only
        console.warn("Failed to load cross-event evaluation:", err);
      }
    }

    loadCrossEventEvaluation();
  }, [allocations]); // Refresh when allocations change

  // Refresh evaluation after allocations change
  async function refreshEvaluation() {
    try {
      const res = await fetch('/api/schedule/evaluation/cross-event');
      if (res.ok) {
        const data = await res.json();
        setCrossEventEvaluation(data);
      }
    } catch (err) {
      // Silently fail - evaluation is advisory only
      console.warn("Failed to refresh evaluation:", err);
    }
  }

  // Inject CSS to hide horizontal scrollbars (except EventCalendar)
  useEffect(() => {
    const styleId = 'workspace-hide-scrollbar-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Hide all scrollbars for containers that should not show scrollbars */
        .hide-all-scrollbars {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .hide-all-scrollbars::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
          width: 0;
          height: 0;
        }
        .hide-all-scrollbars::-webkit-scrollbar-track {
          display: none;
        }
        .hide-all-scrollbars::-webkit-scrollbar-thumb {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      syncingContainersRef.current.clear();
    };
  }, []);

  // Synchronized horizontal scroll handlers - Safari-compatible version with improved reliability
  const syncScrollToOthers = useCallback((sourceRef: React.RefObject<HTMLDivElement>, scrollLeft: number) => {
    // Validate input
    if (typeof scrollLeft !== 'number' || isNaN(scrollLeft) || !isFinite(scrollLeft)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Invalid scrollLeft value:', scrollLeft);
      }
      return;
    }

    // Skip if this container is already syncing (prevents feedback loops)
    if (syncingContainersRef.current.has(sourceRef)) return;

    // Validate source ref exists
    if (!sourceRef.current) {
      return;
    }

    // Collect all target refs, filtering out the source and ensuring they exist
    const targetRefs = [
      eventCalendarScrollRef,
      crossEventScrollRef,
      planningGridHeaderScrollRef,
      planningGridScrollRef,
    ].filter(ref => {
      // Exclude source ref
      if (ref === sourceRef) return false;
      // Ensure ref and element exist
      return ref.current !== null && ref.current !== undefined;
    });

    // If no valid targets, nothing to sync
    if (targetRefs.length === 0) {
      return;
    }

    // Mark all target containers as syncing
    targetRefs.forEach(ref => syncingContainersRef.current.add(ref));

    // Use requestAnimationFrame for smoother updates and better Safari compatibility
    requestAnimationFrame(() => {
      // Double-check refs still exist (component might have unmounted)
      const validRefs = targetRefs.filter(ref => ref.current !== null && ref.current !== undefined);

      validRefs.forEach(ref => {
        const element = ref.current;
        if (!element) return;

        // Only update if scroll position differs significantly (avoids unnecessary updates)
        const currentScrollLeft = element.scrollLeft;
        if (Math.abs(currentScrollLeft - scrollLeft) > 0.5) {
          try {
            // Use scrollTo instead of direct assignment to avoid triggering scroll events
            element.scrollTo({
              left: scrollLeft,
              behavior: 'auto' as ScrollBehavior,
            });
          } catch (error) {
            // Fallback to direct assignment if scrollTo fails
            if (process.env.NODE_ENV === 'development') {
              console.warn('scrollTo failed, using fallback:', error);
            }
            try {
              element.scrollLeft = scrollLeft;
            } catch (fallbackError) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Direct scrollLeft assignment also failed:', fallbackError);
              }
            }
          }
        }
      });

      // Clear syncing flags after a small delay to handle Safari's momentum scrolling
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        syncingContainersRef.current.clear();
        scrollTimeoutRef.current = null;
      }, 50);
    });
  }, []);

  const onCalendarScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target && typeof target.scrollLeft === 'number') {
      syncScrollToOthers(eventCalendarScrollRef, target.scrollLeft);
    }
  }, [syncScrollToOthers]);

  const onCrossEventScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target && typeof target.scrollLeft === 'number') {
      syncScrollToOthers(crossEventScrollRef, target.scrollLeft);
    }
  }, [syncScrollToOthers]);

  const onGridHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target && typeof target.scrollLeft === 'number') {
      syncScrollToOthers(planningGridHeaderScrollRef, target.scrollLeft);
    }
  }, [syncScrollToOthers]);

  const onGridScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target && typeof target.scrollLeft === 'number') {
      syncScrollToOthers(planningGridScrollRef, target.scrollLeft);
    }
  }, [syncScrollToOthers]);

  // Start editing a new allocation
  function startCreateAllocation(workCategoryId: string, date: string) {
    const draftKey = `${workCategoryId}::${date}`;

    // Check if already editing this cell
    const existingDraft = drafts.find((d) => d.key === draftKey);
    if (existingDraft) {
      return;
    }

    // Check if allocation already exists
    const existingAllocation = allocations.find(
      (a) => a.workCategoryId === workCategoryId && a.date === date
    );
    if (existingAllocation) {
      return;
    }

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

  // Start editing an existing allocation
  function startEditAllocation(allocationId: string, workCategoryId: string, date: string, effortHours: number) {
    const draftKey = `${workCategoryId}::${date}`;

    // Check if already editing this cell
    const existingDraft = drafts.find((d) => d.key === draftKey);
    if (existingDraft) {
      return;
    }

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

  // Change draft values
  function changeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") {
    setDrafts((prev) =>
      prev.map((d) => (d.key === draftKey ? { ...d, effortValue, effortUnit } : d))
    );
  }

  // Commit draft (create or update allocation)
  async function commitDraft(draftKey: string) {
    const draft = drafts.find((d) => d.key === draftKey);
    if (!draft) {
      return;
    }

    // Find the work category to get the eventId
    const workCategory = workCategories.find((wc) => wc.id === draft.workCategoryId);
    if (!workCategory) {
      return;
    }

    try {
      let res: Response;

      if (draft.allocationId) {
        // Update existing allocation
        res = await fetch(`/api/schedule/allocations/${draft.allocationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: workCategory.eventId,
            workCategoryId: draft.workCategoryId,
            date: draft.date,
            effortValue: draft.effortValue,
            effortUnit: draft.effortUnit,
          }),
        });
      } else {
        // Create new allocation
        res = await fetch("/api/schedule/allocations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        setErrorsByCellKey((prev) => ({
          ...prev,
          [draftKey]: errorMessage,
        }));
        return;
      }

      const savedAllocation = await res.json();

      // Update allocations list
      if (draft.allocationId) {
        // Replace updated allocation
        setAllocations((prev) =>
          prev.map((a) => (a.id === draft.allocationId ? savedAllocation : a))
        );
      } else {
        // Add new allocation
        setAllocations((prev) => [...prev, savedAllocation]);
      }

      // Remove draft and error
      setDrafts((prev) => prev.filter((d) => d.key !== draftKey));
      setErrorsByCellKey((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });

      // Refresh evaluation
      await refreshEvaluation();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save allocation";
      setErrorsByCellKey((prev) => ({
        ...prev,
        [draftKey]: errorMessage,
      }));
    }
  }

  // Cancel draft
  function cancelDraft(draftKey: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== draftKey));
    setErrorsByCellKey((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }

  // Delete allocation
  async function deleteAllocation(allocationId: string) {
    try {
      const res = await fetch(`/api/schedule/allocations/${allocationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete allocation");
      }

      // Remove from allocations list
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));

      // Refresh evaluation
      await refreshEvaluation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete allocation");
      // Error doesn't block - user can continue planning
    }
  }

  // Build calendar events with location IDs (must be before hooks)
  const eventLocationMap = new Map<string, string[]>();
  for (const el of eventLocations) {
    if (!eventLocationMap.has(el.eventId)) {
      eventLocationMap.set(el.eventId, []);
    }
    eventLocationMap.get(el.eventId)!.push(el.locationId);
  }

  // Transform events to UnifiedEvent format (must be before hooks)
  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
  const unifiedEvents: UnifiedEvent[] = events.map((event) => ({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    locations: (eventLocationMap.get(event.id) || [])
      .map((locId) => locationMap.get(locId))
      .filter((loc): loc is Location => loc !== undefined),
    phases: (event.phases || []).map((phase) => ({
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
    })),
  }));

  // Calculate active date range from preset (must be before hooks)
  const activeDateRange = getDateRangeFromPreset(dateRangePreset, customDateRange);

  // Memoize all filtering operations for performance (Phase 1.1)
  const filteredData = useMemo(() => {
    // Filter events by selected events, locations, and date range
    let filtered = unifiedEvents;

    // Apply event filter
    if (selectedEventIds.size > 0) {
      filtered = filtered.filter((event) => selectedEventIds.has(event.id));
    }

    // Apply location filter
    if (selectedLocationIds.size > 0) {
      filtered = filtered
        .map((event) => ({
          ...event,
          locations: event.locations.filter((loc: Location) => selectedLocationIds.has(loc.id)),
        }))
        .filter((event) => event.locations.length > 0); // Only show events with at least one matching location
    }

    // Apply date range filter
    if (activeDateRange.startDate && activeDateRange.endDate) {
      filtered = filtered.filter((event) => {
        // Check if event overlaps with the date range
        const eventStart = event.startDate;
        const eventEnd = event.endDate;
        return eventEnd >= activeDateRange.startDate! && eventStart <= activeDateRange.endDate!;
      });
    }

    // Get filtered event IDs for filtering other data
    const filteredEventIds = new Set(filtered.map((e) => e.id));

    // Filter work categories to only include those belonging to filtered events
    const filteredWorkCategories = workCategories.filter((wc) =>
      filteredEventIds.has(wc.eventId)
    );

    // Filter allocations to only include those belonging to filtered events
    const filteredAllocations = allocations.filter((a) =>
      filteredEventIds.has(a.eventId)
    );

    // Filter evaluation data to only include work categories in the filtered set
    const filteredWorkCategoryIds = new Set(filteredWorkCategories.map((wc) => wc.id));
    const filteredEvaluation: Evaluation = {
      dailyDemand: evaluation.dailyDemand.filter((dd) => {
        // Filter daily demand by date range if active
        if (activeDateRange.startDate && activeDateRange.endDate) {
          return dd.date >= activeDateRange.startDate && dd.date <= activeDateRange.endDate;
        }
        return true;
      }),
      dailyCapacityComparison: evaluation.dailyCapacityComparison.filter((dcc) => {
        // Filter daily capacity comparison by date range if active
        if (activeDateRange.startDate && activeDateRange.endDate) {
          return dcc.date >= activeDateRange.startDate && dcc.date <= activeDateRange.endDate;
        }
        return true;
      }),
      workCategoryPressure: evaluation.workCategoryPressure.filter((wcp) =>
        filteredWorkCategoryIds.has(wcp.workCategoryId)
      ),
    };

    // Filter events array to match filteredEvents (for PlanningBoardGrid which expects Event[])
    const filteredEventsArray = events.filter((e) => filteredEventIds.has(e.id));

    // Filter eventLocations to only include those for filtered events
    const filteredEventLocations = eventLocations.filter((el) =>
      filteredEventIds.has(el.eventId)
    );

    // Filter drafts to only include those for filtered work categories
    const filteredDrafts = drafts.filter((d) =>
      filteredWorkCategoryIds.has(d.workCategoryId)
    );

    // Filter errorsByCellKey to only include those for filtered work categories
    const filteredErrorsByCellKey: Record<string, string> = {};
    for (const [cellKey, error] of Object.entries(errorsByCellKey)) {
      const [workCategoryId] = cellKey.split('::');
      if (filteredWorkCategoryIds.has(workCategoryId)) {
        filteredErrorsByCellKey[cellKey] = error;
      }
    }

    return {
      events: filtered,
      eventsArray: filteredEventsArray,
      workCategories: filteredWorkCategories,
      allocations: filteredAllocations,
      evaluation: filteredEvaluation,
      eventLocations: filteredEventLocations,
      drafts: filteredDrafts,
      errorsByCellKey: filteredErrorsByCellKey,
    };
  }, [
    unifiedEvents,
    events,
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

  // Memoize date range and dates array calculation for performance (Phase 1.2)
  const { dates, minDate, maxDate } = useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;

    if (activeDateRange.startDate && activeDateRange.endDate) {
      // Use the date range filter as the bounds
      min = activeDateRange.startDate;
      max = activeDateRange.endDate;
    } else {
      // No date range filter - calculate from filtered events
      for (const event of filteredData.eventsArray) {
        const range = resolveVisibleDateRange(event);
        if (!min || range.startDate < min) {
          min = range.startDate;
        }
        if (!max || range.endDate > max) {
          max = range.endDate;
        }
      }
    }

    // Generate dates array
    const datesArray: string[] = [];
    if (min && max) {
      let current = min;
      while (current <= max) {
        datesArray.push(current);
        current = nextDateString(current);
      }
    }

    return { dates: datesArray, minDate: min, maxDate: max };
  }, [activeDateRange, filteredData.eventsArray]);

  const holidayDates = useMemo(() => new Set<string>(HOLIDAY_DATES_2026), []);

  const dateMeta = useMemo(() => buildDateFlags(dates, holidayDates), [dates, holidayDates]);

  // Memoize timeline layout object for performance (Phase 1.3)
  const timeline: TimelineLayout = useMemo(() => ({
    dates,
    dateColumnWidth: TIMELINE_DATE_COLUMN_WIDTH,
    timelineOriginPx: TIMELINE_ORIGIN_PX,
    dateMeta,
  }), [dates, dateMeta]);

  // Calculate scroll width for horizontal scroll containers
  const timelineWidth = dates.length * TIMELINE_DATE_COLUMN_WIDTH;
  const scrollWidth = TIMELINE_ORIGIN_PX + timelineWidth;

  // PlanningBoardGrid header configuration (using shared constants)
  const leftColumnOffsets = calculateLeftColumnOffsets(LEFT_COLUMNS);
  const gridTemplateColumns = generateLeftColumnsTemplate(LEFT_COLUMNS);
  const cellStyle: React.CSSProperties = {
    border: `var(--border-width-thin) solid var(--border-primary)`,
    padding: 'var(--space-sm)',
    textAlign: 'center' as const,
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--surface-default)',
    color: 'var(--text-primary)',
    minHeight: 'var(--row-min-height)',
    boxSizing: 'border-box' as const,
  };
  const CELL_BORDER_WIDTH = 1;

  const stickyColumnStyle = (offset: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex: 'var(--z-sticky-column)' as any,
    backgroundColor: 'var(--sticky-column-bg)',
    border: `${CELL_BORDER_WIDTH}px solid var(--sticky-column-border)`,
    color: 'var(--sticky-column-text)',
  });

  // Loading state - must be after all hooks
  if (isLoading) {
    return (
      <div style={{
        padding: "var(--space-xl)",
        backgroundColor: "var(--bg-secondary)",
        border: "var(--border-width-medium) solid var(--border-strong)",
        margin: "var(--space-xl)",
        color: "var(--text-primary)",
        fontSize: "var(--font-size-lg)",
      }}>
        Loading...
      </div>
    );
  }

  // Error state (non-blocking) - must be after all hooks
  if (error) {
    return (
      <div style={{
        padding: "var(--space-xl)",
        backgroundColor: "var(--bg-tertiary)",
        border: "var(--border-width-medium) solid var(--text-primary)",
        margin: "var(--space-xl)",
        color: "var(--text-primary)",
        fontSize: "var(--font-size-lg)",
      }}>
        Error: {error}
      </div>
    );
  }

  // No events available - must be after all hooks
  if (events.length === 0 && !isLoading) {
    return (
      <div style={{
        padding: "var(--space-xl)",
        backgroundColor: "var(--bg-secondary)",
        border: "var(--border-width-medium) solid var(--border-strong)",
        margin: "var(--space-xl)",
        color: "var(--text-primary)",
        fontSize: "var(--font-size-lg)",
      }}>
        No active events
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
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <h1 style={{ marginBottom: "var(--space-sm)", color: "var(--text-primary)", borderBottom: "var(--border-width-medium) solid var(--border-emphasis)", paddingBottom: "var(--space-sm)" }}>
            Planning Workspace
          </h1>

          <div style={{ fontSize: "var(--font-size-md)", color: "var(--text-secondary)", marginBottom: "var(--space-sm)" }}>
            <strong>Unified Planning View</strong> - Event calendar and planning grid synchronized
          </div>
          <div style={{ marginBottom: "var(--space-sm)", fontSize: "var(--font-size-sm)", color: "var(--text-tertiary)" }}>
            {events.length} event{events.length !== 1 ? 's' : ''} | {workCategories.length} work categor{workCategories.length !== 1 ? 'ies' : 'y'} | {locations.length} location{locations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {(events.length > 0 || locations.length > 0) && (
          <>
            <FilterBar>
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
                />
              )}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <TooltipToggle enabled={tooltipsEnabled} onChange={setTooltipsEnabled} />
                <ThemeToggle />
              </div>
            </FilterBar>

            <div style={{ marginBottom: "var(--space-md)" }}>
              <DateRangeChipFilter
                selectedPreset={dateRangePreset}
                customRange={customDateRange}
                onPresetChange={setDateRangePreset}
                onCustomRangeChange={setCustomDateRange}
              />
            </div>
          </>
        )}

      </PlanningToolbar>

      {/* Workspace Viewport - scrolling context for sticky positioning */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Content Wrapper - contains EventCalendar and PlanningBoardGrid */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100%", // Ensure wrapper has height for sticky positioning context
          }}
        >
          {/* EventCalendar Container - sticky at top */}
          <div
            ref={eventCalendarContainerRef}
            style={{
              position: "sticky",
              top: 0,
              zIndex: "var(--z-sticky-calendar)" as any,
              backgroundColor: "var(--bg-secondary)",
              flexShrink: 0, // Prevent compression to ensure accurate height measurement
            }}
          >
            {/* Horizontal Scroll Wrapper for EventCalendar */}
            <div
              ref={eventCalendarScrollRef}
              onScroll={onCalendarScroll}
              style={{
                overflowX: "auto",
                overflowY: "hidden",
                width: "100%",
                // CSS performance optimizations for smoother scrolling
                willChange: "scroll-position",
                WebkitOverflowScrolling: "touch" as any,
                transform: "translateZ(0)",
                scrollBehavior: "auto" as const,
              }}
            >
              <EventCalendar events={filteredData.events} timeline={timeline} tooltipsEnabled={tooltipsEnabled} />
            </div>
          </div>

          {/* CrossEventContext - sticky below EventCalendar, synchronized horizontally */}
          {crossEventEvaluation.crossEventDailyDemand.length > 0 && (
            <div
              ref={crossEventContainerRef}
              style={{
                position: "sticky",
                top: `${crossEventTop}px`,
                zIndex: "var(--z-sticky-cross-event)" as any,
                backgroundColor: "var(--bg-secondary)",
                flexShrink: 0,
              }}
            >
              <div
                ref={crossEventScrollRef}
                onScroll={onCrossEventScroll}
                style={{
                  overflowX: "auto",
                  overflowY: "hidden",
                  width: "100%",
                  // CSS performance optimizations for smoother scrolling
                  willChange: "scroll-position",
                  WebkitOverflowScrolling: "touch" as any,
                  transform: "translateZ(0)",
                  scrollBehavior: "auto" as const,
                }}
                className="hide-all-scrollbars"
              >
                <CrossEventContext crossEventEvaluation={crossEventEvaluation} timeline={timeline} />
              </div>
            </div>
          )}

          {/* PlanningBoardGrid Header - sticky duplicate below CrossEventContext */}
          <div
            style={{
              position: "sticky",
              top: `${planningGridHeaderTop}px`,
              zIndex: "var(--z-sticky-header)" as any,
              backgroundColor: "var(--bg-secondary)",
              flexShrink: 0,
            }}
          >
            <div
              ref={planningGridHeaderScrollRef}
              onScroll={onGridHeaderScroll}
              style={{
                overflowX: "auto",
                overflowY: "hidden",
                width: "100%",
                // CSS performance optimizations for smoother scrolling
                willChange: "scroll-position",
                WebkitOverflowScrolling: "touch" as any,
                transform: "translateZ(0)",
                scrollBehavior: "auto" as const,
              }}
              className="hide-all-scrollbars"
            >
              <header
                style={{
                  display: 'grid',
                  gridTemplateColumns,
                  backgroundColor: 'var(--sticky-header-bg)',
                  fontWeight: 'var(--font-weight-bold)',
                  border: `var(--border-width-medium) solid var(--sticky-header-border)`,
                  minWidth: `${scrollWidth}px`,
                  position: 'relative',
                }}
              >
                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[0]),
                  backgroundColor: 'var(--sticky-corner-bg)',
                  border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                  color: 'var(--sticky-corner-text)',
                }}>
                  <div>Event</div>
                </div>
                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[1]),
                  backgroundColor: 'var(--sticky-corner-bg)',
                  border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                  color: 'var(--sticky-corner-text)',
                }}>
                  <div>Work Category</div>
                </div>
                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[2]),
                  backgroundColor: 'var(--sticky-corner-bg)',
                  border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                  color: 'var(--sticky-corner-text)',
                }}>
                  <div>Estimate</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>total hours</div>
                </div>
                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[3]),
                  backgroundColor: 'var(--sticky-corner-bg)',
                  border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                  color: 'var(--sticky-corner-text)',
                }}>
                  <div>Allocated</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>total hours</div>
                </div>
                <div style={{
                  ...cellStyle,
                  ...stickyColumnStyle(leftColumnOffsets[4]),
                  backgroundColor: 'var(--sticky-corner-bg)',
                  border: `${CELL_BORDER_WIDTH}px solid var(--sticky-corner-border)`,
                  color: 'var(--sticky-corner-text)',
                }}>
                  <div>Remaining</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>to allocate</div>
                </div>
                <div style={{
                  position: 'absolute',
                  left: `${TIMELINE_ORIGIN_PX}px`,
                  top: 0,
                  height: '100%',
                  width: `${timelineWidth}px`,
                }}>
                  {dates.map((date, index) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const dateFlags = dateMeta[index];
                    const backgroundColor = dateFlags?.isHoliday
                      ? 'var(--calendar-holiday-bg)'
                      : dateFlags?.isWeekend
                      ? 'var(--calendar-weekend-bg)'
                      : 'var(--sticky-header-cell-bg)';
                    const borderColor = dateFlags?.isHoliday
                      ? "var(--calendar-holiday-border)"
                      : dateFlags?.isWeekend
                      ? "var(--calendar-weekend-border)"
                      : "var(--border-primary)";

                    return (
                      <div
                        key={date}
                        style={{
                          ...cellStyle,
                          position: 'absolute',
                          left: `${index * TIMELINE_DATE_COLUMN_WIDTH}px`,
                          top: 0,
                          width: `${TIMELINE_DATE_COLUMN_WIDTH}px`,
                          height: '100%',
                          backgroundColor,
                          border: `${CELL_BORDER_WIDTH}px solid ${borderColor}`,
                          color: 'var(--sticky-header-text)',
                        }}
                      >
                        <div>{dayName}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>{dateStr}</div>
                      </div>
                    );
                  })}
                </div>
              </header>
            </div>
          </div>

          {/* PlanningBoardGrid Container - scrolls vertically, handles its own overflow */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Horizontal Scroll Wrapper for PlanningBoardGrid */}
            <div
              ref={planningGridScrollRef}
              onScroll={onGridScroll}
              style={{
                overflowX: "auto",
                overflowY: "auto",
                height: "100%",
                width: "100%",
                // CSS performance optimizations for smoother scrolling
                willChange: "scroll-position",
                WebkitOverflowScrolling: "touch" as any,
                transform: "translateZ(0)",
                scrollBehavior: "auto" as const,
              }}
              className="hide-all-scrollbars"
            >
              <PlanningBoardGrid
                hideHeader={true}
                events={filteredData.eventsArray}
                locations={locations}
                eventLocations={filteredData.eventLocations}
                dates={dates}
                timeline={timeline}
                workCategories={filteredData.workCategories}
                allocations={filteredData.allocations}
                evaluation={filteredData.evaluation}
                drafts={filteredData.drafts}
                errorsByCellKey={filteredData.errorsByCellKey}
                onStartCreate={startCreateAllocation}
                onStartEdit={startEditAllocation}
                onChangeDraft={changeDraft}
                onCommit={commitDraft}
                onCancel={cancelDraft}
                onDelete={deleteAllocation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
