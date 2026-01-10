import { randomUUID } from 'crypto';
import { Allocation, AllocationId, DailyDemand, DailyCapacityComparison, WorkCategoryPressure } from '../domain/scheduleTypes';
import {
  aggregateDailyDemand,
  compareDailyCapacity,
  calculateRemainingEffort,
  calculateRemainingDays,
  calculateDeadlinePressureSignal,
} from '../domain/scheduleLogic';
import {
  saveAllocation,
  loadAllocationsByEvent,
  loadAllocationsByWorkCategory,
  deleteAllocation,
} from '../persistence/allocationRepository';
import {
  saveDailyCapacity,
  loadDailyCapacitiesByEvent,
  DailyCapacityRecord,
} from '../persistence/capacityRepository';
import { convertFteToHours } from '../../productivity/services/productivityService';
import { getEvent } from '../../events/services/eventService';
import { listWorkCategoriesForEvent } from '../../work/services/workService';

interface AddAllocationCommand {
  eventId: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: 'HOURS' | 'FTE';
}

interface UpdateAllocationCommand {
  allocationId: AllocationId;
  eventId: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: 'HOURS' | 'FTE';
}

interface SetDailyCapacityCommand {
  eventId: string;
  date: string;
  capacityHours: number;
}

interface ScheduleEvaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

export async function addAllocation(command: AddAllocationCommand): Promise<Allocation> {
  const event = await getEvent(command.eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (command.date < event.startDate || command.date > event.endDate) {
    throw new Error('Allocation date is outside event date range');
  }

  let effortHours: number;
  if (command.effortUnit === 'FTE') {
    effortHours = convertFteToHours(command.effortValue);
  } else {
    effortHours = command.effortValue;
  }

  const allocation: Allocation = {
    id: randomUUID(),
    eventId: command.eventId,
    workCategoryId: command.workCategoryId,
    date: command.date,
    effortHours: effortHours,
  };

  await saveAllocation(allocation);

  return allocation;
}

export async function updateAllocation(command: UpdateAllocationCommand): Promise<Allocation> {
  const event = await getEvent(command.eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (command.date < event.startDate || command.date > event.endDate) {
    throw new Error('Allocation date is outside event date range');
  }

  let effortHours: number;
  if (command.effortUnit === 'FTE') {
    effortHours = convertFteToHours(command.effortValue);
  } else {
    effortHours = command.effortValue;
  }

  const allocation: Allocation = {
    id: command.allocationId,
    eventId: command.eventId,
    workCategoryId: command.workCategoryId,
    date: command.date,
    effortHours: effortHours,
  };

  await saveAllocation(allocation);

  return allocation;
}

export async function removeAllocation(allocationId: AllocationId): Promise<void> {
  await deleteAllocation(allocationId);
}

export async function setDailyCapacity(command: SetDailyCapacityCommand): Promise<void> {
  const event = await getEvent(command.eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (command.date < event.startDate || command.date > event.endDate) {
    throw new Error('Capacity date is outside event date range');
  }

  await saveDailyCapacity({
    id: randomUUID(),
    eventId: command.eventId,
    date: command.date,
    capacityHours: command.capacityHours,
  });
}

export async function evaluateSchedule(eventId: string): Promise<ScheduleEvaluation> {
  const event = await getEvent(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const allocations = await loadAllocationsByEvent(eventId);
  const dailyDemand = aggregateDailyDemand(allocations);

  // Load capacity data
  const capacities = await loadDailyCapacitiesByEvent(eventId);
  const dailyCapacityComparison = compareDailyCapacity(
    dailyDemand,
    capacities.map((c) => ({ date: c.date, capacityHours: c.capacityHours }))
  );

  // Calculate deadline pressure per work category
  const workCategories = await listWorkCategoriesForEvent(eventId);
  const workCategoryPressure: WorkCategoryPressure[] = [];

  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  for (const workCategory of workCategories) {
    const categoryAllocations = await loadAllocationsByWorkCategory(workCategory.id);
    const allocatedHours = categoryAllocations.reduce(
      (sum, alloc) => sum + alloc.effortHours,
      0
    );

    const remainingEffortHours = calculateRemainingEffort(
      workCategory.estimatedEffortHours,
      allocatedHours
    );

    const remainingDays = calculateRemainingDays(currentDate, event.endDate);

    const pressure = calculateDeadlinePressureSignal(remainingEffortHours, remainingDays);

    workCategoryPressure.push({
      workCategoryId: workCategory.id,
      remainingEffortHours,
      remainingDays,
      isUnderPressure: pressure.isUnderPressure,
    });
  }

  return {
    dailyDemand,
    dailyCapacityComparison,
    workCategoryPressure,
  };
}
