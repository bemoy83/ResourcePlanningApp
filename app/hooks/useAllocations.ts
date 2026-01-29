"use client";

import { useCallback, useState } from "react";
import { Allocation, AllocationDraft, WorkCategory } from "../types/shared";

interface UseAllocationsOptions {
  /** Current allocations from the server. */
  allocations: Allocation[];
  /** State setter for allocations (for optimistic updates). */
  setAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
  /** Work categories for looking up event IDs. */
  workCategories: WorkCategory[];
  /** Callback to refresh evaluation data after changes. */
  onEvaluationRefresh: () => Promise<void>;
  /** Callback to display error messages. */
  onError: (message: string) => void;
}

interface UseAllocationsReturn {
  /** Active drafts being edited. */
  drafts: AllocationDraft[];
  /** Validation errors keyed by cell key (workCategoryId::date). */
  errorsByCellKey: Record<string, string>;
  /** Start creating a new allocation at the given cell. */
  startCreate: (workCategoryId: string, date: string) => void;
  /** Start editing an existing allocation. */
  startEdit: (allocationId: string, workCategoryId: string, date: string, effortHours: number) => void;
  /** Update a draft's effort value and unit. */
  changeDraft: (draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") => void;
  /** Save a draft to the server. */
  commitDraft: (draftKey: string) => Promise<void>;
  /** Discard a draft without saving. */
  cancelDraft: (draftKey: string) => void;
  /** Delete an allocation from the server. */
  deleteAllocation: (allocationId: string) => Promise<void>;
}

/**
 * Hook for managing allocation CRUD operations.
 * Handles draft state, API calls, optimistic updates, and error handling.
 */
export function useAllocations({
  allocations,
  setAllocations,
  workCategories,
  onEvaluationRefresh,
  onError,
}: UseAllocationsOptions): UseAllocationsReturn {
  const [drafts, setDrafts] = useState<AllocationDraft[]>([]);
  const [errorsByCellKey, setErrorsByCellKey] = useState<Record<string, string>>({});

  const startCreate = useCallback(
    (workCategoryId: string, date: string) => {
      const draftKey = `${workCategoryId}::${date}`;

      // Check if draft already exists
      setDrafts((prev) => {
        const existingDraft = prev.find((d) => d.key === draftKey);
        if (existingDraft) return prev;

        // Check if allocation already exists
        const existingAllocation = allocations.find(
          (a) => a.workCategoryId === workCategoryId && a.date === date
        );
        if (existingAllocation) return prev;

        const draft: AllocationDraft = {
          allocationId: null,
          key: draftKey,
          workCategoryId,
          date,
          effortValue: 0,
          effortUnit: "HOURS",
        };

        return [...prev, draft];
      });
    },
    [allocations]
  );

  const startEdit = useCallback(
    (allocationId: string, workCategoryId: string, date: string, effortHours: number) => {
      const draftKey = `${workCategoryId}::${date}`;

      setDrafts((prev) => {
        const existingDraft = prev.find((d) => d.key === draftKey);
        if (existingDraft) return prev;

        const draft: AllocationDraft = {
          allocationId,
          key: draftKey,
          workCategoryId,
          date,
          effortValue: effortHours,
          effortUnit: "HOURS",
        };

        return [...prev, draft];
      });
    },
    []
  );

  const changeDraft = useCallback(
    (draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") => {
      setDrafts((prev) =>
        prev.map((d) => (d.key === draftKey ? { ...d, effortValue, effortUnit } : d))
      );
    },
    []
  );

  const commitDraft = useCallback(
    async (draftKey: string) => {
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

        await onEvaluationRefresh();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save allocation";
        setErrorsByCellKey((prev) => ({ ...prev, [draftKey]: errorMessage }));
      }
    },
    [drafts, workCategories, setAllocations, onEvaluationRefresh]
  );

  const cancelDraft = useCallback((draftKey: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== draftKey));
    setErrorsByCellKey((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }, []);

  const deleteAllocation = useCallback(
    async (allocationId: string) => {
      try {
        const res = await fetch(`/api/schedule/allocations/${allocationId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to delete allocation");
        }

        setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
        await onEvaluationRefresh();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to delete allocation");
      }
    },
    [setAllocations, onEvaluationRefresh, onError]
  );

  return {
    drafts,
    errorsByCellKey,
    startCreate,
    startEdit,
    changeDraft,
    commitDraft,
    cancelDraft,
    deleteAllocation,
  };
}
