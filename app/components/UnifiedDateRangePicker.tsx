"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, DateRangePreset } from "./dateRange";
import {
  daysInMonth,
  formatDateLocal,
  formatDateParts,
  formatLabelDate,
  getDayOfWeek,
  parseDateParts,
} from "../utils/date";

interface UnifiedDateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPreset: DateRangePreset;
  customRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (range: DateRange) => void;
  availableYears: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
}

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
}

const presets: Array<{ id: DateRangePreset; label: string }> = [
  { id: "this-week", label: "This Week" },
  { id: "next-2-weeks", label: "Next 2 Weeks" },
  { id: "this-month", label: "This Month" },
  { id: "next-3-months", label: "Next 3 Months" },
  { id: "next-6-months", label: "Next 6 Months" },
  { id: "this-year", label: "This Year" },
];

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildCalendarDays(
  year: number,
  month: number,
  rangeStart: string | null,
  rangeEnd: string | null
): CalendarDay[] {
  const today = formatDateLocal(new Date());
  const firstDayOfMonth = formatDateParts(year, month, 1);
  const startDayOfWeek = getDayOfWeek(firstDayOfMonth);
  const daysCount = daysInMonth(year, month);

  const days: CalendarDay[] = [];

  // Previous month days
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevMonthDays = daysInMonth(prevYear, prevMonth);

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const date = formatDateParts(prevYear, prevMonth, day);
    days.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: date === today,
      isSelected: date === rangeStart || date === rangeEnd,
      isInRange: isDateInRange(date, rangeStart, rangeEnd),
      isRangeStart: date === rangeStart,
      isRangeEnd: date === rangeEnd,
    });
  }

  // Current month days
  for (let day = 1; day <= daysCount; day++) {
    const date = formatDateParts(year, month, day);
    days.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: date === today,
      isSelected: date === rangeStart || date === rangeEnd,
      isInRange: isDateInRange(date, rangeStart, rangeEnd),
      isRangeStart: date === rangeStart,
      isRangeEnd: date === rangeEnd,
    });
  }

  // Next month days to fill remaining cells (up to 42 total for 6 rows)
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = formatDateParts(nextYear, nextMonth, day);
    days.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: date === today,
      isSelected: date === rangeStart || date === rangeEnd,
      isInRange: isDateInRange(date, rangeStart, rangeEnd),
      isRangeStart: date === rangeStart,
      isRangeEnd: date === rangeEnd,
    });
  }

  return days;
}

