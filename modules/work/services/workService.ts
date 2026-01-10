import { randomUUID } from 'crypto';
import { WorkCategory, WorkCategoryId } from '../domain/workCategory';
import { assertValidEstimatedEffortHours } from '../domain/workLogic';
import { saveWorkCategory, loadWorkCategoryById, listWorkCategoriesByEvent, listAllWorkCategories } from '../persistence/workRepository';

interface CreateWorkCategoryCommand {
  eventId: string;
  name: string;
  estimatedEffortHours: number;
}

export async function createWorkCategory(command: CreateWorkCategoryCommand): Promise<WorkCategoryId> {
  assertValidEstimatedEffortHours(command.estimatedEffortHours);

  const workCategory: WorkCategory = {
    id: randomUUID() as WorkCategoryId,
    eventId: command.eventId,
    name: command.name,
    estimatedEffortHours: command.estimatedEffortHours,
  };

  await saveWorkCategory(workCategory);

  return workCategory.id;
}

export async function updateEstimatedEffort(workCategoryId: WorkCategoryId, newValue: number): Promise<void> {
  assertValidEstimatedEffortHours(newValue);

  const workCategory = await loadWorkCategoryById(workCategoryId);
  if (!workCategory) {
    throw new Error('WorkCategory not found');
  }

  workCategory.estimatedEffortHours = newValue;

  await saveWorkCategory(workCategory);
}

export async function renameWorkCategory(workCategoryId: WorkCategoryId, newName: string): Promise<void> {
  const workCategory = await loadWorkCategoryById(workCategoryId);
  if (!workCategory) {
    throw new Error('WorkCategory not found');
  }

  workCategory.name = newName;

  await saveWorkCategory(workCategory);
}

export async function listWorkCategoriesForEvent(eventId: string) {
  return await listWorkCategoriesByEvent(eventId);
}

export async function listWorkCategories() {
  return await listAllWorkCategories();
}
