/**
 * Central type hub for UI components.
 *
 * This file provides UI-friendly interfaces with plain string IDs.
 * Domain modules use branded types (WorkCategoryId, EventId, etc.) for type safety,
 * but UI components receive data as plain strings from the API/database layer.
 *
 * For domain logic, import directly from modules:
 * - import { WorkCategory } from 'modules/work/domain/workCategory';
 *
 * For UI components, import from here:
 * - import { WorkCategory } from 'app/types/shared';
 */

// Re-export domain enums (these work with both branded and plain strings)
export {
  EventStatus,
  EventPhaseName,
} from '../../modules/events/domain/event';

// Re-export branded ID types for domain logic (optional use)
export type { EventId, EventPhaseId } from '../../modules/events/domain/event';
export type { WorkCategoryId } from '../../modules/work/domain/workCategory';
export type { AllocationId } from '../../modules/schedule/domain/scheduleTypes';

// Import domain types for reference
import type { EventStatus } from '../../modules/events/domain/event';

// ============================================================================
// UI-SPECIFIC INTERFACES (with plain string IDs)
// ============================================================================

/**
 * Event entity for UI components
 */
export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: EventStatus | string;
  phases?: EventPhase[];
}

/**
 * Event phase
 */
export interface EventPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

/**
 * Work category entity for UI components
 */
export interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
  phase?: string;
}

/**
 * Allocation entity for UI components
 */
export interface Allocation {
  id: string;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

/**
 * Daily demand evaluation
 */
export interface DailyDemand {
  date: string;
  totalEffortHours: number;
}

/**
 * Period demand evaluation
 */
export interface PeriodDemand {
  startDate: string;
  endDate: string;
  totalEffortHours: number;
}

/**
 * Daily capacity
 */
export interface DailyCapacity {
  date: string;
  capacityHours: number;
}

/**
 * Daily capacity comparison
 */
export interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

/**
 * Work category pressure evaluation
 */
export interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

/**
 * Allocation draft (being edited in UI)
 */
export interface AllocationDraft {
  allocationId: string | null;
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: 'HOURS' | 'FTE';
}

/**
 * Location entity
 */
export interface Location {
  id: string;
  name: string;
}

/**
 * Event-location association
 */
export interface EventLocation {
  id: string;
  eventId: string;
  locationId: string;
}

/**
 * Event-specific evaluation results
 */
export interface Evaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

/**
 * Cross-event evaluation (all events aggregated)
 */
export interface CrossEventEvaluation {
  crossEventDailyDemand: DailyDemand[];
  crossEventCapacityComparison: DailyCapacityComparison[];
}

/**
 * Timeline layout configuration used by planning table components
 */
export interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  dateMeta?: import('../utils/date').DateFlags[];
}

/**
 * Left column configuration for the unified planning table
 */
export interface LeftColumn {
  key: string;
  width: number;
}

/**
 * Alias for Event used in planning filter contexts.
 * Some components use PlanningEvent to emphasize the UI context.
 */
export type PlanningEvent = Event;
