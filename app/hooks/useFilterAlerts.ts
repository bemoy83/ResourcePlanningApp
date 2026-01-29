"use client";

import { useEffect, useMemo, useRef } from "react";

interface UseFilterAlertsOptions {
  /** Number of events remaining after filters are applied. */
  filteredEventsCount: number;
  /** Currently selected event IDs. */
  selectedEventIds: Set<string>;
  /** Currently selected location IDs. */
  selectedLocationIds: Set<string>;
  /** Active date range filter. */
  activeDateRange: { startDate: string | null; endDate: string | null };
  /** Whether the date range is locked. */
  isRangeLocked: boolean;
  /** Event IDs that have allocations at selected locations. */
  eventIdsForSelectedLocations: Set<string> | null;
  /** Event IDs that fall within the active date range. */
  eventIdsInActiveDateRange: Set<string> | null;
  /** Current toast message (used to check if toast is showing). */
  toastMessage: string | null;
  /** Callback to show a toast message. */
  showToast: (message: string) => void;
  /** Callback to hide the current toast. */
  hideToast: () => void;
}

/**
 * Hook that monitors filter state and shows contextual alerts when
 * filter combinations result in no visible events. Provides specific
 * feedback about why no events are shown (date range, location, etc.).
 */
export function useFilterAlerts({
  filteredEventsCount,
  selectedEventIds,
  selectedLocationIds,
  activeDateRange,
  isRangeLocked,
  eventIdsForSelectedLocations,
  eventIdsInActiveDateRange,
  toastMessage,
  showToast,
  hideToast,
}: UseFilterAlertsOptions): void {
  const lastAlertKeyRef = useRef<string | null>(null);

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

  // Hide toast when filtered results become available
  useEffect(() => {
    if (filteredEventsCount > 0 && toastMessage) {
      hideToast();
    }
  }, [filteredEventsCount, toastMessage, hideToast]);

  // Show contextual alerts when filters produce no results
  useEffect(() => {
    if (lastAlertKeyRef.current === filterAlertKey) {
      return;
    }
    lastAlertKeyRef.current = filterAlertKey;
    if (!filterAlertKey) return;
    if (filteredEventsCount > 0) {
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
    filteredEventsCount,
    filterAlertKey,
    hasActiveDateRange,
    isRangeLocked,
    selectedEventIds,
    selectedLocationIds,
    showToast,
  ]);
}
