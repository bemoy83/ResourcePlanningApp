import { Event, EventId } from "../domain/event";
import { prisma } from "@/lib/prisma";

export async function saveEvent(event: Event): Promise<void> {
  await prisma.event.upsert({
    where: { id: event.id },
    create: {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
    },
    update: {
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
    },
  });
}

export async function loadEventById(eventId: EventId): Promise<Event | null> {
  const record = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    startDate: record.startDate,
    endDate: record.endDate,
    status: record.status as Event["status"],
  };
}

export async function listEvents(): Promise<Event[]> {
  const records = await prisma.event.findMany();

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    startDate: record.startDate,
    endDate: record.endDate,
    status: record.status as Event["status"],
  }));
}
