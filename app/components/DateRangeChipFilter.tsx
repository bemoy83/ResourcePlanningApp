"use client";

import { useState } from "react";
import { Chip } from "./Chip";
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
  | "all-time"
  | "this-week"
  | "next-2-weeks"
  | "this-month"
  | "next-3-months"
  | "next-6-months"
  | "this-year"
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
}

const presets: Array<{ id: DateRangePreset; label: string }> = [
  { id: "all-time", label: "All Time" },
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
}: DateRangeChipFilterProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customRange.startDate || "");
  const [tempEndDate, setTempEndDate] = useState(customRange.endDate || "");

  const handleChipClick = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setShowCustomModal(true);
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
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            marginRight: "var(--space-xs)",
          }}
        >
          Date Range:
        </span>
        {presets.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <Chip
              key={preset.id}
              selected={isSelected}
              onClick={() => handleChipClick(preset.id)}
            >
              {getChipLabel(preset.id)}
            </Chip>
          );
        })}
      </div>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: "var(--z-modal-backdrop)" as any,
            }}
            onClick={handleCustomCancel}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "var(--surface-default)",
              border: "var(--border-width-medium) solid var(--border-strong)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-2xl)",
              zIndex: "var(--z-modal)" as any,
              minWidth: "400px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <h3
              style={{
                margin: "0 0 var(--space-lg) 0",
                fontSize: "var(--font-size-lg)",
                fontWeight: "var(--font-weight-bold)",
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
                  fontWeight: "var(--font-weight-bold)",
                  marginBottom: "var(--space-xs)",
                  color: "var(--text-primary)",
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
                  padding: "var(--space-sm)",
                  fontSize: "var(--font-size-sm)",
                  border: "var(--border-width-medium) solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "var(--space-2xl)" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-bold)",
                  marginBottom: "var(--space-xs)",
                  color: "var(--text-primary)",
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
                  padding: "var(--space-sm)",
                  fontSize: "var(--font-size-sm)",
                  border: "var(--border-width-medium) solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  boxSizing: "border-box",
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
                  padding: "var(--space-sm) var(--space-lg)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--surface-default)",
                  border: "var(--border-width-medium) solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomApply}
                disabled={!tempStartDate || !tempEndDate}
                style={{
                  padding: "var(--space-sm) var(--space-lg)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--text-inverse)",
                  backgroundColor: tempStartDate && tempEndDate ? "var(--button-primary-bg)" : "var(--border-primary)",
                  border: "var(--border-width-medium) solid var(--button-primary-border)",
                  borderRadius: "var(--radius-md)",
                  cursor: tempStartDate && tempEndDate ? "pointer" : "not-allowed",
                  opacity: tempStartDate && tempEndDate ? 1 : 0.6,
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Utility function to calculate date range from preset
export function getDateRangeFromPreset(preset: DateRangePreset, customRange: DateRange): DateRange {
  const today = formatDateLocal(new Date());

  switch (preset) {
    case "all-time":
      return { startDate: null, endDate: null };

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

    default:
      return { startDate: null, endDate: null };
  }
}
