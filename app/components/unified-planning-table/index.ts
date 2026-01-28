/**
 * Unified Planning Table - Entry point
 *
 * A refactored planning workspace that combines EventCalendar, CrossEventContext,
 * and PlanningBoardGrid into a single scrollable table.
 *
 * Benefits:
 * - Single scroll container (no synchronization logic needed)
 * - Native sticky header (no duplicate header code)
 * - Native sticky columns (works reliably)
 * - Simpler architecture and better performance
 * - Modular row components for easy maintenance
 */

export { UnifiedPlanningTable } from './UnifiedPlanningTable';
export { PlanningTableHeader } from './PlanningTableHeader';
export { CalendarLocationRow } from './rows/CalendarLocationRow';
export { CrossEventDemandRow } from './rows/CrossEventDemandRow';
export { CrossEventCapacityRow } from './rows/CrossEventCapacityRow';
export { TodayIndicator } from '../shared/TodayIndicator';
export { DateCellsContainer } from './shared/DateCellsContainer';
export { StickyLeftCell } from './shared/StickyLeftCell';
export type * from './shared/types';
