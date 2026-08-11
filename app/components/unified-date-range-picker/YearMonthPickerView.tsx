import { useState } from "react";
import { monthLabels } from "./dateGridUtils";

interface YearMonthPickerViewProps {
  availableYears: number[];
  currentYear: number;
  pendingYear: number | null;
  pendingMonth: number | null;
  onMonthSelect: (year: number, month: number) => void;
  onBack: () => void;
}

export function YearMonthPickerView({
  availableYears,
  currentYear,
  pendingYear,
  pendingMonth,
  onMonthSelect,
  onBack,
}: YearMonthPickerViewProps) {
  const [yearPickerYear, setYearPickerYear] = useState<number>(() => {
    const fallbackYear = availableYears.includes(currentYear)
      ? currentYear
      : (availableYears[availableYears.length - 1] ?? currentYear);
    return pendingYear ?? fallbackYear;
  });

  const yearIndex = availableYears.indexOf(yearPickerYear);
  const isPrevDisabled = yearIndex <= 0;
  const isNextDisabled = yearIndex >= availableYears.length - 1;

  return (
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
          disabled={isPrevDisabled}
          aria-label="Previous year"
          style={{
            padding: "var(--space-sm) var(--space-md)",
            border: "var(--border-width-thin) solid var(--btn-border)",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--btn-bg)",
            color: "var(--btn-text)",
            cursor: isPrevDisabled ? "not-allowed" : "pointer",
            opacity: isPrevDisabled ? 0.5 : 1,
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
          disabled={isNextDisabled}
          aria-label="Next year"
          style={{
            padding: "var(--space-sm) var(--space-md)",
            border: "var(--border-width-thin) solid var(--btn-border)",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--btn-bg)",
            color: "var(--btn-text)",
            cursor: isNextDisabled ? "not-allowed" : "pointer",
            opacity: isNextDisabled ? 0.5 : 1,
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
              onClick={() => onMonthSelect(yearPickerYear, monthValue)}
              style={{
                padding: "var(--space-10)",
                border: isSelected
                  ? "var(--border-width-thin) solid var(--btn-selected-border)"
                  : "var(--border-width-thin) solid var(--btn-border)",
                borderRadius: "var(--radius-full)",
                backgroundColor: isSelected ? "var(--btn-selected-bg)" : "var(--btn-bg)",
                color: isSelected ? "var(--btn-selected-text)" : "var(--btn-text)",
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
        onClick={onBack}
        style={{
          marginTop: "var(--space-lg)",
          padding: "var(--space-sm) var(--space-lg)",
          border: "var(--border-width-thin) solid var(--btn-border)",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--btn-bg)",
          color: "var(--text-secondary)",
          fontSize: "var(--font-size-sm)",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Back to Calendar
      </button>
    </div>
  );
}
