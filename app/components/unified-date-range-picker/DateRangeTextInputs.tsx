import { useCallback, useEffect, useState } from "react";
import { daysInMonth } from "../../utils/date";

interface DateRangeTextInputsProps {
  pendingStartDate: string | null;
  pendingEndDate: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

function normalizeDateInput(value: string): string | null {
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
}

const inputStyle = {
  padding: "var(--space-sm) var(--space-10)",
  border: "var(--border-width-thin) solid var(--btn-border)",
  borderRadius: "var(--radius-full)",
  backgroundColor: "var(--btn-bg)",
  color: "var(--btn-text)",
  fontSize: "var(--font-size-sm)",
  width: "130px",
  textAlign: "center" as const,
};

export function DateRangeTextInputs({
  pendingStartDate,
  pendingEndDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeTextInputsProps) {
  const [startInput, setStartInput] = useState(pendingStartDate ?? "");
  const [endInput, setEndInput] = useState(pendingEndDate ?? "");

  useEffect(() => {
    setStartInput(pendingStartDate ?? "");
  }, [pendingStartDate]);

  useEffect(() => {
    setEndInput(pendingEndDate ?? "");
  }, [pendingEndDate]);

  const applyStartInput = useCallback(() => {
    const normalized = normalizeDateInput(startInput);
    if (!normalized) {
      setStartInput(pendingStartDate ?? "");
      return;
    }
    onStartDateChange(normalized);
    setStartInput(normalized);
  }, [onStartDateChange, pendingStartDate, startInput]);

  const applyEndInput = useCallback(() => {
    const normalized = normalizeDateInput(endInput);
    if (!normalized) {
      setEndInput(pendingEndDate ?? "");
      return;
    }
    onEndDateChange(normalized);
    setEndInput(normalized);
  }, [endInput, onEndDateChange, pendingEndDate]);

  return (
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
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyStartInput();
          }
        }}
        style={inputStyle}
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
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyEndInput();
          }
        }}
        style={inputStyle}
      />
    </div>
  );
}
