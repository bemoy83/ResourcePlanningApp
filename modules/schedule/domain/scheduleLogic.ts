import { Allocation, DailyDemand, PeriodDemand } from './scheduleTypes';

export function aggregateDailyDemand(allocations: Allocation[]): DailyDemand[] {
  const demandByDate = new Map<string, number>();

  for (const allocation of allocations) {
    const current = demandByDate.get(allocation.date) || 0;
    demandByDate.set(allocation.date, current + allocation.effortHours);
  }

  const result: DailyDemand[] = [];
  for (const [date, totalEffortHours] of demandByDate) {
    result.push({ date, totalEffortHours });
  }

  return result;
}

export function aggregatePeriodDemand(
  allocations: Allocation[],
  periodStartDate: string,
  periodEndDate: string
): PeriodDemand {
  let totalEffortHours = 0;

  for (const allocation of allocations) {
    if (allocation.date >= periodStartDate && allocation.date <= periodEndDate) {
      totalEffortHours += allocation.effortHours;
    }
  }

  return {
    periodStartDate,
    periodEndDate,
    totalEffortHours,
  };
}

export function calculateOverUnderAllocationIndicator(
  demandHours: number,
  capacityHours: number
): { isOverAllocated: boolean; isUnderAllocated: boolean } {
  return {
    isOverAllocated: demandHours > capacityHours,
    isUnderAllocated: demandHours < capacityHours,
  };
}

export function calculateDeadlinePressureSignal(
  remainingEffortHours: number,
  remainingDays: number
): { isUnderPressure: boolean } {
  return {
    isUnderPressure: remainingDays > 0 && remainingEffortHours / remainingDays > 0,
  };
}
