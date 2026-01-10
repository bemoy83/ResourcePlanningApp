import { Allocation, DailyDemand, PeriodDemand, DailyCapacityComparison } from './scheduleTypes';

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

export function calculateRemainingEffort(
  estimatedEffortHours: number,
  allocatedHours: number
): number {
  return Math.max(0, estimatedEffortHours - allocatedHours);
}

export function calculateRemainingDays(
  currentDate: string,
  deadlineDate: string
): number {
  const current = new Date(currentDate);
  const deadline = new Date(deadlineDate);
  const diffTime = deadline.getTime() - current.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function compareDailyCapacity(
  dailyDemand: DailyDemand[],
  dailyCapacities: { date: string; capacityHours: number }[]
): DailyCapacityComparison[] {
  const capacityMap = new Map<string, number>();
  for (const capacity of dailyCapacities) {
    capacityMap.set(capacity.date, capacity.capacityHours);
  }

  const result: DailyCapacityComparison[] = [];
  for (const demand of dailyDemand) {
    const capacityHours = capacityMap.get(demand.date) || 0;
    const indicator = calculateOverUnderAllocationIndicator(
      demand.totalEffortHours,
      capacityHours
    );
    result.push({
      date: demand.date,
      demandHours: demand.totalEffortHours,
      capacityHours,
      isOverAllocated: indicator.isOverAllocated,
      isUnderAllocated: indicator.isUnderAllocated,
    });
  }

  return result;
}
