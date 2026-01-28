/**
 * Shared utilities for phase span rendering across calendar components.
 * Handles intra-day transitions (split cells), single-day collapses, and phase styling.
 */

import { EventPhase } from "../types/shared";

/**
 * Represents a phase transition where two phases share the same calendar date.
 * The earlier phase ends and the later phase starts on the same day.
 */
export interface IntraDayTransition {
  date: string; // The shared date (YYYY-MM-DD)
  earlierSpanIndex: number; // Index of the phase that ends on this date
  laterSpanIndex: number; // Index of the phase that starts on this date
}

/**
 * Tracks single-day phases that all occur on the same date.
 * When 3+ phases share a single day, we collapse to show only the highest priority one.
 */
export interface SingleDayCollapse {
  date: string;
  spanIndices: number[]; // All single-day spans on this date
  visibleSpanIndex: number; // The one to show (EVENT takes precedence)
}

/**
 * Phase span with computed positioning data for rendering.
 */
export interface PhaseSpanRenderData {
  phase: EventPhase;
  index: number;
  normalizedStart: string;
  normalizedEnd: string;
  leftAdjustment: number;
  widthAdjustment: number;
  isInTransition: boolean;
  isCollapsedHidden: boolean; // True if this span should be hidden due to collapse
}

/**
 * Result of computing phase span positions including overlap handling.
 */
export interface PhaseSpanComputeResult {
  spans: PhaseSpanRenderData[];
  intraDayTransitions: IntraDayTransition[];
  singleDayCollapses: SingleDayCollapse[];
}

// Canonical phase order: ASSEMBLY -> MOVE_IN -> EVENT -> MOVE_OUT -> DISMANTLE
const PHASE_ORDER: Record<string, number> = {
  'ASSEMBLY': 0,
  'MOVE_IN': 1,
  'EVENT': 2,
  'MOVE_OUT': 3,
  'DISMANTLE': 4,
};

// Phase abbreviations for compact display when sharing a date
const PHASE_ABBREVIATIONS: Record<string, string> = {
  'ASSEMBLY': 'A',
  'MOVE_IN': 'MI',
  'EVENT': 'E',
  'MOVE_OUT': 'MO',
  'DISMANTLE': 'D',
};

/**
 * Get the canonical order index for a phase name.
 * Returns a high number for unknown phases so they sort to the end.
 */
export function getPhaseOrderIndex(phaseName: string | undefined): number {
  if (!phaseName) return 999;
  const normalized = phaseName.trim().toUpperCase();
  return PHASE_ORDER[normalized] ?? 999;
}

/**
 * Check if a phase name is the "EVENT" phase.
 */
export function isEventPhaseName(name: string): boolean {
  return name.trim().toUpperCase() === 'EVENT';
}

/**
 * Get abbreviated label for compact display when sharing a date.
 * Phase names get standard abbreviations, event names get truncated.
 */
export function getAbbreviatedLabel(label: string, phaseName: string | undefined, isEventPhase: boolean): string {
  if (!isEventPhase && phaseName) {
    // It's a phase label - use standard abbreviation
    const normalized = phaseName.trim().toUpperCase();
    return PHASE_ABBREVIATIONS[normalized] ?? label.slice(0, 3);
  }
  // It's an event name - truncate to first 4 chars
  return label.length > 4 ? label.slice(0, 4) : label;
}

/**
 * Format phase name for display by replacing underscores with spaces.
 * e.g., "MOVE_IN" -> "MOVE IN"
 */
export function formatPhaseNameForDisplay(phaseName: string): string {
  return phaseName.replace(/_/g, ' ');
}

/**
 * Map phase name to CSS token for background color.
 */
export function getPhaseBackgroundColor(phaseName: string | undefined): string {
  if (!phaseName) {
    return 'var(--calendar-span-bg)';
  }
  const normalizedPhase = phaseName.trim().toUpperCase();
  const phaseTokenMap: Record<string, string> = {
    'ASSEMBLY': 'var(--phase-assembly)',
    'MOVE_IN': 'var(--phase-move-in)',
    'EVENT': 'var(--phase-event)',
    'MOVE_OUT': 'var(--phase-move-out)',
    'DISMANTLE': 'var(--phase-dismantle)',
  };
  return phaseTokenMap[normalizedPhase] || 'var(--calendar-span-bg)';
}

/**
 * Compute phase span render data with intra-day transition and collapse handling.
 *
 * @param phases - Array of event phases to process
 * @param dayColumnWidth - Width of each day column in pixels (for calculating adjustments)
 * @returns Computed span data with positioning adjustments
 */
