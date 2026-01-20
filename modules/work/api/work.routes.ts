import type { Request, Response } from 'express';
import {
  createWorkCategory,
  updateEstimatedEffort,
  renameWorkCategory,
} from '../services/workService';
import { loadWorkCategoryById, listWorkCategoriesByEvent } from '../persistence/workRepository';
import { WorkCategoryId } from '../domain/workCategory';

export async function handleCreateWorkCategory(req: Request, res: Response): Promise<void> {
  const { eventId, name, estimatedEffortHours } = req.body as {
    eventId: string;
    name: string;
    estimatedEffortHours: number;
  };

  const workCategoryId = await createWorkCategory({
    eventId,
    name,
    estimatedEffortHours,
  });

  const workCategory = await loadWorkCategoryById(workCategoryId);

  res.status(201).json(workCategory);
}

export async function handleUpdateEstimate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { estimatedEffortHours } = req.body as { estimatedEffortHours: number };

  await updateEstimatedEffort(id as WorkCategoryId, estimatedEffortHours);

  const workCategory = await loadWorkCategoryById(id as WorkCategoryId);

  res.status(200).json(workCategory);
}

export async function handleRenameWorkCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name } = req.body as { name: string };

  await renameWorkCategory(id as WorkCategoryId, name);

  const workCategory = await loadWorkCategoryById(id as WorkCategoryId);

  res.status(200).json(workCategory);
}

export async function handleListWorkCategoriesByEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params;

  const workCategories = await listWorkCategoriesByEvent(eventId);

  res.status(200).json(workCategories);
}
