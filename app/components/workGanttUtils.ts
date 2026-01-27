/**
 * Utility functions for Work Gantt visualization
 * Converts discrete daily allocations into continuous timeline spans
 */

export interface Allocation {
  id: string;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

export interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
  phase?: string;
}

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AllocationSpan {
  workCategoryId: string;
  workCategoryName: string;
  eventId: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  phase?: string;
}

export interface WorkGanttEventRow {
  eventId: string;
  eventName: string;
  workCategoryId: string;
  workCategoryName: string;
  spans: AllocationSpan[];
  row: number;
  rangeStartMs: number;
  rangeEndMs: number;
}

/**
 * Calculate the number of days between two date strings
 */
function dateDifferenceInDays(date1: string, date2: string): number {
  const d1 = new Date(date1.split('T')[0]);
  const d2 = new Date(date2.split('T')[0]);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the next date string (YYYY-MM-DD format)
 */
function getNextDate(dateStr: string): string {
  const date = new Date(dateStr.split('T')[0]);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Build continuous allocation spans from discrete daily allocations
 * Groups consecutive days into single spans
 */
export function buildAllocationSpans(
  allocations: Allocation[],
  workCategory: WorkCategory
): AllocationSpan[] {
  // Filter allocations for this work category and sort by date
  const categoryAllocations = allocations
    .filter(a => a.workCategoryId === workCategory.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (categoryAllocations.length === 0) {
    return [];
  }

  const spans: AllocationSpan[] = [];
  let currentSpan: AllocationSpan | null = null;

  for (const allocation of categoryAllocations) {
    const allocationDate = allocation.date.split('T')[0];

    if (!currentSpan) {
      // Start new span
      currentSpan = {
        workCategoryId: workCategory.id,
        workCategoryName: workCategory.name,
        eventId: workCategory.eventId,
        startDate: allocationDate,
        endDate: allocationDate,
        totalHours: allocation.effortHours,
        phase: workCategory.phase,
      };
    } else {
      // Check if this allocation is consecutive to current span
      const expectedNextDate = getNextDate(currentSpan.endDate);

      if (allocationDate === expectedNextDate) {
        // Extend current span
        currentSpan.endDate = allocationDate;
        currentSpan.totalHours += allocation.effortHours;
      } else {
        // Gap detected - close current span and start new one
        spans.push(currentSpan);
        currentSpan = {
          workCategoryId: workCategory.id,
          workCategoryName: workCategory.name,
          eventId: workCategory.eventId,
          startDate: allocationDate,
          endDate: allocationDate,
          totalHours: allocation.effortHours,
          phase: workCategory.phase,
        };
      }
    }
  }

  // Push the last span
  if (currentSpan) {
    spans.push(currentSpan);
  }

  return spans;
}

/**
 * Group work categories by event and build gantt rows
 */
export function groupWorkCategoriesByEvent(
  events: Event[],
  workCategories: WorkCategory[],
  allocations: Allocation[]
): Record<string, WorkGanttEventRow[]> {
  const rowsByEvent: Record<string, WorkGanttEventRow[]> = {};

  for (const event of events) {
    const eventWorkCategories = workCategories.filter(wc => wc.eventId === event.id);
    const rows: WorkGanttEventRow[] = [];

    for (const workCategory of eventWorkCategories) {
      const spans = buildAllocationSpans(allocations, workCategory);

      // Skip work categories with no allocations
      if (spans.length === 0) {
        continue;
      }

      // Calculate range for this work category
      let rangeStart = spans[0].startDate;
      let rangeEnd = spans[0].endDate;

      for (const span of spans) {
        if (span.startDate < rangeStart) {
          rangeStart = span.startDate;
        }
        if (span.endDate > rangeEnd) {
          rangeEnd = span.endDate;
        }
      }

      rows.push({
        eventId: event.id,
        eventName: event.name,
        workCategoryId: workCategory.id,
        workCategoryName: workCategory.name,
        spans,
        row: 0, // Will be assigned during overlap detection
        rangeStartMs: new Date(rangeStart).getTime(),
        rangeEndMs: new Date(rangeEnd).getTime(),
      });
    }

    // Sort rows by range start date
    rows.sort((a, b) => {
      const startDelta = a.rangeStartMs - b.rangeStartMs;
      if (startDelta !== 0) return startDelta;
      return a.workCategoryName.localeCompare(b.workCategoryName);
    });

    // Assign vertical stack positions for overlapping work categories
    const placedRows: { row: number; rangeStartMs: number; rangeEndMs: number }[] = [];

    for (const eventRow of rows) {
      let assignedRow = 0;
      let foundRow = false;

      while (!foundRow) {
        const rowHasConflict = placedRows.some((placed) => {
          if (placed.row !== assignedRow) return false;
          // Check for overlap
          return !(eventRow.rangeEndMs < placed.rangeStartMs || eventRow.rangeStartMs > placed.rangeEndMs);
        });

        if (!rowHasConflict) {
          foundRow = true;
        } else {
          assignedRow++;
        }
      }

      eventRow.row = assignedRow;
      placedRows.push({
        row: assignedRow,
        rangeStartMs: eventRow.rangeStartMs,
        rangeEndMs: eventRow.rangeEndMs,
      });
    }

    rowsByEvent[event.id] = rows;
  }

  return rowsByEvent;
}
