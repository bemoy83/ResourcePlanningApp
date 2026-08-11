import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DateRangePreset } from "../dateRange";
import { monthLabels } from "./dateGridUtils";

export const presets: Array<{ id: DateRangePreset; label: string }> = [
  { id: "this-week", label: "This Week" },
  { id: "next-2-weeks", label: "Next 2 Weeks" },
  { id: "this-month", label: "This Month" },
  { id: "next-3-months", label: "Next 3 Months" },
  { id: "next-6-months", label: "Next 6 Months" },
  { id: "this-year", label: "This Year" },
];

interface PresetSidebarProps {
  isOpen: boolean;
  pendingPreset: DateRangePreset;
  pendingYear: number | null;
  pendingMonth: number | null;
  onPresetClick: (preset: DateRangePreset) => void;
  onYearMonthClick: () => void;
}

export function PresetSidebar({
  isOpen,
  pendingPreset,
  pendingYear,
  pendingMonth,
  onPresetClick,
  onYearMonthClick,
}: PresetSidebarProps) {
  const presetButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const shouldFocusPresetRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      shouldFocusPresetRef.current = true;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shouldFocusPresetRef.current) return;
    const targetKey = pendingPreset === "year-month" ? "year-month" : pendingPreset;
    const button = presetButtonRefs.current[targetKey] ?? presetButtonRefs.current[presets[0]?.id ?? ""];
    if (button) {
      button.focus();
      shouldFocusPresetRef.current = false;
    }
  }, [isOpen, pendingPreset]);

  const setPresetButtonRef = useCallback((key: string, node: HTMLButtonElement | null) => {
    presetButtonRefs.current[key] = node;
  }, []);

  const handlePresetKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const total = presets.length + 1;
    if (total === 0) return;
    let nextIndex = index;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (index + 1) % total;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = (index - 1 + total) % total;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = total - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    if (nextIndex === presets.length) {
      presetButtonRefs.current["year-month"]?.focus();
      return;
    }
    presetButtonRefs.current[presets[nextIndex]?.id ?? ""]?.focus();
  }, []);

  return (
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
      {presets.map((preset, presetIndex) => (
        <button
          key={preset.id}
          onClick={() => onPresetClick(preset.id)}
          ref={(node) => setPresetButtonRef(preset.id, node)}
          onKeyDown={(event) => handlePresetKeyDown(event, presetIndex)}
          style={{
            padding: "var(--space-sm) var(--space-lg)",
            border: "none",
            backgroundColor: pendingPreset === preset.id ? "var(--bg-primary)" : "transparent",
            color: pendingPreset === preset.id ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: pendingPreset === preset.id ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
            fontSize: "var(--font-size-sm)",
            textAlign: "left",
            cursor: "pointer",
            borderRight: pendingPreset === preset.id ? "2px solid var(--btn-selected-bg)" : "2px solid transparent",
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
        onClick={onYearMonthClick}
        ref={(node) => setPresetButtonRef("year-month", node)}
        onKeyDown={(event) => handlePresetKeyDown(event, presets.length)}
        style={{
          padding: "var(--space-sm) var(--space-lg)",
          border: "none",
          backgroundColor: pendingPreset === "year-month" ? "var(--bg-primary)" : "transparent",
          color: pendingPreset === "year-month" ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: pendingPreset === "year-month" ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
          fontSize: "var(--font-size-sm)",
          textAlign: "left",
          cursor: "pointer",
          borderRight: pendingPreset === "year-month" ? "2px solid var(--btn-selected-bg)" : "2px solid transparent",
          transition: "all var(--transition-fast)",
        }}
      >
        {pendingPreset === "year-month" && pendingYear && pendingMonth
          ? `${monthLabels[pendingMonth - 1]} ${pendingYear}`
          : "Year / Month"}
      </button>
    </div>
  );
}
