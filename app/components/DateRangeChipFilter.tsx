"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "./Chip";
import { SegmentedControl } from "./SegmentedControl";
import { Button } from "./Button";
import {
  addDays,
  daysInMonth,
  formatDateLocal,
  formatDateParts,
  formatLabelDate,
  getDayOfWeek,
  parseDateParts,
} from "../utils/date";

export type DateRangePreset =
  | "this-week"
  | "next-2-weeks"
  | "this-month"
  | "next-3-months"
  | "next-6-months"
  | "this-year"
  | "year-month"
  | "custom";

export interface DateRange {
  startDate: string | null; // ISO date string YYYY-MM-DD
  endDate: string | null;   // ISO date string YYYY-MM-DD
}

interface DateRangeChipFilterProps {
  selectedPreset: DateRangePreset;
  customRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (range: DateRange) => void;
  availableYears: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
  monthOffset?: number;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onYearMonthPrevious?: () => void;
  onYearMonthNext?: () => void;
  yearMonthPrevDisabled?: boolean;
  yearMonthNextDisabled?: boolean;
}

const presets: Array<{ id: DateRangePreset; label: string }> = [
  { id: "this-week", label: "This Week" },
  { id: "next-2-weeks", label: "Next 2 Weeks" },
  { id: "this-month", label: "This Month" },
  { id: "next-3-months", label: "Next 3 Months" },
  { id: "next-6-months", label: "Next 6 Months" },
  { id: "this-year", label: "This Year" },
  { id: "custom", label: "Custom..." },
];