function isDateInRange(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

export function UnifiedDateRangePicker({
  isOpen,
  onClose,
  selectedPreset,
  customRange,
  onPresetChange,
  onCustomRangeChange,
  availableYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: UnifiedDateRangePickerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const today = formatDateLocal(new Date());
  const { year: currentYear, month: currentMonth } = parseDateParts(today);

  // Local state for pending changes
  const [pendingPreset, setPendingPreset] = useState<DateRangePreset>(selectedPreset);
  const [pendingStartDate, setPendingStartDate] = useState<string | null>(customRange.startDate);
  const [pendingEndDate, setPendingEndDate] = useState<string | null>(customRange.endDate);
  const [pendingYear, setPendingYear] = useState<number | null>(selectedYear);
  const [pendingMonth, setPendingMonth] = useState<number | null>(selectedMonth);
  const [startInput, setStartInput] = useState(customRange.startDate ?? "");
  const [endInput, setEndInput] = useState(customRange.endDate ?? "");

  // Calendar navigation state
  const [leftCalendarYear, setLeftCalendarYear] = useState(currentYear);
  const [leftCalendarMonth, setLeftCalendarMonth] = useState(currentMonth);

  // Selection mode for custom range
  const [selectionMode, setSelectionMode] = useState<"start" | "end">("start");

  // Year/Month picker view
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [yearPickerYear, setYearPickerYear] = useState<number>(currentYear);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingPreset(selectedPreset);
      setPendingStartDate(customRange.startDate);
      setPendingEndDate(customRange.endDate);
      setPendingYear(selectedYear);
      setPendingMonth(selectedMonth);
      setSelectionMode("start");
      setShowYearMonthPicker(false);

      // Set calendar to show current range or current month
      if (customRange.startDate) {
        const { year, month } = parseDateParts(customRange.startDate);
        setLeftCalendarYear(year);
        setLeftCalendarMonth(month);
      } else if (selectedYear && selectedMonth) {
        setLeftCalendarYear(selectedYear);
        setLeftCalendarMonth(selectedMonth);
      } else {
        setLeftCalendarYear(currentYear);
        setLeftCalendarMonth(currentMonth);
      }
    }
  }, [isOpen, selectedPreset, customRange, selectedYear, selectedMonth, currentYear, currentMonth]);

  useEffect(() => {
    setStartInput(pendingStartDate ?? "");
  }, [pendingStartDate]);

  useEffect(() => {
    setEndInput(pendingEndDate ?? "");
  }, [pendingEndDate]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Right calendar is always one month ahead
  const rightCalendarYear = leftCalendarMonth === 12 ? leftCalendarYear + 1 : leftCalendarYear;
  const rightCalendarMonth = leftCalendarMonth === 12 ? 1 : leftCalendarMonth + 1;

  // Build calendar days
  const leftDays = useMemo(
    () => buildCalendarDays(leftCalendarYear, leftCalendarMonth, pendingStartDate, pendingEndDate),
    [leftCalendarYear, leftCalendarMonth, pendingStartDate, pendingEndDate]
  );

  const rightDays = useMemo(
    () => buildCalendarDays(rightCalendarYear, rightCalendarMonth, pendingStartDate, pendingEndDate),
    [rightCalendarYear, rightCalendarMonth, pendingStartDate, pendingEndDate]
  );

  const handlePrevMonth = useCallback(() => {
    setLeftCalendarMonth((prev) => {
      if (prev === 1) {
        setLeftCalendarYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setLeftCalendarMonth((prev) => {
      if (prev === 12) {
        setLeftCalendarYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const handlePresetClick = useCallback((preset: DateRangePreset) => {
    setPendingPreset(preset);
    setPendingYear(null);
    setPendingMonth(null);
    setShowYearMonthPicker(false);

    // Calculate the date range for this preset to show in calendar
    const range = calculatePresetRange(preset);
    setPendingStartDate(range.startDate);
    setPendingEndDate(range.endDate);

    if (range.startDate) {
      const { year, month } = parseDateParts(range.startDate);
      setLeftCalendarYear(year);
      setLeftCalendarMonth(month);
    }
  }, []);

  const handleYearMonthClick = useCallback(() => {
    setShowYearMonthPicker(true);
    const fallbackYear = availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : currentYear;
    setYearPickerYear(pendingYear ?? fallbackYear);
  }, [availableYears, currentYear, pendingYear]);

  const handleMonthSelect = useCallback((month: number) => {
    setPendingPreset("year-month");
    setPendingYear(yearPickerYear);
    setPendingMonth(month);
    setShowYearMonthPicker(false);

    // Set date range for the selected month
    const startDate = formatDateParts(yearPickerYear, month, 1);
    const endDate = formatDateParts(yearPickerYear, month, daysInMonth(yearPickerYear, month));
    setPendingStartDate(startDate);
    setPendingEndDate(endDate);

    setLeftCalendarYear(yearPickerYear);
    setLeftCalendarMonth(month);
  }, [yearPickerYear]);

  const handleDayClick = useCallback((date: string) => {
    setPendingPreset("custom");
    setPendingYear(null);
    setPendingMonth(null);

    if (selectionMode === "start") {
      setPendingStartDate(date);
      setPendingEndDate(null);
      setSelectionMode("end");
    } else {
      // Ensure end date is after start date
      if (pendingStartDate && date < pendingStartDate) {
        setPendingStartDate(date);
        setPendingEndDate(pendingStartDate);
      } else {
        setPendingEndDate(date);
      }
      setSelectionMode("start");
    }
  }, [selectionMode, pendingStartDate]);

  const normalizeDateInput = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const [yearStr, monthStr, dayStr] = trimmed.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    if (month < 1 || month > 12) return null;
    const maxDay = daysInMonth(year, month);
    if (day < 1 || day > maxDay) return null;
    return trimmed;
  }, []);

  const handleStartDateInput = useCallback((value: string | null) => {
    const newStartDate = value || null;
    // Prevent setting start date after end date
    if (newStartDate && pendingEndDate && newStartDate > pendingEndDate) {
      return;
    }

    setPendingStartDate(newStartDate);
    setPendingPreset("custom");
    setPendingYear(null);
    setPendingMonth(null);

    if (newStartDate) {
      const { year, month } = parseDateParts(newStartDate);
      setLeftCalendarYear(year);
      setLeftCalendarMonth(month);
    }
  }, [pendingEndDate]);

  const handleEndDateInput = useCallback((value: string | null) => {
    const newEndDate = value || null;

    // Prevent setting end date before start date
    if (newEndDate && pendingStartDate && newEndDate < pendingStartDate) {
      return;
    }

    setPendingEndDate(newEndDate);
    setPendingPreset("custom");
    setPendingYear(null);
    setPendingMonth(null);
  }, [pendingStartDate]);

  const applyStartInput = useCallback(() => {
    const normalized = normalizeDateInput(startInput);
    if (!normalized) {
      setStartInput(pendingStartDate ?? "");
      return;
    }
    handleStartDateInput(normalized);
    setStartInput(normalized);
  }, [handleStartDateInput, normalizeDateInput, pendingStartDate, startInput]);

  const applyEndInput = useCallback(() => {
    const normalized = normalizeDateInput(endInput);
    if (!normalized) {
      setEndInput(pendingEndDate ?? "");
      return;
    }
    handleEndDateInput(normalized);
    setEndInput(normalized);
  }, [endInput, handleEndDateInput, normalizeDateInput, pendingEndDate]);

  const handleApply = useCallback(() => {
    if (pendingPreset === "year-month" && pendingYear !== null && pendingMonth !== null) {
      onYearChange(pendingYear);
      onMonthChange(pendingMonth);
      onPresetChange("year-month");
    } else if (pendingPreset === "custom") {
      if (pendingStartDate && pendingEndDate) {
        onCustomRangeChange({ startDate: pendingStartDate, endDate: pendingEndDate });
        onPresetChange("custom");
      }
    } else {
      onYearChange(null);
      onMonthChange(null);
      onPresetChange(pendingPreset);
    }
    onClose();
  }, [
    pendingPreset,
    pendingYear,
    pendingMonth,
    pendingStartDate,
    pendingEndDate,
    onPresetChange,
    onCustomRangeChange,
    onYearChange,
    onMonthChange,
    onClose,
  ]);

  const canApply = useMemo(() => {
    if (pendingPreset === "custom") {
      return !!pendingStartDate && !!pendingEndDate;
    }
    if (pendingPreset === "year-month") {
      return pendingYear !== null && pendingMonth !== null;
    }
    return true;
  }, [pendingPreset, pendingStartDate, pendingEndDate, pendingYear, pendingMonth]);

  const displayRange = useMemo(() => {
    if (pendingStartDate && pendingEndDate) {
      return `${formatLabelDate(pendingStartDate)} - ${formatLabelDate(pendingEndDate)}`;
    }
    if (pendingStartDate) {
      return `${formatLabelDate(pendingStartDate)} - Select end`;
    }
    return "Select date range";
  }, [pendingStartDate, pendingEndDate]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: "var(--surface-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          border: "var(--border-width-thin) solid var(--border-secondary)",
          display: "flex",
          overflow: "hidden",
          animation: "dropdownEnter 150ms var(--ease-out)",
          maxHeight: "90vh",
          maxWidth: "90vw",
        }}
      >
        {/* Left Sidebar - Presets */}
        <div
          style={{
            width: "160px",
            borderRight: "var(--border-width-thin) solid var(--border-secondary)",
            padding: "var(--space-md) 0",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id)}
              style={{
                padding: "var(--space-sm) var(--space-lg)",
                border: "none",
                backgroundColor: pendingPreset === preset.id ? "var(--bg-primary)" : "transparent",
                color: pendingPreset === preset.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: pendingPreset === preset.id ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                fontSize: "var(--font-size-sm)",
                textAlign: "left",
                cursor: "pointer",
                borderRight: pendingPreset === preset.id ? "2px solid var(--chip-selected-bg)" : "2px solid transparent",
                transition: "all var(--transition-fast)",
              }}
            >
              {preset.label}
            </button>
          ))}

          <div
            style={{
              height: "1px",
              backgroundColor: "var(--border-secondary)",
              margin: "var(--space-sm) var(--space-lg)",
            }}
          />

          <button
            onClick={handleYearMonthClick}
            style={{
              padding: "var(--space-sm) var(--space-lg)",
              border: "none",
              backgroundColor: pendingPreset === "year-month" ? "var(--bg-primary)" : "transparent",
              color: pendingPreset === "year-month" ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: pendingPreset === "year-month" ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
              fontSize: "var(--font-size-sm)",
              textAlign: "left",
              cursor: "pointer",
              borderRight: pendingPreset === "year-month" ? "2px solid var(--chip-selected-bg)" : "2px solid transparent",
              transition: "all var(--transition-fast)",
            }}
          >
            {pendingPreset === "year-month" && pendingYear && pendingMonth
              ? `${monthLabels[pendingMonth - 1]} ${pendingYear}`
              : "Year / Month"}
          </button>

        </div>

        {/* Right Content - Calendar or Year/Month Picker */}
        <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column" }}>
          {showYearMonthPicker ? (
            // Year/Month Picker View
            <div style={{ width: "320px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <button
                  onClick={() => {
                    const idx = availableYears.indexOf(yearPickerYear);
                    if (idx > 0) setYearPickerYear(availableYears[idx - 1]);
                  }}
                  disabled={availableYears.indexOf(yearPickerYear) <= 0}
                  style={{
                    padding: "6px 12px",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    cursor: availableYears.indexOf(yearPickerYear) <= 0 ? "not-allowed" : "pointer",
                    opacity: availableYears.indexOf(yearPickerYear) <= 0 ? 0.5 : 1,
                    fontSize: "var(--font-size-md)",
                  }}
                >
                  ‹
                </button>
                <span
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text-primary)",
                  }}
                >
                  {yearPickerYear}
                </span>
                <button
                  onClick={() => {
                    const idx = availableYears.indexOf(yearPickerYear);
                    if (idx >= 0 && idx < availableYears.length - 1) setYearPickerYear(availableYears[idx + 1]);
                  }}
                  disabled={availableYears.indexOf(yearPickerYear) >= availableYears.length - 1}
                  style={{
                    padding: "6px 12px",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    cursor: availableYears.indexOf(yearPickerYear) >= availableYears.length - 1 ? "not-allowed" : "pointer",
                    opacity: availableYears.indexOf(yearPickerYear) >= availableYears.length - 1 ? 0.5 : 1,
                    fontSize: "var(--font-size-md)",
                  }}
                >
                  ›
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "var(--space-sm)",
                }}
              >
                {monthLabels.map((label, idx) => {
                  const monthValue = idx + 1;
                  const isSelected = pendingMonth === monthValue && pendingYear === yearPickerYear;
                  return (
                    <button
                      key={label}
                      onClick={() => handleMonthSelect(monthValue)}
                      style={{
                        padding: "10px",
                        border: "var(--border-width-thin) solid var(--border-primary)",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: isSelected ? "var(--chip-selected-bg)" : "var(--surface-default)",
                        color: isSelected ? "var(--chip-selected-text)" : "var(--text-primary)",
                        fontWeight: isSelected ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                        fontSize: "var(--font-size-sm)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowYearMonthPicker(false)}
                style={{
                  marginTop: "var(--space-lg)",
                  padding: "var(--space-sm) var(--space-lg)",
                  border: "var(--border-width-thin) solid var(--border-primary)",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--surface-default)",
                  color: "var(--text-secondary)",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Back to Calendar
              </button>
            </div>
          ) : (
            // Calendar View
            <>
              {/* Calendars Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-md)",
                }}
              >
                <button
                  onClick={handlePrevMonth}
                  style={{
                    padding: "6px 12px",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-md)",
                  }}
                >
                  ‹
                </button>
                <div style={{ display: "flex", gap: "var(--space-2xl)" }}>
                  <span
                    style={{
                      fontSize: "var(--font-size-md)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text-primary)",
                      minWidth: "140px",
                      textAlign: "center",
                    }}
                  >
                    {monthLabels[leftCalendarMonth - 1]} {leftCalendarYear}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-md)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text-primary)",
                      minWidth: "140px",
                      textAlign: "center",
                    }}
                  >
                    {monthLabels[rightCalendarMonth - 1]} {rightCalendarYear}
                  </span>
                </div>
                <button
                  onClick={handleNextMonth}
                  style={{
                    padding: "6px 12px",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-md)",
                  }}
                >
                  ›
                </button>
              </div>

              {/* Dual Calendar Grid */}
              <div style={{ display: "flex", gap: "var(--space-xl)" }}>
                {/* Left Calendar */}
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 36px)",
                      gap: "2px",
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    {dayLabels.map((label) => (
                      <div
                        key={label}
                        style={{
                          textAlign: "center",
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--text-tertiary)",
                          padding: "4px 0",
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 36px)",
                      gap: "2px",
                    }}
                  >
                    {leftDays.map((dayInfo, idx) => (
                      <CalendarDayButton key={idx} dayInfo={dayInfo} onClick={handleDayClick} />
                    ))}
                  </div>
                </div>

                {/* Right Calendar */}
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 36px)",
                      gap: "2px",
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    {dayLabels.map((label) => (
                      <div
                        key={label}
                        style={{
                          textAlign: "center",
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--text-tertiary)",
                          padding: "4px 0",
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 36px)",
                      gap: "2px",
                    }}
                  >
                    {rightDays.map((dayInfo, idx) => (
                      <CalendarDayButton key={idx} dayInfo={dayInfo} onClick={handleDayClick} />
                    ))}
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Footer: Date Inputs + Actions */}
          <div
            style={{
              marginTop: "var(--space-lg)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              paddingTop: "var(--space-md)",
              borderTop: "var(--border-width-thin) solid var(--border-secondary)",
              justifyContent: (pendingPreset === "year-month" || showYearMonthPicker) ? "center" : "flex-start",
            }}
          >
            {/* Date Inputs - Hidden when year-month is selected or when showing year/month picker */}
            {pendingPreset !== "year-month" && !showYearMonthPicker && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  onBlur={applyStartInput}
                  style={{
                    padding: "6px 10px",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                    width: "130px",
                  }}
                />
                <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)" }}>
                  to
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  onBlur={applyEndInput}
                  style={{
                    padding: "6px 10px",
                    border: "var(--border-width-thin) solid var(--border-primary)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                    width: "130px",
                  }}
                />
              </div>
            )}

            {/* Spacer - Only show when date inputs are present */}
            {pendingPreset !== "year-month" && !showYearMonthPicker && (
              <div style={{ flex: 1 }} />
            )}

            {/* Action Buttons */}
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "var(--border-width-thin) solid var(--border-primary)",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--surface-default)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "var(--radius-full)",
                backgroundColor: canApply ? "var(--chip-selected-bg)" : "var(--border-strong)",
                color: canApply ? "var(--chip-selected-text)" : "var(--text-tertiary)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
                cursor: canApply ? "pointer" : "not-allowed",
                opacity: canApply ? 1 : 0.6,
              }}
            >
              Set Date
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarDayButton({
  dayInfo,
  onClick,
}: {
  dayInfo: CalendarDay;
  onClick: (date: string) => void;
}) {
  const { date, day, isCurrentMonth, isToday, isSelected, isInRange, isRangeStart, isRangeEnd } = dayInfo;

  let backgroundColor = "transparent";
  let color = isCurrentMonth ? "var(--text-primary)" : "var(--text-tertiary)";
  let fontWeight: string = "var(--font-weight-medium)";
  let borderRadius = "50%";

  if (isSelected || isRangeStart || isRangeEnd) {
    backgroundColor = "var(--chip-selected-bg)";
    color = "var(--chip-selected-text)";
    fontWeight = "var(--font-weight-semibold)";
  } else if (isInRange) {
    backgroundColor = "var(--bg-tertiary)";
    borderRadius = "0";
  }

  if (isRangeStart && isInRange) {
    borderRadius = "50% 0 0 50%";
  } else if (isRangeEnd && isInRange) {
    borderRadius = "0 50% 50% 0";
  }

  return (
    <button
      onClick={() => onClick(date)}
      style={{
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: isToday ? "2px solid var(--chip-selected-bg)" : "none",
        borderRadius,
        backgroundColor,
        color,
        fontWeight,
        fontSize: "var(--font-size-sm)",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
      }}
    >
      {day}
    </button>
  );
}

// Helper to calculate date range from preset
function calculatePresetRange(preset: DateRangePreset): DateRange {
  const today = formatDateLocal(new Date());
  const { year, month } = parseDateParts(today);

  switch (preset) {
    case "this-week": {
      const dayOfWeek = getDayOfWeek(today);
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      let startYear = year;
      let startMonth = month;
      let startDay = parseDateParts(today).day + mondayOffset;

      // Handle month boundaries
      if (startDay < 1) {
        startMonth -= 1;
        if (startMonth < 1) {
          startMonth = 12;
          startYear -= 1;
        }
        startDay += daysInMonth(startYear, startMonth);
      }

      const startDate = formatDateParts(startYear, startMonth, startDay);

      // End date is 6 days after start
      let endYear = startYear;
      let endMonth = startMonth;
      let endDay = startDay + 6;
      const daysInStartMonth = daysInMonth(endYear, endMonth);
      if (endDay > daysInStartMonth) {
        endDay -= daysInStartMonth;
        endMonth += 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
      }
      const endDate = formatDateParts(endYear, endMonth, endDay);

      return { startDate, endDate };
    }

    case "next-2-weeks": {
      let endYear = year;
      let endMonth = month;
      let endDay = parseDateParts(today).day + 14;
      while (endDay > daysInMonth(endYear, endMonth)) {
        endDay -= daysInMonth(endYear, endMonth);
        endMonth += 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
      }
      return { startDate: today, endDate: formatDateParts(endYear, endMonth, endDay) };
    }

    case "this-month": {
      return {
        startDate: formatDateParts(year, month, 1),
        endDate: formatDateParts(year, month, daysInMonth(year, month)),
      };
    }

    case "next-3-months": {
      let endYear = year;
      let endMonth = month;
      let endDay = parseDateParts(today).day + 90;
      while (endDay > daysInMonth(endYear, endMonth)) {
        endDay -= daysInMonth(endYear, endMonth);
        endMonth += 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
      }
      return { startDate: today, endDate: formatDateParts(endYear, endMonth, endDay) };
    }

    case "next-6-months": {
      let endYear = year;
      let endMonth = month;
      let endDay = parseDateParts(today).day + 180;
      while (endDay > daysInMonth(endYear, endMonth)) {
        endDay -= daysInMonth(endYear, endMonth);
        endMonth += 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
      }
      return { startDate: today, endDate: formatDateParts(endYear, endMonth, endDay) };
    }

    case "this-year": {
      return {
        startDate: formatDateParts(year, 1, 1),
        endDate: formatDateParts(year, 12, 31),
      };
    }

    default:
      return { startDate: null, endDate: null };
  }
}
