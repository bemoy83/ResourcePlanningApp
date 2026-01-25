import { WorkCategory, WorkCategoryId } from '../domain/workCategory';
import { prisma } from "@/lib/prisma";

export async function saveWorkCategory(workCategory: WorkCategory): Promise<void> {
  await prisma.workCategory.upsert({
    where: { id: workCategory.id },
    create: {
      id: workCategory.id,
      eventId: workCategory.eventId,
      name: workCategory.name,
      estimatedEffortHours: workCategory.estimatedEffortHours,
      phase: workCategory.phase ?? null,
    },
    update: {
      eventId: workCategory.eventId,
      name: workCategory.name,
      estimatedEffortHours: workCategory.estimatedEffortHours,
      phase: workCategory.phase ?? null,
    },
  });
}

export async function loadWorkCategoryById(id: WorkCategoryId): Promise<WorkCategory | null> {
  const record = await prisma.workCategory.findUnique({
    where: { id },
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id as WorkCategoryId,
    eventId: record.eventId,
    name: record.name,
    estimatedEffortHours: record.estimatedEffortHours,
    phase: record.phase ?? undefined,
  };
}

export async function listWorkCategoriesByEvent(eventId: string): Promise<WorkCategory[]> {
  const records = await prisma.workCategory.findMany({
    where: { eventId },
  });

  return records.map((record) => ({
    id: record.id as WorkCategoryId,
    eventId: record.eventId,
    name: record.name,
    estimatedEffortHours: record.estimatedEffortHours,
    phase: record.phase ?? undefined,
  }));
}

export async function listAllWorkCategories(): Promise<WorkCategory[]> {
  const records = await prisma.workCategory.findMany();

  return records.map((record) => ({
    id: record.id as WorkCategoryId,
    eventId: record.eventId,
    name: record.name,
    estimatedEffortHours: record.estimatedEffortHours,
    phase: record.phase ?? undefined,
  }));
}
