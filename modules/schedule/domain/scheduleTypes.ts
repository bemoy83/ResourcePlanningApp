export type AllocationId = string;

export interface Allocation {
  id: AllocationId;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

export interface DailyDemand {
  date: string;
  totalEffortHours: number;
}

export interface PeriodDemand {
  periodStartDate: string;
  periodEndDate: string;
  totalEffortHours: number;
}
