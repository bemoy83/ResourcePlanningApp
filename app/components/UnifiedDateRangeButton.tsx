"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "./Button";
import { SegmentedControl } from "./SegmentedControl";
import { DateRange, DateRangePreset } from "./dateRange";
import { UnifiedDateRangePicker } from "./UnifiedDateRangePicker";
import { formatLabelDate, formatDateLocal, parseDateParts } from "../utils/date";

interface UnifiedDateRangeButtonProps {
  selectedPreset: DateRangePreset;
  customRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (range: DateRange) => void;
  availableYears: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
  activeDateRange: DateRange;
  isRangeLocked: boolean;
  onRangeLockChange: (locked: boolean) => void;
  // Month navigation props
  monthOffset?: number;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onYearMonthPrevious?: () => void;
  onYearMonthNext?: () => void;
  yearMonthPrevDisabled?: boolean;
  yearMonthNextDisabled?: boolean;
}

const presetLabels: Record<DateRangePreset, string> = {
  "this-week": "This Week",
  "next-2-weeks": "Next 2 Weeks",
  "this-month": "This Month",
  "next-3-months": "Next 3 Months",
  "next-6-months": "Next 6 Months",
  "this-year": "This Year",
  "year-month": "Year / Month",
  custom: "Custom",
};

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function UnifiedDateRangeButton({
  selectedPreset,
  customRange,
  onPresetChange,
  onCustomRangeChange,
  availableYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  activeDateRange,
  isRangeLocked,
  onRangeLockChange,
  monthOffset = 0,
  onPreviousMonth,
  onNextMonth,
  onYearMonthPrevious,
  onYearMonthNext,
  yearMonthPrevDisabled = false,
  yearMonthNextDisabled = false,
}: UnifiedDateRangeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttonLabel = useMemo(() => {
    if (selectedPreset === "year-month" && selectedYear !== null && selectedMonth !== null) {
      return `${monthLabels[selectedMonth - 1]} ${selectedYear}`;
    }

    if (selectedPreset === "custom" && activeDateRange.startDate && activeDateRange.endDate) {
      return `${formatLabelDate(activeDateRange.startDate)} - ${formatLabelDate(activeDateRange.endDate)}`;
    }

    return presetLabels[selectedPreset] || "Date Range";
  }, [selectedPreset, selectedYear, selectedMonth, activeDateRange]);

  // Show month stepper for "this-month" or "year-month" with selected month
  const showMonthStepper =
    selectedPreset === "this-month" ||
    (selectedPreset === "year-month" && selectedYear !== null && selectedMonth !== null);
  const hasActiveRange = Boolean(activeDateRange.startDate && activeDateRange.endDate);
  const showLockToggle = hasActiveRange;

  const getCurrentMonthName = useCallback((): string => {
    const today = formatDateLocal(new Date());
    const { year, month } = parseDateParts(today);
    let targetYear = year;
    let targetMonth = month + monthOffset;

    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    return `${monthLabels[targetMonth - 1]} ${targetYear}`;
  }, [monthOffset]);

  const getYearMonthLabel = useCallback((): string => {
    if (selectedYear === null || selectedMonth === null) {
      return "Year / Month";
    }
    return `${monthLabels[selectedMonth - 1]} ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const lockToggleLabel = isRangeLocked ? "Unlock browsing" : "Lock to range";

  const handlePrev = useCallback(() => {
    if (selectedPreset === "year-month") {
      onYearMonthPrevious?.();
    } else {
      onPreviousMonth?.();
    }
  }, [selectedPreset, onYearMonthPrevious, onPreviousMonth]);

  const handleNext = useCallback(() => {
    if (selectedPreset === "year-month") {
      onYearMonthNext?.();
    } else {
      onNextMonth?.();
    }
  }, [selectedPreset, onYearMonthNext, onNextMonth]);

  const isPrevDisabled = !isRangeLocked || (selectedPreset === "year-month"
    ? !onYearMonthPrevious || yearMonthPrevDisabled
    : !onPreviousMonth);

  const isNextDisabled = !isRangeLocked || (selectedPreset === "year-month"
    ? !onYearMonthNext || yearMonthNextDisabled
    : !onNextMonth);

  return (
    <>
      <SegmentedControl>
        <Button
          onClick={() => setIsOpen(true)}
          variant="segmented"
          size="sm"
          style={{
            padding: "6px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            minHeight: "28px", // Ensure consistent height with other buttons
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {buttonLabel}
        </Button>

        {showMonthStepper && (
          <>
            <Button
              onClick={handlePrev}
              variant="segmented"
              size="sm"
              disabled={isPrevDisabled}
              style={{
                padding: "6px 14px",
                minHeight: "28px", // Ensure consistent height with other buttons
              }}
            >
              Prev
            </Button>
            <Button
              onClick={handleNext}
              variant="segmented"
              size="sm"
              disabled={isNextDisabled}
              style={{
                padding: "6px 14px",
                minHeight: "28px", // Ensure consistent height with other buttons
              }}
            >
              Next
            </Button>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-tertiary)",
                padding: "0 var(--space-sm)",
                minWidth: "100px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {selectedPreset === "year-month" ? getYearMonthLabel() : getCurrentMonthName()}
            </span>
          </>
        )}
        {showLockToggle && (
          <Button
            onClick={() => onRangeLockChange(!isRangeLocked)}
            variant="segmented"
            size="sm"
            aria-pressed={!isRangeLocked}
            aria-label={lockToggleLabel}
            title={lockToggleLabel}
            style={{
              padding: "6px 10px",
              minHeight: "28px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRangeLocked ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 8-4" />
              </svg>
            )}
          </Button>
        )}
      </SegmentedControl>

      <UnifiedDateRangePicker
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        selectedPreset={selectedPreset}
        customRange={customRange}
        onPresetChange={onPresetChange}
        onCustomRangeChange={onCustomRangeChange}
        availableYears={availableYears}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
      />
    </>
  );
}
