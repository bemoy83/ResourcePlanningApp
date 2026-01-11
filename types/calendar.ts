/**
 * Unified Event read model for the Event Calendar
 *
 * This represents how planners think about events - a single aggregate
 * with locations and phases included, eliminating the need for frontend joins.
 */
export interface UnifiedEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;

  locations: {
    id: string;
    name: string;
  }[];

  phases: {
    name: string;
    startDate: string;
    endDate: string;
  }[];
}
