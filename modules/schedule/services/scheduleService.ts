import { randomUUID } from 'crypto';
import { Allocation, AllocationId, DailyDemand } from '../domain/scheduleTypes';
import { aggregateDailyDemand } from '../domain/scheduleLogic';
import {
  saveAllocation,
  loadAllocationsByEvent,
  deleteAllocation,
} from '../persistence/allocationRepository';
import { convertFteToHours } from '../../productivity/services/productivityService';
import { getEvent } from '../../events/services/eventService';

interface AddAllocationCommand {
  eventId: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: 'HOURS' | 'FTE';
}

interface ScheduleEvaluation {
  dailyDemand: DailyDemand[];
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

export async function removeAllocation(allocationId: AllocationId): Promise<void> {
  await deleteAllocation(allocationId);
}

export async function evaluateSchedule(eventId: string): Promise<ScheduleEvaluation> {
  const allocations = await loadAllocationsByEvent(eventId);
  const dailyDemand = aggregateDailyDemand(allocations);

  return {
    dailyDemand,
  };
}