export function DateRangeChipFilter({
  selectedPreset,
  customRange,
  onPresetChange,
  onCustomRangeChange,
  availableYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  monthOffset = 0,
  onPreviousMonth,
  onNextMonth,
  onYearMonthPrevious,
  onYearMonthNext,
  yearMonthPrevDisabled = false,
  yearMonthNextDisabled = false,
}: DateRangeChipFilterProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customRange.startDate || "");
  const [tempEndDate, setTempEndDate] = useState(customRange.endDate || "");
  const [showYearMonthModal, setShowYearMonthModal] = useState(false);
  const [modalYear, setModalYear] = useState<number | null>(null);
  const yearMonthAnchorRef = useRef<HTMLDivElement>(null);
  const customAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showYearMonthModal) {
      return;
    }
    const fallbackYear =
      availableYears.length > 0
        ? availableYears[availableYears.length - 1]
        : new Date().getFullYear();
    setModalYear(selectedYear ?? fallbackYear);
  }, [availableYears, selectedYear, showYearMonthModal]);

  useEffect(() => {
    if (!showYearMonthModal) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (yearMonthAnchorRef.current?.contains(target)) return;
      setShowYearMonthModal(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showYearMonthModal]);

  useEffect(() => {
    if (!showCustomModal) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (customAnchorRef.current?.contains(target)) return;
      setShowCustomModal(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomModal]);

  const handleChipClick = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setShowCustomModal((prev) => !prev);
    } else {
      onPresetChange(preset);
    }
  };

  const handleCustomApply = () => {
    if (tempStartDate && tempEndDate) {
      onCustomRangeChange({
        startDate: tempStartDate,
        endDate: tempEndDate,
      });
      onPresetChange("custom");
      setShowCustomModal(false);
    }
  };

  const handleCustomCancel = () => {
    setTempStartDate(customRange.startDate || "");
    setTempEndDate(customRange.endDate || "");
    setShowCustomModal(false);
  };

  const getChipLabel = (preset: DateRangePreset): string => {
    if (preset === "custom" && selectedPreset === "custom" && customRange.startDate && customRange.endDate) {
      const start = formatLabelDate(customRange.startDate);
      const end = formatLabelDate(customRange.endDate);
      return `${start} - ${end}`;
    }
    return presets.find((p) => p.id === preset)?.label || preset;
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getCurrentMonthName = (): string => {
    const today = formatDateLocal(new Date());
    const { year, month } = parseDateParts(today);
    let targetYear = year;
    let targetMonth = month + monthOffset;
    
    // Handle year rollover
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    
    return `${monthLabels[targetMonth - 1]} ${targetYear}`;
  };

  const showMonthStepper =
    selectedPreset === "this-month" ||
    (selectedPreset === "year-month" && selectedYear !== null && selectedMonth !== null);

  const getYearMonthLabel = (): string => {
    if (selectedYear === null || selectedMonth === null) {
      return "Year / Month";
    }
    return `${monthLabels[selectedMonth - 1]} ${selectedYear}`;
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--text-tertiary)",
            marginRight: "var(--space-xs)",
          }}
        >
          Date Range
        </span>
        <SegmentedControl
          style={{
            flexWrap: "wrap",
            gap: "var(--space-sm)",
          }}
        >
          {presets.filter((preset) => preset.id !== "custom").map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <Chip
              key={preset.id}
              selected={isSelected}
              onClick={() => handleChipClick(preset.id)}
              variant="segmented"
            >
              {getChipLabel(preset.id)}
            </Chip>
          );
        })}
      </SegmentedControl>
      {showMonthStepper && (
        <SegmentedControl
          style={{
            marginLeft: "var(--space-sm)",
          }}
        >
          <Button
            onClick={selectedPreset === "year-month" ? onYearMonthPrevious : onPreviousMonth}
            variant="segmented"
            size="sm"
            style={{
              padding: "6px 14px",
            }}
            disabled={
              selectedPreset === "year-month"
                ? !onYearMonthPrevious || yearMonthPrevDisabled
                : !onPreviousMonth
            }
          >
            Prev
          </Button>
          <Button
            onClick={selectedPreset === "year-month" ? onYearMonthNext : onNextMonth}
            variant="segmented"
            size="sm"
            style={{
              padding: "6px 14px",
            }}
            disabled={
              selectedPreset === "year-month"
                ? !onYearMonthNext || yearMonthNextDisabled
                : !onNextMonth
            }
          >
            Next
          </Button>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              padding: "0 var(--space-sm)",
              minWidth: "100px",
            }}
          >
            {selectedPreset === "year-month" ? getYearMonthLabel() : getCurrentMonthName()}
          </span>
        </SegmentedControl>
      )}
      <SegmentedControl
        style={{
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          marginLeft: "auto",
        }}
      >
        <div ref={customAnchorRef} style={{ position: "relative", display: "inline-flex" }}>
          <Chip
            selected={selectedPreset === "custom"}
            onClick={() => handleChipClick("custom")}
            variant="segmented"
          >
            {getChipLabel("custom")}
          </Chip>
          {showCustomModal && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "var(--space-sm)",
                backgroundColor: "var(--surface-default)",
                border: "var(--border-width-thin) solid var(--border-secondary)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-xl)",
                zIndex: "var(--z-dropdown-panel)" as any,
                minWidth: "320px",
                boxShadow: "var(--shadow-xl)",
                animation: "dropdownEnter 150ms var(--ease-out)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 var(--space-lg) 0",
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                }}
              >
                Custom Date Range
              </h3>

              <div style={{ marginBottom: "var(--space-lg)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    marginBottom: "var(--space-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "var(--font-size-sm)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-lg)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    outline: "none",
                    transition: "all var(--transition-fast)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--interactive-focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--interactive-focus-bg)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-primary)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "var(--space-xl)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    marginBottom: "var(--space-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  End Date
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "var(--font-size-sm)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-lg)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    outline: "none",
                    transition: "all var(--transition-fast)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--interactive-focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--interactive-focus-bg)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-primary)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "var(--space-sm)",
                }}
              >
                <button
                  onClick={handleCustomCancel}
                  style={{
                    padding: "10px 18px",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-default)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    boxShadow: "var(--shadow-pill)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomApply}
                  disabled={!tempStartDate || !tempEndDate}
                  style={{
                    padding: "10px 18px",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: tempStartDate && tempEndDate ? "var(--chip-selected-text)" : "var(--text-primary)",
                    backgroundColor: tempStartDate && tempEndDate ? "var(--chip-selected-bg)" : "var(--border-strong)",
                    border: "var(--border-width-thin) solid transparent",
                    borderRadius: "var(--radius-full)",
                    cursor: tempStartDate && tempEndDate ? "pointer" : "not-allowed",
                    opacity: tempStartDate && tempEndDate ? 1 : 0.5,
                    transition: "all var(--transition-fast)",
                    boxShadow: "none",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        <div
          ref={yearMonthAnchorRef}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-sm)", position: "relative" }}
        >
          <Chip
            selected={selectedPreset === "year-month"}
            onClick={() => {
              setShowYearMonthModal((prev) => !prev);
            }}
            variant="segmented"
          >
            <span>
              {selectedYear !== null && selectedMonth !== null
                ? `${selectedYear} • ${monthLabels[selectedMonth - 1]}`
                : selectedYear !== null
                ? `Year ${selectedYear}`
                : "Year / Month"}
            </span>
          </Chip>

          {showYearMonthModal && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "var(--space-sm)",
                backgroundColor: "var(--surface-default)",
                border: "var(--border-width-thin) solid var(--border-secondary)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-xl) var(--space-2xl) var(--space-2xl)",
                zIndex: "var(--z-dropdown-panel)" as any,
                minWidth: "320px",
                maxWidth: "420px",
                boxShadow: "var(--shadow-xl)",
                animation: "dropdownEnter 150ms var(--ease-out)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (availableYears.length === 0) return;
                    const currentIndex = availableYears.indexOf(modalYear ?? -1);
                    if (currentIndex > 0) {
                      setModalYear(availableYears[currentIndex - 1]);
                    }
                  }}
                  disabled={availableYears.length === 0 || availableYears.indexOf(modalYear ?? -1) <= 0}
                  style={{
                    padding: "6px 10px",
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-default)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    cursor:
                      availableYears.length === 0 || availableYears.indexOf(modalYear ?? -1) <= 0
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      availableYears.length === 0 || availableYears.indexOf(modalYear ?? -1) <= 0 ? 0.5 : 1,
                  }}
                  aria-label="Previous year"
                >
                  ‹
                </button>
                <div
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text-primary)",
                  }}
                >
                  {modalYear ?? "Year"}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (availableYears.length === 0) return;
                    const currentIndex = availableYears.indexOf(modalYear ?? -1);
                    if (currentIndex >= 0 && currentIndex < availableYears.length - 1) {
                      setModalYear(availableYears[currentIndex + 1]);
                    }
                  }}
                  disabled={
                    availableYears.length === 0 ||
                    availableYears.indexOf(modalYear ?? -1) >= availableYears.length - 1
                  }
                  style={{
                    padding: "6px 10px",
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-default)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    cursor:
                      availableYears.length === 0 ||
                      availableYears.indexOf(modalYear ?? -1) >= availableYears.length - 1
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      availableYears.length === 0 ||
                      availableYears.indexOf(modalYear ?? -1) >= availableYears.length - 1
                        ? 0.5
                        : 1,
                  }}
                  aria-label="Next year"
                >
                  ›
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "var(--space-sm)",
                }}
              >
                {monthLabels.map((label, index) => {
                  const monthValue = index + 1;
                  const isSelected = selectedMonth === monthValue && selectedYear === modalYear;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (modalYear === null) return;
                        onYearChange(modalYear);
                        onMonthChange(monthValue);
                        setShowYearMonthModal(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: isSelected ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                        color: isSelected ? "var(--chip-selected-text)" : "var(--text-primary)",
                        backgroundColor: isSelected ? "var(--chip-selected-bg)" : "var(--surface-default)",
                        border: "var(--border-width-thin) solid var(--border-primary)",
                        borderRadius: "var(--radius-full)",
                        cursor: modalYear === null ? "not-allowed" : "pointer",
                        opacity: modalYear === null ? 0.5 : 1,
                        transition: "all var(--transition-fast)",
                      }}
                      disabled={modalYear === null}
                    >
                      {label}
                    </button>
                  );
                })}
                {availableYears.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No years available
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "var(--space-xl)",
                }}
              >
                <button
                  onClick={() => {
                    onYearChange(null);
                    onMonthChange(null);
                    setShowYearMonthModal(false);
                  }}
                  style={{
                    padding: "10px 20px",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-default)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    boxShadow: "var(--shadow-pill)",
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowYearMonthModal(false)}
                  style={{
                    padding: "10px 20px",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-default)",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    boxShadow: "var(--shadow-pill)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </SegmentedControl>
      </div>


    </>
  );
}

