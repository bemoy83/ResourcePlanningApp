import type { Request, Response } from "express";
import {
  createEvent,
  updateEventDateRange,
  archiveEvent,
} from "../services/eventService";
import { loadEventById, listEvents } from "../persistence/eventRepository";

export async function handleCreateEvent(req: Request, res: Response): Promise<void> {
  const { name, startDate, endDate } = req.body;

  const eventId = await createEvent({
    name,
    startDate,
    endDate,
  });

  const event = await loadEventById(eventId);

  res.status(201).json(event);
}

export async function handleGetEventById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const event = await loadEventById(id);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.status(200).json(event);
}

export async function handleListEvents(req: Request, res: Response): Promise<void> {
  const events = await listEvents();

  res.status(200).json(events);
}