export function computePhaseSpans(
  phases: EventPhase[],
  dayColumnWidth: number
): PhaseSpanComputeResult {
  if (!phases || phases.length === 0) {
    return { spans: [], intraDayTransitions: [], singleDayCollapses: [] };
  }

  // Sort phases by start date
  const sortedPhases = [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Normalize dates and create initial span data
  const spans: PhaseSpanRenderData[] = sortedPhases.map((phase, index) => ({
    phase,
    index,
    normalizedStart: phase.startDate.split('T')[0],
    normalizedEnd: phase.endDate.split('T')[0],
    leftAdjustment: 0,
    widthAdjustment: 0,
    isInTransition: false,
    isCollapsedHidden: false,
  }));

  // Detect intra-day transitions: where one phase ends and another starts on the same calendar date
  // Rule: earlier phase gets left half, later phase gets right half
  // Priority: 1) Time comparison, 2) Canonical phase order
  const intraDayTransitions: IntraDayTransition[] = [];
  for (let i = 0; i < spans.length - 1; i++) {
    const currentSpan = spans[i];
    const nextSpan = spans[i + 1];

    // Check if current phase ends on the same calendar date that the next phase starts
    if (currentSpan.normalizedEnd === nextSpan.normalizedStart) {
      const currentEndTime = new Date(currentSpan.phase.endDate).getTime();
      const nextStartTime = new Date(nextSpan.phase.startDate).getTime();

      // Determine which phase is "earlier" for positioning
      let earlierIndex = i;
      let laterIndex = i + 1;

      if (currentEndTime === nextStartTime) {
        // Times are identical - use canonical phase order
        const currentPhaseOrder = getPhaseOrderIndex(currentSpan.phase.name);
        const nextPhaseOrder = getPhaseOrderIndex(nextSpan.phase.name);

        if (currentPhaseOrder > nextPhaseOrder) {
          // Current span's phase comes after next span's phase - swap
          earlierIndex = i + 1;
          laterIndex = i;
        }
      } else if (currentEndTime > nextStartTime) {
        // Current span ends after next span starts - swap
        earlierIndex = i + 1;
        laterIndex = i;
      }

      intraDayTransitions.push({
        date: currentSpan.normalizedEnd,
        earlierSpanIndex: earlierIndex,
        laterSpanIndex: laterIndex,
      });
    }
  }

  // Detect single-day collapses: when 3+ single-day phases share the same date
  // In this case, show only the EVENT phase (or highest priority if no EVENT)
  const singleDayCollapses: SingleDayCollapse[] = [];
  const singleDaySpansByDate = new Map<string, number[]>();

  // Group single-day spans by their date
  spans.forEach((span, index) => {
    if (span.normalizedStart === span.normalizedEnd) {
      // This is a single-day span
      const existing = singleDaySpansByDate.get(span.normalizedStart) || [];
      existing.push(index);
      singleDaySpansByDate.set(span.normalizedStart, existing);
    }
  });

  // For dates with 3+ single-day spans, create a collapse entry
  for (const [date, spanIndices] of singleDaySpansByDate) {
    if (spanIndices.length >= 3) {
      // Find the EVENT phase, or the one with highest display priority
      let visibleSpanIndex = spanIndices[0];
      let hasEventPhase = false;

      for (const idx of spanIndices) {
        const span = spans[idx];
        if (isEventPhaseName(span.phase.name)) {
          visibleSpanIndex = idx;
          hasEventPhase = true;
          break;
        }
      }

      // If no EVENT phase, show the middle one in canonical order
      if (!hasEventPhase) {
        const sorted = [...spanIndices].sort((a, b) => {
          const orderA = getPhaseOrderIndex(spans[a].phase.name);
          const orderB = getPhaseOrderIndex(spans[b].phase.name);
          return orderA - orderB;
        });
        visibleSpanIndex = sorted[Math.floor(sorted.length / 2)];
      }

      singleDayCollapses.push({
        date,
        spanIndices,
        visibleSpanIndex,
      });

      // Mark hidden spans
      for (const idx of spanIndices) {
        if (idx !== visibleSpanIndex) {
          spans[idx].isCollapsedHidden = true;
        }
      }
    }
  }

  // Apply intra-day transition adjustments
  for (const transition of intraDayTransitions) {
    const earlierSpan = spans[transition.earlierSpanIndex];
    const laterSpan = spans[transition.laterSpanIndex];

    // Skip if either span is hidden due to collapse
    if (!earlierSpan.isCollapsedHidden) {
      // Earlier span loses right half of its end date
      earlierSpan.widthAdjustment -= dayColumnWidth / 2;
      earlierSpan.isInTransition = true;
    }

    if (!laterSpan.isCollapsedHidden) {
      // Later span loses left half of its start date
      laterSpan.leftAdjustment += dayColumnWidth / 2;
      laterSpan.widthAdjustment -= dayColumnWidth / 2;
      laterSpan.isInTransition = true;
    }
  }

  return { spans, intraDayTransitions, singleDayCollapses };
}

/**
 * Get the display label for a phase span, abbreviated if in a transition.
 */
export function getPhaseDisplayLabel(
  phaseName: string,
  isInTransition: boolean,
  isSingleDaySpan: boolean
): string {
  if (isInTransition && isSingleDaySpan) {
    const isEvent = isEventPhaseName(phaseName);
    return getAbbreviatedLabel(formatPhaseNameForDisplay(phaseName), phaseName, isEvent);
  }
  return formatPhaseNameForDisplay(phaseName);
}
