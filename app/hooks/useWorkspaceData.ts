"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Allocation,
  CrossEventEvaluation,
  Evaluation,
  EventLocation,
  Location,
  PlanningEvent,
  WorkCategory,
} from "../types/shared";

interface UseWorkspaceDataReturn {
  // Entity data
  /** Active planning events. */
  events: PlanningEvent[];
  /** Work categories for all events. */
  workCategories: WorkCategory[];
  /** All locations. */
  locations: Location[];
  /** Event-location mappings. */
  eventLocations: EventLocation[];
  /** Current allocations. */
  allocations: Allocation[];
  /** Per-event evaluation metrics. */
  evaluation: Evaluation;
  /** Cross-event capacity comparison. */
  crossEventEvaluation: CrossEventEvaluation;
  // State
  /** Whether initial data is loading. */
  isLoading: boolean;
  /** Error message if data loading failed. */
  error: string | null;
  // Setters (needed for allocation updates)
  /** Setter for allocations (for optimistic updates from useAllocations). */
  setAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
  /** Setter for error state. */
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  // Refresh callback
  /** Manually refresh cross-event evaluation data. */
  refreshCrossEventEvaluation: () => Promise<void>;
}

/**
 * Hook for loading and managing all workspace data.
 * Fetches events, work categories, locations, allocations, and evaluations.
 * Filters to only active events and auto-refreshes evaluation on allocation changes.
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callback for refreshing cross-event evaluation
  const refreshCrossEventEvaluation = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule/evaluation/cross-event');
      if (res.ok) {
        const data = await res.json();
        setCrossEventEvaluation(data);
      }
    } catch (err) {
      console.warn("Failed to refresh evaluation:", err);
    }
  }, []);

  // Load all initial data
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

  // Load cross-event evaluation when allocations change
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

  return {
    events,
    workCategories,
    locations,
    eventLocations,
    allocations,
    evaluation,
    crossEventEvaluation,
    isLoading,
    error,
    setAllocations,
    setError,
    refreshCrossEventEvaluation,
  };
}
