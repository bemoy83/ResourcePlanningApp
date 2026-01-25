"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlanningBoardGrid } from "../../../components/PlanningBoardGrid";
import { nextDateString } from "../../../utils/date";

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
  phase?: string;
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

interface Evaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

interface AllocationDraft {
  allocationId: string | null;
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

interface VisibleDateRange {
  startDate: string;
  endDate: string;
}

export default function PlanningBoardPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation>({
    dailyDemand: [],
    dailyCapacityComparison: [],
    workCategoryPressure: [],
  });
  const [drafts, setDrafts] = useState<AllocationDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorsByCellKey, setErrorsByCellKey] = useState<Record<string, string>>({});
  const [visibleDateRange, setVisibleDateRange] = useState<VisibleDateRange>({
  startDate: "",
  endDate: "",
});

  useEffect(() => {
    if (!eventId) return;

    async function loadInitialData() {
      setIsLoading(true);
      setError(null);

      try {
        const [eventRes, workCategoriesRes, allocationsRes, evaluationRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/work-categories`),
          fetch(`/api/schedule/events/${eventId}/allocations`),
          fetch(`/api/schedule/events/${eventId}/evaluation`),
        ]);

        if (!eventRes.ok) {
          throw new Error("Failed to load event");
        }
        if (!workCategoriesRes.ok) {
          throw new Error("Failed to load work categories");
        }
        if (!allocationsRes.ok) {
          throw new Error("Failed to load allocations");
        }
        if (!evaluationRes.ok) {
          throw new Error("Failed to load evaluation");
        }

        const eventData = await eventRes.json();
        const workCategoriesData = await workCategoriesRes.json();
        const allocationsData = await allocationsRes.json();
        const evaluationData = await evaluationRes.json();

        setEvent(eventData);
        setWorkCategories(workCategoriesData);
        setAllocations(allocationsData);
        setEvaluation({
          dailyDemand: evaluationData.dailyDemand || [],
          dailyCapacityComparison: evaluationData.dailyCapacityComparison || [],
          workCategoryPressure: evaluationData.workCategoryPressure || [],
        });

        if (eventData.startDate && eventData.endDate) {
          setVisibleDateRange({
            startDate: eventData.startDate,
            endDate: eventData.endDate,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    async function refreshEvaluation() {
      try {
        const res = await fetch(`/api/schedule/events/${eventId}/evaluation`);
        if (!res.ok) {
          return;
        }
        const evaluationData = await res.json();
        setEvaluation({
          dailyDemand: evaluationData.dailyDemand || [],
          dailyCapacityComparison: evaluationData.dailyCapacityComparison || [],
          workCategoryPressure: evaluationData.workCategoryPressure || [],
        });
      } catch (err) {
        // Silently fail - evaluation refresh is non-critical
      }
    }

    refreshEvaluation();
  }, [eventId, allocations]);

  function startCreate(workCategoryId: string, date: string) {
    const draftKey = `${workCategoryId}::${date}`;

    // Do not create duplicate drafts
    const existingDraft = drafts.find((d) => d.key === draftKey);
    if (existingDraft) {
      return;
    }

    // Do not allow editing if an allocation already exists for this cell
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

  function startEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number) {
    const draftKey = `${workCategoryId}::${date}`;

    // Do not create duplicate drafts
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

  function changeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") {
    setDrafts(drafts.map(d =>
      d.key === draftKey
        ? { ...d, effortValue, effortUnit }
        : d
    ));
  }

  async function commitDraft(draftKey: string) {
    const draft = drafts.find((d) => d.key === draftKey);
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const isUpdate = draft.allocationId !== null;
      const url = isUpdate
        ? `/api/schedule/allocations/${draft.allocationId}`
        : "/api/schedule/allocations";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          workCategoryId: draft.workCategoryId,
          date: draft.date,
          effortValue: draft.effortValue,
          effortUnit: draft.effortUnit,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || `Failed to ${isUpdate ? "update" : "save"} allocation`;
        setErrorsByCellKey({
          ...errorsByCellKey,
          [draftKey]: errorMessage,
        });
        return;
      }

      const allocation = await res.json();
      if (isUpdate) {
        setAllocations(allocations.map((a) => (a.id === draft.allocationId ? allocation : a)));
      } else {
        setAllocations([...allocations, allocation]);
      }
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

  async function deleteAllocation(allocationId: string) {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/schedule/allocations/${allocationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete allocation");
      }

      setAllocations(allocations.filter((a) => a.id !== allocationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete allocation");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  const dates: string[] = [];
  let current = event.startDate;
  while (current <= event.endDate) {
    dates.push(current);
    current = nextDateString(current);
  }

  return (
    <div>
      <h1>{event.name}</h1>
      <PlanningBoardGrid
        dates={dates}
        events={[event]}
        workCategories={workCategories}
        allocations={allocations}
        evaluation={evaluation}
        drafts={drafts}
        errorsByCellKey={errorsByCellKey}
        onStartCreate={startCreate}
        onStartEdit={startEdit}
        onChangeDraft={changeDraft}
        onCommit={commitDraft}
        onCancel={cancelDraft}
        onDelete={deleteAllocation}
      />
    </div>
  );
}
