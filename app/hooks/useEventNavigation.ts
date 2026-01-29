"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Event {
  id: string;
  name: string;
  startDate: string;
}

interface UseEventNavigationOptions {
  /** All available events. */
  events: Event[];
  /** Currently selected event IDs to navigate through. */
  selectedEventIds: Set<string>;
}

interface UseEventNavigationReturn {
  /** ID of the currently focused event for scroll-to behavior. */
  focusedEventId: string | null;
  /** Current position in the navigation (0-based). */
  currentIndex: number;
  /** Total number of selected events. */
  totalSelected: number;
  /** Whether any events are selected. */
  hasSelection: boolean;
  /** Whether navigation to previous event is possible. */
  canGoPrevious: boolean;
  /** Whether navigation to next event is possible. */
  canGoNext: boolean;
  /** Display label (e.g., "Locate 1 of 3"). */
  label: string;
  /** Tooltip title showing current event name. */
  title: string | undefined;
  /** Navigate to the previous selected event. */
  goToPrevious: () => void;
  /** Navigate to the next selected event. */
  goToNext: () => void;
  /** Reset navigation state. */
  reset: () => void;
}

/**
 * Hook for navigating through selected events in chronological order.
 * Provides prev/next navigation and tracks the currently focused event
 * for scroll-into-view behavior in the planning table.
 */
export function useEventNavigation({
  events,
  selectedEventIds,
}: UseEventNavigationOptions): UseEventNavigationReturn {
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Sort selected events by start date, then name
  const selectedEvents = useMemo(() => {
    return events
      .filter((event) => selectedEventIds.has(event.id))
      .sort((a, b) => {
        const startDelta = a.startDate.localeCompare(b.startDate);
        if (startDelta !== 0) return startDelta;
        return a.name.localeCompare(b.name);
      });
  }, [events, selectedEventIds]);

  // Track selection changes to reset navigation
  const selectedEventKey = useMemo(() => {
    return [...selectedEventIds].sort().join("|");
  }, [selectedEventIds]);

  // Reset when selection changes
  useEffect(() => {
    setCurrentIndex(-1);
    setFocusedEventId(null);
  }, [selectedEventKey]);

  // Adjust index if it goes out of bounds
  useEffect(() => {
    if (selectedEvents.length === 0) {
      setCurrentIndex(-1);
      setFocusedEventId(null);
    } else if (currentIndex >= selectedEvents.length) {
      setCurrentIndex(selectedEvents.length - 1);
    }
  }, [currentIndex, selectedEvents.length]);

  const goToPrevious = useCallback(() => {
    if (selectedEvents.length === 0) return;
    const previousIndex = Math.max(currentIndex - 1, 0);
    if (previousIndex === currentIndex) return;
    const previousEvent = selectedEvents[previousIndex];
    if (!previousEvent) return;
    setCurrentIndex(previousIndex);
    setFocusedEventId(previousEvent.id);
  }, [currentIndex, selectedEvents]);

  const goToNext = useCallback(() => {
    if (selectedEvents.length === 0) return;
    const nextIndex = Math.min(currentIndex + 1, selectedEvents.length - 1);
    if (nextIndex === currentIndex) return;
    const nextEvent = selectedEvents[nextIndex];
    if (!nextEvent) return;
    setCurrentIndex(nextIndex);
    setFocusedEventId(nextEvent.id);
  }, [currentIndex, selectedEvents]);

  const reset = useCallback(() => {
    setCurrentIndex(-1);
    setFocusedEventId(null);
  }, []);

  // Derived state
  const totalSelected = selectedEvents.length;
  const hasSelection = totalSelected > 0;
  const canGoPrevious = hasSelection && currentIndex > 0;
  const canGoNext = hasSelection && currentIndex < totalSelected - 1;

  const label = !hasSelection
    ? "Locate"
    : currentIndex < 0
    ? `Locate (${totalSelected} selected)`
    : `Locate ${currentIndex + 1} of ${totalSelected}`;

  const title = currentIndex >= 0 ? selectedEvents[currentIndex]?.name : undefined;

  return {
    focusedEventId,
    currentIndex,
    totalSelected,
    hasSelection,
    canGoPrevious,
    canGoNext,
    label,
    title,
    goToPrevious,
    goToNext,
    reset,
  };
}
