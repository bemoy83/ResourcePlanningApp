"use client";

import { ReactNode, useEffect, useState } from "react";
import { PlanningBoardGrid } from "../../components/PlanningBoardGrid";
import { EventCalendar } from "../../components/EventCalendar";
import { CrossEventContext } from "../../components/CrossEventContext";
import { nextDateString } from "../../utils/date";

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

interface CalendarEvent extends Event {
  locationIds: string[];
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
}

// Timeline constants
const TIMELINE_DATE_COLUMN_WIDTH = 100;
const TIMELINE_ORIGIN_PX = 700;

function PlanningToolbar({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function HorizontalScrollContainer({ children }: { children: ReactNode }) {
  return (
    <div
      className="timeline-scroll-x"
      style={{
        overflowX: "auto",
        overflowY: "auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
}

function EventLocationCalendar({
  locations,
  events,
  timeline,
}: {
  locations: Location[];
  events: CalendarEvent[];
  timeline: TimelineLayout;
}) {
  // Transform CalendarEvent to UnifiedEvent for the refactored EventCalendar
  const locationMap = new Map(locations.map((loc) => [loc.id, loc]));

  const unifiedEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    locations: event.locationIds
      .map((locId) => locationMap.get(locId))
      .filter((loc): loc is Location => loc !== undefined),
    phases: (event.phases || []).map((phase) => ({
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
    })),
  }));

  return <EventCalendar events={unifiedEvents} timeline={timeline} />;
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


export default function PlanningWorkspacePage() {
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorsByCellKey, setErrorsByCellKey] = useState<Record<string, string>>({});

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

    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
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
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        padding: "20px",
        backgroundColor: "#fafafa",
        border: "2px solid #666",
        margin: "20px",
        color: "#000",
        fontSize: "16px",
      }}>
        Loading...
      </div>
    );
  }

  // Error state (non-blocking)
  if (error) {
    return (
      <div style={{
        padding: "20px",
        backgroundColor: "#f5f5f5",
        border: "2px solid #000",
        margin: "20px",
        color: "#000",
        fontSize: "16px",
      }}>
        Error: {error}
      </div>
    );
  }

  // No events available
  if (events.length === 0 && !isLoading) {
    return (
      <div style={{
        padding: "20px",
        backgroundColor: "#fafafa",
        border: "2px solid #666",
        margin: "20px",
        color: "#000",
        fontSize: "16px",
      }}>
        No active events
      </div>
    );
  }

  // Build calendar events with location IDs
  const eventLocationMap = new Map<string, string[]>();
  for (const el of eventLocations) {
    if (!eventLocationMap.has(el.eventId)) {
      eventLocationMap.set(el.eventId, []);
    }
    eventLocationMap.get(el.eventId)!.push(el.locationId);
  }

  const calendarEvents: CalendarEvent[] = events.map((event) => ({
    ...event,
    locationIds: eventLocationMap.get(event.id) || [],
  }));

  // Calculate date range spanning all events
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const event of events) {
    const range = resolveVisibleDateRange(event);
    if (!minDate || range.startDate < minDate) {
      minDate = range.startDate;
    }
    if (!maxDate || range.endDate > maxDate) {
      maxDate = range.endDate;
    }
  }

  // Generate dates array
  const dates: string[] = [];
  if (minDate && maxDate) {
    let current = minDate;
    while (current <= maxDate) {
      dates.push(current);
      current = nextDateString(current);
    }
  }

  // Timeline layout contract
  const timeline: TimelineLayout = {
    dates,
    dateColumnWidth: TIMELINE_DATE_COLUMN_WIDTH,
    timelineOriginPx: TIMELINE_ORIGIN_PX,
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "100%",
        backgroundColor: "#fafafa",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <PlanningToolbar>
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ marginBottom: "8px", color: "#000", borderBottom: "2px solid #333", paddingBottom: "8px" }}>
            Planning Board
          </h1>

          <div style={{ fontSize: "14px", color: "#333", marginBottom: "8px" }}>
            <strong>Multi-Event Planning</strong> - All active events
          </div>
          <div style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>
            {events.length} event{events.length !== 1 ? 's' : ''} | {workCategories.length} work categor{workCategories.length !== 1 ? 'ies' : 'y'} | {locations.length} location{locations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {isSaving && (
          <div style={{ padding: "10px", marginBottom: "10px", backgroundColor: "#f5f5f5", border: "2px solid #666" }}>
            Saving...
          </div>
        )}
      </PlanningToolbar>

      <HorizontalScrollContainer>
        <EventLocationCalendar locations={locations} events={calendarEvents} timeline={timeline} />

        <CrossEventContext crossEventEvaluation={crossEventEvaluation} timeline={timeline} />

        <PlanningBoardGrid
          events={events}
          locations={locations}
          eventLocations={eventLocations}
          dates={dates}
          timeline={timeline}
          workCategories={workCategories}
          allocations={allocations}
          evaluation={evaluation}
          drafts={drafts}
          errorsByCellKey={errorsByCellKey}
          onStartCreate={startCreateAllocation}
          onStartEdit={startEditAllocation}
          onChangeDraft={changeDraft}
          onCommit={commitDraft}
          onCancel={cancelDraft}
          onDelete={deleteAllocation}
        />
      </HorizontalScrollContainer>
      {/* TODO: Reintroduce planning summary on /planning/results */}
      {/* TODO: Reintroduce advisory legend when capacity overlays are implemented */}
    </div>
  );
}
