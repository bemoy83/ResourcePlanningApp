import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { parseDateParts } from "../../utils/date";
import { monthLabels } from "./dateGridUtils";
import { CalendarDay } from "./types";

export function CalendarDayButton({
  dayInfo,
  onClick,
  onFocus,
  onKeyDown,
  tabIndex,
  buttonRef,
}: {
  dayInfo: CalendarDay;
  onClick: (date: string) => void;
  onFocus: (date: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, date: string) => void;
  tabIndex: number;
  buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  const { date, day, isCurrentMonth, isToday, isSelected, isInRange, isRangeStart, isRangeEnd } = dayInfo;
  const { year, month } = parseDateParts(date);
  const labelBase = `${monthLabels[month - 1]} ${day}, ${year}`;
  const statusLabels: string[] = [];
  if (isToday) statusLabels.push("today");
  if (isRangeStart) statusLabels.push("start date");
  if (isRangeEnd) statusLabels.push("end date");
  const ariaLabel = statusLabels.length > 0 ? `${labelBase} (${statusLabels.join(", ")})` : labelBase;

  let backgroundColor = "transparent";
  let color = isCurrentMonth ? "var(--text-primary)" : "var(--text-tertiary)";
  let fontWeight: string = "var(--font-weight-medium)";
  let borderRadius = "50%";

  if (isSelected || isRangeStart || isRangeEnd) {
    backgroundColor = "var(--btn-selected-bg)";
    color = "var(--btn-selected-text)";
    fontWeight = "var(--font-weight-semibold)";
  } else if (isInRange) {
    backgroundColor = "var(--surface-hover)";
    borderRadius = "0";
  }

  if (isRangeStart && isInRange) {
    borderRadius = "50% 0 0 50%";
  } else if (isRangeEnd && isInRange) {
    borderRadius = "0 50% 50% 0";
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onClick(date)}
      onFocus={() => onFocus(date)}
      onKeyDown={(event) => onKeyDown(event, date)}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-current={isToday ? "date" : undefined}
      style={{
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: isToday ? "var(--border-width-thick) solid var(--btn-selected-bg)" : "none",
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
