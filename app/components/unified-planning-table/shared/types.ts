import { DateFlags } from '../../../utils/date';

/**
 * Shared timeline configuration used by all row components.
 * Ensures consistent column widths and positioning across the unified table.
 */
export interface TimelineLayout {
  dates: string[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  dateMeta?: DateFlags[];
}

/**
 * Left column configuration for the unified planning table.
 */
export interface LeftColumn {
  key: string;
  width: number;
}

/**
 * Event entity
 */
export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
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
 * Location entity
 */
export interface Location {
  id: string;
  name: string;
}

/**
 * Work category entity
 */
export interface WorkCategory {
  id: string;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
}

/**
 * Allocation entity
 */
export interface Allocation {
  id: string;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

/**
 * Allocation draft (being edited)
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
 * Daily demand evaluation
 */
export interface DailyDemand {
  date: string;
  totalEffortHours: number;
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
 * Event-specific evaluation
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
