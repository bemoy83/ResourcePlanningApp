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

export interface DailyCapacity {
  date: string;
  capacityHours: number;
}

export interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

export interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}
