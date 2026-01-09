import { randomUUID } from "crypto";
import { Event, EventId, EventStatus } from "../domain/event";
import { isValidEventDateRange } from "../domain/eventLogic";
import {
  saveEvent,
  loadEventById,
  listEvents,
} from "../persistence/eventRepository";

interface CreateEventCommand {
  name: string;
  startDate: string;
  endDate: string;
}

interface UpdateEventDateRangeCommand {
  startDate: string;
  endDate: string;
}

export async function createEvent(command: CreateEventCommand): Promise<EventId> {
  if (!isValidEventDateRange(command.startDate, command.endDate)) {
    throw new Error("Invalid event date range");
  }

  const event: Event = {
    id: randomUUID(),
    name: command.name,
    startDate: command.startDate,
    endDate: command.endDate,
    status: EventStatus.ACTIVE,
  };

  await saveEvent(event);

  // TODO: Emit domain event (EventCreated)

  return event.id;
}

export async function updateEventDateRange(
  eventId: EventId,
  newRange: UpdateEventDateRangeCommand
): Promise<void> {
  const event = await loadEventById(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  if (!isValidEventDateRange(newRange.startDate, newRange.endDate)) {
    throw new Error("Invalid event date range");
  }

  const updatedEvent: Event = {
    ...event,
    startDate: newRange.startDate,
    endDate: newRange.endDate,
  };

  await saveEvent(updatedEvent);

  // TODO: Emit domain event (EventDateRangeUpdated)
}

export async function archiveEvent(eventId: EventId): Promise<void> {
  const event = await loadEventById(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  const archivedEvent: Event = {
    ...event,
    status: EventStatus.ARCHIVED,
  };

  await saveEvent(archivedEvent);

  // TODO: Emit domain event (EventArchived)
}

export async function getEvent(eventId: EventId): Promise<Event | null> {
  return await loadEventById(eventId);
}

export async function listAllEvents(): Promise<Event[]> {
  return await listEvents();
}
