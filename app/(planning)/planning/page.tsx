"use client";

import { useEffect, useState } from "react";
import { PlanningBoardGrid } from "../../components/PlanningBoardGrid";

interface Event {
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

interface AllocationDraft {
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

interface EventSection {
  eventId: string;
  eventName: string;
  workCategories: WorkCategory[];
}

export default function PlanningOverviewPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [workCategoriesByEvent, setWorkCategoriesByEvent] = useState<Record<string, WorkCategory[]>>({});
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [dailyDemand, setDailyDemand] = useState<DailyDemand[]>([]);
  const [drafts, setDrafts] = useState<AllocationDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorsByCellKey, setErrorsByCellKey] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setError(null);

      try {
        const eventsRes = await fetch("/api/events");
        if (!eventsRes.ok) {
          throw new Error("Failed to load events");
        }
        const eventsData: Event[] = await eventsRes.json();
        const activeEvents = eventsData.filter((e) => e.status === "ACTIVE");
        setEvents(activeEvents);

        const eventDataPromises = activeEvents.map(async (event) => {
          const [workCategoriesRes, allocationsRes, evaluationRes] = await Promise.all([
            fetch(`/api/events/${event.id}/work-categories`),
            fetch(`/api/schedule/events/${event.id}/allocations`),
            fetch(`/api/schedule/events/${event.id}/evaluation`),
          ]);

          const workCategories = workCategoriesRes.ok ? await workCategoriesRes.json() : [];
          const allocations = allocationsRes.ok ? await allocationsRes.json() : [];
          const evaluation = evaluationRes.ok ? await evaluationRes.json() : { dailyDemand: [] };

          return {
            eventId: event.id,
            workCategories,
            allocations,
            dailyDemand: evaluation.dailyDemand || [],
          };
        });

        const eventDataResults = await Promise.all(eventDataPromises);

        const workCategoriesMap: Record<string, WorkCategory[]> = {};
        const allAllocations: Allocation[] = [];
        const demandByDate: Record<string, number> = {};

        for (const result of eventDataResults) {
          workCategoriesMap[result.eventId] = result.workCategories;
          allAllocations.push(...result.allocations);

          for (const demand of result.dailyDemand) {
            demandByDate[demand.date] = (demandByDate[demand.date] || 0) + demand.totalEffortHours;
          }
        }

        setWorkCategoriesByEvent(workCategoriesMap);
        setAllocations(allAllocations);

        const aggregatedDemand: DailyDemand[] = Object.entries(demandByDate).map(([date, totalEffortHours]) => ({
          date,
          totalEffortHours,
        }));
        setDailyDemand(aggregatedDemand);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function refreshEvaluation() {
      if (events.length === 0) return;

      try {
        const demandByDate: Record<string, number> = {};

        for (const event of events) {
          const res = await fetch(`/api/schedule/events/${event.id}/evaluation`);
          if (res.ok) {
            const evaluationData = await res.json();
            for (const demand of evaluationData.dailyDemand || []) {
              demandByDate[demand.date] = (demandByDate[demand.date] || 0) + demand.totalEffortHours;
            }
          }
        }

        const aggregatedDemand: DailyDemand[] = Object.entries(demandByDate).map(([date, totalEffortHours]) => ({
          date,
          totalEffortHours,
        }));
        setDailyDemand(aggregatedDemand);
      } catch (err) {
        // Silently fail
      }
    }

    refreshEvaluation();
  }, [events, allocations]);

  function startEdit(workCategoryId: string, date: string) {
    const draftKey = `${workCategoryId}::${date}`;

    const existingDraft = drafts.find((d) => d.key === draftKey);
    if (existingDraft) {
      return;
    }

    const existingAllocation = allocations.find(
      (a) => a.workCategoryId === workCategoryId && a.date === date
    );
    if (existingAllocation) {
      return;
    }

    const draft: AllocationDraft = {
      key: draftKey,
      workCategoryId,
      date,
      effortValue: 0,
      effortUnit: "HOURS",
    };

    setDrafts((prev) => [...prev, draft]);
  }

  function changeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") {
    setDrafts(
      drafts.map((d) => (d.key === draftKey ? { ...d, effortValue, effortUnit } : d))
    );
  }

  async function commitDraft(draftKey: string) {
    const draft = drafts.find((d) => d.key === draftKey);
    if (!draft) {
      return;
    }

    const workCategory = Object.values(workCategoriesByEvent)
      .flat()
      .find((wc) => wc.id === draft.workCategoryId);

    if (!workCategory) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule/allocations", {
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

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || "Failed to save allocation";
        setErrorsByCellKey({
          ...errorsByCellKey,
          [draftKey]: errorMessage,
        });
        return;
      }

      const allocation = await res.json();
      setAllocations([...allocations, allocation]);
      setDrafts(drafts.filter((d) => d.key !== draftKey));
      setErrorsByCellKey((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save allocation";
      setErrorsByCellKey({
        ...errorsByCellKey,
        [draftKey]: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function cancelDraft(draftKey: string) {
    setDrafts(drafts.filter((d) => d.key !== draftKey));
    setErrorsByCellKey((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (events.length === 0) {
    return <div>No active events</div>;
  }

  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const event of events) {
    if (!minDate || event.startDate < minDate) {
      minDate = event.startDate;
    }
    if (!maxDate || event.endDate > maxDate) {
      maxDate = event.endDate;
    }
  }

  const dates: string[] = [];
  if (minDate && maxDate) {
    const start = new Date(minDate);
    const end = new Date(maxDate);
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  const eventSections: EventSection[] = events.map((event) => ({
    eventId: event.id,
    eventName: event.name,
    workCategories: workCategoriesByEvent[event.id] || [],
  }));

  return (
    <div>
      <h1>Planning Overview</h1>
      <PlanningBoardGrid
        dates={dates}
        eventSections={eventSections}
        allocations={allocations}
        dailyDemand={dailyDemand}
        drafts={drafts}
        errorsByCellKey={errorsByCellKey}
        onStartEdit={startEdit}
        onChangeDraft={changeDraft}
        onCommit={commitDraft}
        onCancel={cancelDraft}
      />
    </div>
  );
}
