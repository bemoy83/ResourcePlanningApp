import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { CalendarDayButton } from "./CalendarDayButton";
import { dayLabels, monthLabels } from "./dateGridUtils";
import { CalendarDay } from "./types";

interface MonthCalendarGridProps {
  days: CalendarDay[];
  year: number;
  month: number;
  calendarSide: "left" | "right";
  focusDate: string;
  onDayClick: (date: string) => void;
  onDayFocus: (date: string, calendar: "left" | "right") => void;
  onDayKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, date: string, calendar: "left" | "right") => void;
  setDayButtonRef: (calendar: "left" | "right", date: string, node: HTMLButtonElement | null) => void;
}

export function MonthCalendarGrid({
  days,
  year,
  month,
  calendarSide,
  focusDate,
  onDayClick,
  onDayFocus,
  onDayKeyDown,
  setDayButtonRef,
}: MonthCalendarGridProps) {
  return (
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
              padding: "var(--space-xs) 0",
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
        role="grid"
        aria-label={`${monthLabels[month - 1]} ${year}`}
      >
        {days.map((dayInfo, idx) => (
          <CalendarDayButton
            key={idx}
            dayInfo={dayInfo}
            onClick={onDayClick}
            onFocus={(date) => onDayFocus(date, calendarSide)}
            onKeyDown={(event, date) => onDayKeyDown(event, date, calendarSide)}
            tabIndex={dayInfo.date === focusDate ? 0 : -1}
            buttonRef={(node) => setDayButtonRef(calendarSide, dayInfo.date, node)}
          />
        ))}
      </div>
    </div>
  );
}
