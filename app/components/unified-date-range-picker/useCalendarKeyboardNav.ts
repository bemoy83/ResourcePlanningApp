import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { addDays, formatDateParts, getDayOfWeek, parseDateParts } from "../../utils/date";
import { addMonthsToDate } from "./dateGridUtils";
import { CalendarDay } from "./types";

interface UseCalendarKeyboardNavOptions {
  isOpen: boolean;
  showYearMonthPicker: boolean;
  leftDays: CalendarDay[];
  rightDays: CalendarDay[];
  leftCalendarYear: number;
  leftCalendarMonth: number;
  rightCalendarYear: number;
  rightCalendarMonth: number;
  setLeftCalendar: (value: { year: number; month: number }) => void;
  onDaySelect: (date: string) => void;
}

export function useCalendarKeyboardNav({
  isOpen,
  showYearMonthPicker,
  leftDays,
  rightDays,
  leftCalendarYear,
  leftCalendarMonth,
  rightCalendarYear,
  rightCalendarMonth,
  setLeftCalendar,
  onDaySelect,
}: UseCalendarKeyboardNavOptions) {
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const [activeCalendar, setActiveCalendar] = useState<"left" | "right">("left");
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const shouldFocusDateRef = useRef(false);

  const leftFocusDate = useMemo(() => {
    if (activeCalendar === "left" && focusedDate && leftDays.some((day) => day.date === focusedDate)) {
      return focusedDate;
    }
    return formatDateParts(leftCalendarYear, leftCalendarMonth, 1);
  }, [activeCalendar, focusedDate, leftCalendarYear, leftCalendarMonth, leftDays]);

  const rightFocusDate = useMemo(() => {
    if (activeCalendar === "right" && focusedDate && rightDays.some((day) => day.date === focusedDate)) {
      return focusedDate;
    }
    return formatDateParts(rightCalendarYear, rightCalendarMonth, 1);
  }, [activeCalendar, focusedDate, rightCalendarYear, rightCalendarMonth, rightDays]);

  const ensureDateInView = useCallback(
    (date: string, calendar: "left" | "right") => {
      const days = calendar === "left" ? leftDays : rightDays;
      const isVisible = days.some((day) => day.date === date);
      if (isVisible) return;
      const { year, month } = parseDateParts(date);
      if (calendar === "left") {
        setLeftCalendar({ year, month });
        return;
      }
      let adjustedYear = year;
      let adjustedMonth = month - 1;
      if (adjustedMonth < 1) {
        adjustedMonth = 12;
        adjustedYear -= 1;
      }
      setLeftCalendar({ year: adjustedYear, month: adjustedMonth });
    },
    [leftDays, rightDays, setLeftCalendar]
  );

  useEffect(() => {
    if (!isOpen || showYearMonthPicker || !focusedDate) return;
    const days = activeCalendar === "left" ? leftDays : rightDays;
    const isVisible = days.some((day) => day.date === focusedDate);
    if (isVisible) return;
    const fallbackDate = activeCalendar === "left"
      ? formatDateParts(leftCalendarYear, leftCalendarMonth, 1)
      : formatDateParts(rightCalendarYear, rightCalendarMonth, 1);
    setFocusedDate(fallbackDate);
  }, [
    activeCalendar,
    focusedDate,
    isOpen,
    leftCalendarMonth,
    leftCalendarYear,
    leftDays,
    rightCalendarMonth,
    rightCalendarYear,
    rightDays,
    showYearMonthPicker,
  ]);

  useEffect(() => {
    if (!isOpen || showYearMonthPicker || !focusedDate || !shouldFocusDateRef.current) return;
    const key = `${activeCalendar}:${focusedDate}`;
    const button = dayButtonRefs.current[key];
    if (button) {
      button.focus();
      shouldFocusDateRef.current = false;
    }
  }, [activeCalendar, focusedDate, isOpen, showYearMonthPicker]);

  const handleDayFocus = useCallback((date: string, calendar: "left" | "right") => {
    setFocusedDate((prev) => (prev === date ? prev : date));
    setActiveCalendar((prev) => (prev === calendar ? prev : calendar));
  }, []);

  const setDayButtonRef = useCallback((calendar: "left" | "right", date: string, node: HTMLButtonElement | null) => {
    dayButtonRefs.current[`${calendar}:${date}`] = node;
  }, []);

  const handleDayKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, date: string, calendar: "left" | "right") => {
      let nextDate: string | null = null;

      switch (event.key) {
        case "ArrowLeft":
          nextDate = addDays(date, -1);
          break;
        case "ArrowRight":
          nextDate = addDays(date, 1);
          break;
        case "ArrowUp":
          nextDate = addDays(date, -7);
          break;
        case "ArrowDown":
          nextDate = addDays(date, 7);
          break;
        case "Home": {
          const dayOfWeek = getDayOfWeek(date);
          nextDate = addDays(date, -dayOfWeek);
          break;
        }
        case "End": {
          const dayOfWeek = getDayOfWeek(date);
          nextDate = addDays(date, 6 - dayOfWeek);
          break;
        }
        case "PageUp":
          nextDate = addMonthsToDate(date, event.shiftKey ? -12 : -1);
          break;
        case "PageDown":
          nextDate = addMonthsToDate(date, event.shiftKey ? 12 : 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onDaySelect(date);
          setFocusedDate(date);
          setActiveCalendar(calendar);
          return;
        default:
          return;
      }

      if (!nextDate) return;
      event.preventDefault();
      setFocusedDate(nextDate);
      setActiveCalendar(calendar);
      ensureDateInView(nextDate, calendar);
      shouldFocusDateRef.current = true;
    },
    [ensureDateInView, onDaySelect]
  );

  return {
    focusedDate,
    setFocusedDate,
    activeCalendar,
    setActiveCalendar,
    leftFocusDate,
    rightFocusDate,
    handleDayFocus,
    handleDayKeyDown,
    setDayButtonRef,
    ensureDateInView,
    shouldFocusDateRef,
  };
}
