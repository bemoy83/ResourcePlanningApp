"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlanningBoardGrid } from "../../components/PlanningBoardGrid";
import { EvaluationLegend } from "../../components/EvaluationLegend";
import { EvaluationSummary } from "../../components/EvaluationSummary";
import { EventCalendar } from "../../components/EventCalendar";

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
const TIMELINE_ORIGIN_PX = 500;

function PlanningToolbar({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function HorizontalScrollContainer({ children }: { children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto", overflowY: "hidden", position: "relative" }}>
      {children}
    </div>
  );
}

function PlanningStatusFooter({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
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
  return <EventCalendar locations={locations} events={events} timeline={timeline} />;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId");

  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdFromUrl);
  const [event, setEvent] = useState<Event | null>(null);
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([]);
  const [locationsForEvent, setLocationsForEvent] = useState<Location[]>([]);
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

  // Load available events
  useEffect(() => {
    async function loadEvents() {
      try {
        const eventsRes = await fetch("/api/events");
        if (!eventsRes.ok) {
          throw new Error("Failed to load events");
        }
        const eventsData: Event[] = await eventsRes.json();
        const activeEvents = eventsData.filter((e) => e.status === "ACTIVE");
        setAvailableEvents(activeEvents);

        // Set initial selected event if not already set
        if (!selectedEventId && activeEvents.length > 0) {
          setSelectedEventId(activeEvents[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      }
    }

    loadEvents();
  }, []);

  // Load selected event data
  useEffect(() => {
    async function loadEventData() {
      if (!selectedEventId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Find the selected event
        const selectedEvent = availableEvents.find((e) => e.id === selectedEventId);
        if (!selectedEvent) {
          throw new Error("Selected event not found");
        }

        setEvent(selectedEvent);

        setLocationsForEvent([]);

        // Load work categories, allocations, evaluation, and location assignments
        const [
          workCategoriesRes,
          allocationsRes,
          evaluationRes,
          locationsRes,
          eventLocationsRes,
        ] = await Promise.all([
          fetch(`/api/events/${selectedEvent.id}/work-categories`),
          fetch(`/api/schedule/events/${selectedEvent.id}/allocations`),
          fetch(`/api/schedule/events/${selectedEvent.id}/evaluation`),
          fetch("/api/locations"),
          fetch("/api/event-locations"),
        ]);

        if (!workCategoriesRes.ok) {
          throw new Error("Failed to load work categories");
        }

        const workCategoriesData = await workCategoriesRes.json();
        const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];
        const evaluationData = evaluationRes.ok ? await evaluationRes.json() : {
          dailyDemand: [],
          dailyCapacityComparison: [],
          workCategoryPressure: [],
        };
        const locationsData: Location[] = locationsRes.ok ? await locationsRes.json() : [];
        const eventLocationsData: EventLocation[] = eventLocationsRes.ok
          ? await eventLocationsRes.json()
          : [];

        const locationsById = new Map(locationsData.map((loc) => [loc.id, loc]));
        const assignedLocations: Location[] = eventLocationsData
          .filter((mapping) => mapping.eventId === selectedEvent.id)
          .map((mapping) => locationsById.get(mapping.locationId))
          .filter((loc): loc is Location => Boolean(loc));

        setWorkCategories(workCategoriesData);
        setAllocations(allocationsData);
        setEvaluation(evaluationData);
        setLocationsForEvent(assignedLocations);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    if (availableEvents.length > 0) {
      loadEventData();
    }
  }, [selectedEventId, availableEvents]);

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

  // Handle event selection
  function handleEventChange(newEventId: string) {
    setSelectedEventId(newEventId);
    // Update URL
    router.push(`/planning?eventId=${newEventId}`);
    // Clear drafts when switching events
    setDrafts([]);
    setErrorsByCellKey({});
  }

  // Refresh evaluation after allocations change
  async function refreshEvaluation() {
    if (!event) return;

    try {
      const res = await fetch(`/api/schedule/events/${event.id}/evaluation`);
      if (res.ok) {
        const evaluationData = await res.json();
        setEvaluation(evaluationData);
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
    if (!draft || !event) {
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
            eventId: event.id,
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
            eventId: event.id,
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
    if (!event) return;

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
  if (error && !event) {
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
  if (availableEvents.length === 0 && !isLoading) {
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

  // No event selected yet
  if (!event) {
    return null;
  }

  const calendarEvents: CalendarEvent[] = [
    {
      ...event,
      locationIds: locationsForEvent.map((location) => location.id),
    },
  ];

  const visibleDateRange = resolveVisibleDateRange(event);

  // Calculate date range once (shared timeline for calendar and grid)
  const dates: string[] = [];
  const start = new Date(visibleDateRange.startDate);
  const end = new Date(visibleDateRange.endDate);
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  // Timeline layout contract
  const timeline: TimelineLayout = {
    dates,
    dateColumnWidth: TIMELINE_DATE_COLUMN_WIDTH,
    timelineOriginPx: TIMELINE_ORIGIN_PX,
  };

  return (
    <div style={{ padding: "20px", maxWidth: "100%", backgroundColor: "#fafafa" }}>
      <PlanningToolbar>
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ marginBottom: "8px", color: "#000", borderBottom: "2px solid #333", paddingBottom: "8px" }}>
            Planning Board
          </h1>

          {/* Event Selector */}
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "2px solid #666",
            marginBottom: "12px",
          }}>
            <label htmlFor="event-select" style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#000",
            }}>
              Select Event to Plan:
            </label>
            <select
              id="event-select"
              value={selectedEventId || ""}
              onChange={(e) => handleEventChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                border: "2px solid #666",
                backgroundColor: "#fff",
                color: "#000",
              }}
            >
              {availableEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.startDate} to {evt.endDate})
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: "14px", color: "#333" }}>
            <strong>Planning:</strong> {event.name}
          </div>
          <div style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>
            {event.startDate} to {event.endDate}
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px", marginBottom: "10px", backgroundColor: "#f5f5f5", color: "#000", border: "2px solid #000" }}>
            Error: {error}
          </div>
        )}

        {isSaving && (
          <div style={{ padding: "10px", marginBottom: "10px", backgroundColor: "#f5f5f5", border: "2px solid #666" }}>
            Saving...
          </div>
        )}
      </PlanningToolbar>

      <HorizontalScrollContainer>
        <EventLocationCalendar locations={locationsForEvent} events={calendarEvents} timeline={timeline} />

        <PlanningBoardGrid
          eventName={event.name}
          dates={dates}
          timeline={timeline}
          workCategories={workCategories}
          allocations={allocations}
          evaluation={evaluation}
          crossEventEvaluation={crossEventEvaluation}
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

      <PlanningStatusFooter>
        <EvaluationSummary
          workCategories={workCategories}
          allocations={allocations}
          workCategoryPressure={evaluation.workCategoryPressure}
          dailyCapacityComparison={evaluation.dailyCapacityComparison}
        />

        <EvaluationLegend />
      </PlanningStatusFooter>
    </div>
  );
}
