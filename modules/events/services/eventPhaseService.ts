import { randomUUID } from "crypto";
import { EventPhase, EventPhaseId, EventPhaseName } from "../domain/event";
import {
  saveEventPhase,
  loadEventPhaseById,
  listEventPhasesByEvent,
  deleteEventPhase,
} from "../persistence/eventPhaseRepository";

interface CreateEventPhaseCommand {
  eventId: string;
  name: EventPhaseName;
  startDate: string;
  endDate: string;
}

interface UpdateEventPhaseCommand {
  name: EventPhaseName;
  startDate: string;
  endDate: string;
}

// Event phases are stored as explanatory metadata only; no scheduling logic is applied here.
export async function createEventPhase(command: CreateEventPhaseCommand): Promise<EventPhaseId> {
  const phase: EventPhase = {
    id: randomUUID(),
    eventId: command.eventId,
    name: command.name,
    startDate: command.startDate,
    endDate: command.endDate,
  };

  await saveEventPhase(phase);

  return phase.id;
}

export async function updateEventPhase(
  phaseId: EventPhaseId,
  update: UpdateEventPhaseCommand
): Promise<void> {
  const existing = await loadEventPhaseById(phaseId);
  if (!existing) {
    throw new Error("Event phase not found");
  }

  await saveEventPhase({
    ...existing,
    name: update.name,
    startDate: update.startDate,
    endDate: update.endDate,
  });
}

export async function removeEventPhase(phaseId: EventPhaseId): Promise<void> {
  const existing = await loadEventPhaseById(phaseId);
  if (!existing) {
    throw new Error("Event phase not found");
  }

  await deleteEventPhase(phaseId);
}

export async function listEventPhases(eventId: string): Promise<EventPhase[]> {
  return await listEventPhasesByEvent(eventId);
}