// Utility function to calculate date range from preset
export function getDateRangeFromPreset(preset: DateRangePreset, customRange: DateRange): DateRange {
  const today = formatDateLocal(new Date());

  switch (preset) {
    case "this-week": {
      const dayOfWeek = getDayOfWeek(today);
      const monday = addDays(today, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const sunday = addDays(monday, 6);
      return {
        startDate: monday,
        endDate: sunday,
      };
    }

    case "next-2-weeks": {
      const endDate = addDays(today, 14);
      return {
        startDate: today,
        endDate,
      };
    }

    case "this-month": {
      const { year, month } = parseDateParts(today);
      const firstDay = formatDateParts(year, month, 1);
      const lastDay = formatDateParts(year, month, daysInMonth(year, month));
      return {
        startDate: firstDay,
        endDate: lastDay,
      };
    }

    case "next-3-months": {
      const endDate = addDays(today, 90);
      return {
        startDate: today,
        endDate,
      };
    }

    case "next-6-months": {
      const endDate = addDays(today, 180);
      return {
        startDate: today,
        endDate,
      };
    }

    case "this-year": {
      const { year } = parseDateParts(today);
      const firstDay = formatDateParts(year, 1, 1);
      const lastDay = formatDateParts(year, 12, 31);
      return {
        startDate: firstDay,
        endDate: lastDay,
      };
    }

    case "custom":
      return customRange;
    case "year-month":
      return customRange;

    default:
      return { startDate: null, endDate: null };
  }
}
