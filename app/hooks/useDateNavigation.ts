"use client";

import { useCallback, useMemo } from "react";

/**
 * Calculates the target year when applying an offset to today's date
 */
function getTargetYearFromOffset(offset: number): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-based

  let targetMonth = currentMonth + offset;
  let targetYear = currentYear;

  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }

  return targetYear;
}

interface UseDateNavigationOptions {
  // Year/Month picker mode
  /** Selected year in year/month picker mode. */
  selectedYear: number | null;
  /** Selected month (1-12) in year/month picker mode. */
  selectedMonth: number | null;
  /** Years that have event data available. */
  availableYears: number[];
  /** Callback for year/month mode previous navigation. */
  onYearMonthPrevious: () => void;
  /** Callback for year/month mode next navigation. */
  onYearMonthNext: () => void;
  // "This month" offset mode
  /** Month offset from current month (0 = this month, -1 = last month). */
  monthOffset: number;
  /** Callback for offset mode previous navigation. */
  onOffsetPrevious: () => void;
  /** Callback for offset mode next navigation. */
  onOffsetNext: () => void;
  // Shared
  /** Callback when navigation is blocked (e.g., no data in target year). */
  onBlocked: (message: string) => void;
}

interface UseDateNavigationReturn {
  // Year/Month picker
  /** Whether previous navigation is available in year/month mode. */
  canGoYearMonthPrevious: boolean;
  /** Whether next navigation is available in year/month mode. */
  canGoYearMonthNext: boolean;
  /** Navigate to previous month in year/month mode. */
  goToYearMonthPrevious: () => void;
  /** Navigate to next month in year/month mode. */
  goToYearMonthNext: () => void;
  // "This month" offset
  /** Whether previous navigation is available in offset mode. */
  canGoOffsetPrevious: boolean;
  /** Whether next navigation is available in offset mode. */
  canGoOffsetNext: boolean;
  /** Navigate to previous month in offset mode. */
  goToOffsetPrevious: () => void;
  /** Navigate to next month in offset mode. */
  goToOffsetNext: () => void;
}

/**
 * Hook for date range navigation with year boundary checking.
 * Supports both "Year/Month picker" mode and "This month" offset mode.
 * Prevents navigation to years without event data and shows alerts.
 */
export function useDateNavigation({
  selectedYear,
  selectedMonth,
  availableYears,
  onYearMonthPrevious,
  onYearMonthNext,
  monthOffset,
  onOffsetPrevious,
  onOffsetNext,
  onBlocked,
}: UseDateNavigationOptions): UseDateNavigationReturn {
  // ===== Year/Month picker mode =====
  const canGoYearMonthPrevious = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return false;
    let year = selectedYear;
    let month = selectedMonth - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    return availableYears.length === 0 || availableYears.includes(year);
  }, [availableYears, selectedMonth, selectedYear]);

  const canGoYearMonthNext = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return false;
    let year = selectedYear;
    let month = selectedMonth + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return availableYears.length === 0 || availableYears.includes(year);
  }, [availableYears, selectedMonth, selectedYear]);

  const goToYearMonthPrevious = useCallback(() => {
    if (selectedYear === null || selectedMonth === null) return;
    let year = selectedYear;
    let month = selectedMonth - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      onBlocked(`No events exist in ${year}.`);
      return;
    }
    onYearMonthPrevious();
  }, [availableYears, onYearMonthPrevious, selectedMonth, selectedYear, onBlocked]);

  const goToYearMonthNext = useCallback(() => {
    if (selectedYear === null || selectedMonth === null) return;
    let year = selectedYear;
    let month = selectedMonth + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      onBlocked(`No events exist in ${year}.`);
      return;
    }
    onYearMonthNext();
  }, [availableYears, onYearMonthNext, selectedMonth, selectedYear, onBlocked]);

  // ===== "This month" offset mode =====
  const canGoOffsetPrevious = useMemo(() => {
    const targetYear = getTargetYearFromOffset(monthOffset - 1);
    return availableYears.length === 0 || availableYears.includes(targetYear);
  }, [availableYears, monthOffset]);

  const canGoOffsetNext = useMemo(() => {
    const targetYear = getTargetYearFromOffset(monthOffset + 1);
    return availableYears.length === 0 || availableYears.includes(targetYear);
  }, [availableYears, monthOffset]);

  const goToOffsetPrevious = useCallback(() => {
    const targetYear = getTargetYearFromOffset(monthOffset - 1);
    if (availableYears.length > 0 && !availableYears.includes(targetYear)) {
      onBlocked(`No events exist in ${targetYear}.`);
      return;
    }
    onOffsetPrevious();
  }, [availableYears, monthOffset, onOffsetPrevious, onBlocked]);

  const goToOffsetNext = useCallback(() => {
    const targetYear = getTargetYearFromOffset(monthOffset + 1);
    if (availableYears.length > 0 && !availableYears.includes(targetYear)) {
      onBlocked(`No events exist in ${targetYear}.`);
      return;
    }
    onOffsetNext();
  }, [availableYears, monthOffset, onOffsetNext, onBlocked]);

  return {
    canGoYearMonthPrevious,
    canGoYearMonthNext,
    goToYearMonthPrevious,
    goToYearMonthNext,
    canGoOffsetPrevious,
    canGoOffsetNext,
    goToOffsetPrevious,
    goToOffsetNext,
  };
}
