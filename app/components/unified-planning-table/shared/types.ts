/**
 * @deprecated Import from 'app/types/shared' instead.
 * This file re-exports types for backwards compatibility.
 * It will be removed in a future version.
 */

export type {
  // Domain types
  Event,
  EventPhase,
  WorkCategory,
  Allocation,
  DailyDemand,
  DailyCapacityComparison,
  WorkCategoryPressure,
  // UI-specific types
  AllocationDraft,
  Location,
  EventLocation,
  Evaluation,
  CrossEventEvaluation,
  TimelineLayout,
  LeftColumn,
} from '../../../types/shared';

// Re-export enums (not types)
export { EventStatus, EventPhaseName } from '../../../types/shared';
