"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../Button";
import { DateRangePreset } from "../dateRange";
import { getDateRangeFromPreset } from "../dateRange";
import { daysInMonth, formatDateLocal, formatDateParts, parseDateParts } from "../../utils/date";
import { UnifiedDateRangePickerProps } from "./types";
import { buildCalendarDays, monthLabels } from "./dateGridUtils";
import { useModalDismiss } from "./useModalDismiss";
import { useCalendarKeyboardNav } from "./useCalendarKeyboardNav";
import { PresetSidebar } from "./PresetSidebar";
import { YearMonthPickerView } from "./YearMonthPickerView";
import { MonthCalendarGrid } from "./MonthCalendarGrid";
import { DateRangeTextInputs } from "./DateRangeTextInputs";

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
  const today = formatDateLocal(new Date());
  const { year: currentYear, month: currentMonth } = parseDateParts(today);

  const { modalRef, handleTrapKeyDown } = useModalDismiss(isOpen, onClose);

  // Local state for pending changes
  const [pendingPreset, setPendingPreset] = useState<DateRangePreset>(selectedPreset);
  const [pendingStartDate, setPendingStartDate] = useState<string | null>(customRange.startDate);
  const [pendingEndDate, setPendingEndDate] = useState<string | null>(customRange.endDate);
  const [pendingYear, setPendingYear] = useState<number | null>(selectedYear);
  const [pendingMonth, setPendingMonth] = useState<number | null>(selectedMonth);

  // Calendar navigation state
  const [leftCalendar, setLeftCalendar] = useState<{ year: number; month: number }>({
    year: currentYear,
    month: currentMonth,
  });
  const leftCalendarYear = leftCalendar.year;
  const leftCalendarMonth = leftCalendar.month;

  // Selection mode for custom range
  const [selectionMode, setSelectionMode] = useState<"start" | "end">("start");

  // Year/Month picker view
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);

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

  const {
    focusedDate,
    setFocusedDate,
    activeCalendar,
    setActiveCalendar,
    leftFocusDate,
    rightFocusDate,
    handleDayFocus,
    handleDayKeyDown,
    setDayButtonRef,
    shouldFocusDateRef,
  } = useCalendarKeyboardNav({
    isOpen,
    showYearMonthPicker,
    leftDays,
    rightDays,
    leftCalendarYear,
    leftCalendarMonth,
    rightCalendarYear,
    rightCalendarMonth,
    setLeftCalendar,
    onDaySelect: handleDayClick,
  });

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
      setFocusedDate(customRange.startDate ?? customRange.endDate ?? today);
      setActiveCalendar("left");
      shouldFocusDateRef.current = false;

      // Set calendar to show current range or current month
      if (customRange.startDate) {
        const { year, month } = parseDateParts(customRange.startDate);
        setLeftCalendar({ year, month });
      } else if (selectedYear && selectedMonth) {
        setLeftCalendar({ year: selectedYear, month: selectedMonth });
      } else {
        setLeftCalendar({ year: currentYear, month: currentMonth });
      }
    }
  }, [isOpen, selectedPreset, customRange, selectedYear, selectedMonth, currentYear, currentMonth, today, setFocusedDate, setActiveCalendar, shouldFocusDateRef]);

  const handlePrevMonth = useCallback(() => {
    setLeftCalendar((prev) => {
      let year = prev.year;
      let month = prev.month - 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      return { year, month };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setLeftCalendar((prev) => {
      let year = prev.year;
      let month = prev.month + 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
  }, []);

  const handlePresetClick = useCallback((preset: DateRangePreset) => {
    setPendingPreset(preset);
    setPendingYear(null);
    setPendingMonth(null);
    setShowYearMonthPicker(false);

    // Calculate the date range for this preset to show in calendar
    const range = getDateRangeFromPreset(preset, customRange);
    setPendingStartDate(range.startDate);
    setPendingEndDate(range.endDate);
    setFocusedDate(range.startDate ?? range.endDate ?? today);
    setActiveCalendar("left");

    if (range.startDate) {
      const { year, month } = parseDateParts(range.startDate);
      setLeftCalendar({ year, month });
    }
  }, [customRange, today, setFocusedDate, setActiveCalendar]);

  const handleYearMonthClick = useCallback(() => {
    setShowYearMonthPicker(true);
  }, []);

  const handleMonthSelect = useCallback((year: number, month: number) => {
    setPendingPreset("year-month");
    setPendingYear(year);
    setPendingMonth(month);
    setShowYearMonthPicker(false);

    // Set date range for the selected month
    const startDate = formatDateParts(year, month, 1);
    const endDate = formatDateParts(year, month, daysInMonth(year, month));
    setPendingStartDate(startDate);
    setPendingEndDate(endDate);
    setFocusedDate(startDate);
    setActiveCalendar("left");

    setLeftCalendar({ year, month });
  }, [setFocusedDate, setActiveCalendar]);

  const handleStartDateChange = useCallback((newStartDate: string) => {
    // Prevent setting start date after end date
    if (pendingEndDate && newStartDate > pendingEndDate) {
      return;
    }

    setPendingStartDate(newStartDate);
    setPendingPreset("custom");
    setPendingYear(null);
    setPendingMonth(null);

    setFocusedDate(newStartDate);
    setActiveCalendar("left");
    const { year, month } = parseDateParts(newStartDate);
    setLeftCalendar({ year, month });
  }, [pendingEndDate, setFocusedDate, setActiveCalendar]);

  const handleEndDateChange = useCallback((newEndDate: string) => {
    // Prevent setting end date before start date
    if (pendingStartDate && newEndDate < pendingStartDate) {
      return;
    }

    setPendingEndDate(newEndDate);
    setPendingPreset("custom");
    setPendingYear(null);
    setPendingMonth(null);
  }, [pendingStartDate]);

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

  if (!isOpen) return null;

  const showDateInputs = pendingPreset !== "year-month" && !showYearMonthPicker;

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
        role="dialog"
        aria-modal="true"
        aria-label="Date range picker"
        onKeyDown={handleTrapKeyDown}
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
        <PresetSidebar
          isOpen={isOpen}
          pendingPreset={pendingPreset}
          pendingYear={pendingYear}
          pendingMonth={pendingMonth}
          onPresetClick={handlePresetClick}
          onYearMonthClick={handleYearMonthClick}
        />

        {/* Right Content - Calendar or Year/Month Picker */}
        <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column" }}>
          {showYearMonthPicker ? (
            <YearMonthPickerView
              availableYears={availableYears}
              currentYear={currentYear}
              pendingYear={pendingYear}
              pendingMonth={pendingMonth}
              onMonthSelect={handleMonthSelect}
              onBack={() => setShowYearMonthPicker(false)}
            />
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
                  aria-label="Previous month"
                  style={{
                    padding: "var(--space-sm) var(--space-md)",
                    border: "var(--border-width-thin) solid var(--btn-border)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--btn-bg)",
                    color: "var(--btn-text)",
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
                  aria-label="Next month"
                  style={{
                    padding: "var(--space-sm) var(--space-md)",
                    border: "var(--border-width-thin) solid var(--btn-border)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--btn-bg)",
                    color: "var(--btn-text)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-md)",
                  }}
                >
                  ›
                </button>
              </div>

              {/* Dual Calendar Grid */}
              <div style={{ display: "flex", gap: "var(--space-xl)" }}>
                <MonthCalendarGrid
                  days={leftDays}
                  year={leftCalendarYear}
                  month={leftCalendarMonth}
                  calendarSide="left"
                  focusDate={leftFocusDate}
                  onDayClick={handleDayClick}
                  onDayFocus={handleDayFocus}
                  onDayKeyDown={handleDayKeyDown}
                  setDayButtonRef={setDayButtonRef}
                />
                <MonthCalendarGrid
                  days={rightDays}
                  year={rightCalendarYear}
                  month={rightCalendarMonth}
                  calendarSide="right"
                  focusDate={rightFocusDate}
                  onDayClick={handleDayClick}
                  onDayFocus={handleDayFocus}
                  onDayKeyDown={handleDayKeyDown}
                  setDayButtonRef={setDayButtonRef}
                />
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
              justifyContent: showDateInputs ? "flex-start" : "center",
            }}
          >
            {showDateInputs && (
              <DateRangeTextInputs
                pendingStartDate={pendingStartDate}
                pendingEndDate={pendingEndDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
              />
            )}

            {showDateInputs && <div style={{ flex: 1 }} />}

            {/* Action Buttons */}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!canApply}
              variant="primary"
              size="sm"
            >
              Set Date
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
