"use client";

import { useState } from "react";
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
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#000",
            marginRight: "4px",
          }}
        >
          Date Range:
        </span>
        {presets.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleChipClick(preset.id)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: isSelected ? "bold" : "normal",
                color: isSelected ? "#fff" : "#000",
                backgroundColor: isSelected ? "#333" : "#fff",
                border: isSelected ? "2px solid #000" : "2px solid #999",
                borderRadius: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "#f0f0f0";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "#fff";
                }
              }}
            >
              {getChipLabel(preset.id)}
            </button>
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
              zIndex: 9998,
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
              backgroundColor: "#fff",
              border: "2px solid #666",
              borderRadius: "8px",
              padding: "24px",
              zIndex: 9999,
              minWidth: "400px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              Custom Date Range
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  color: "#000",
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
                  padding: "8px",
                  fontSize: "12px",
                  border: "2px solid #999",
                  borderRadius: "4px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  color: "#000",
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
                  padding: "8px",
                  fontSize: "12px",
                  border: "2px solid #999",
                  borderRadius: "4px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={handleCustomCancel}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#000",
                  backgroundColor: "#fff",
                  border: "2px solid #999",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomApply}
                disabled={!tempStartDate || !tempEndDate}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#fff",
                  backgroundColor: tempStartDate && tempEndDate ? "#333" : "#999",
                  border: "2px solid #000",
                  borderRadius: "4px",
                  cursor: tempStartDate && tempEndDate ? "pointer" : "not-allowed",
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
