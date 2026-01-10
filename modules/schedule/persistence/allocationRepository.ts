import { Allocation, AllocationId } from '../domain/scheduleTypes';
import { prisma } from '../../../lib/prisma';

export async function saveAllocation(allocation: Allocation): Promise<void> {
  await prisma.allocation.upsert({
    where: { id: allocation.id },
    create: {
      id: allocation.id,
      eventId: allocation.eventId,
      workCategoryId: allocation.workCategoryId,
      date: allocation.date,
      effortHours: allocation.effortHours,
    },
    update: {
      eventId: allocation.eventId,
      workCategoryId: allocation.workCategoryId,
      date: allocation.date,
      effortHours: allocation.effortHours,
    },
  });
}

export async function loadAllocationsByEvent(eventId: string): Promise<Allocation[]> {
  const rows = await prisma.allocation.findMany({
    where: { eventId },
  });

  return rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    workCategoryId: row.workCategoryId,
    date: row.date,
    effortHours: row.effortHours,
  }));
}

export async function loadAllocationsByWorkCategory(workCategoryId: string): Promise<Allocation[]> {
  const rows = await prisma.allocation.findMany({
    where: { workCategoryId },
  });

  return rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    workCategoryId: row.workCategoryId,
    date: row.date,
    effortHours: row.effortHours,
  }));
}

export async function loadAllAllocations(): Promise<Allocation[]> {
  const rows = await prisma.allocation.findMany();

  return rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    workCategoryId: row.workCategoryId,
    date: row.date,
    effortHours: row.effortHours,
  }));
}

export async function deleteAllocation(allocationId: AllocationId): Promise<void> {
  await prisma.allocation.delete({
    where: { id: allocationId },
  });
}
