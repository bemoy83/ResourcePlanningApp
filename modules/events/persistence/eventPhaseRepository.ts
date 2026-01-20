import { EventPhase, EventPhaseId } from "../domain/event";
import { prisma } from "@/lib/prisma";

const toDateString = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.split("T")[0];
};

// Event phases are metadata only; persistence should remain free of scheduling logic.
export async function saveEventPhase(phase: EventPhase): Promise<void> {
  await prisma.eventPhase.upsert({
    where: { id: phase.id },
    create: {
      id: phase.id,
      eventId: phase.eventId,
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
    },
    update: {
      eventId: phase.eventId,
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
    },
  });
}

export async function loadEventPhaseById(phaseId: EventPhaseId): Promise<EventPhase | null> {
  const record = await prisma.eventPhase.findUnique({
    where: { id: phaseId },
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    eventId: record.eventId,
    name: record.name as EventPhase["name"],
    startDate: toDateString(record.startDate),
    endDate: toDateString(record.endDate),
  };
}

export async function listEventPhasesByEvent(eventId: string): Promise<EventPhase[]> {
  const records = await prisma.eventPhase.findMany({
    where: { eventId },
  });

  return records.map((record) => ({
    id: record.id,
    eventId: record.eventId,
    name: record.name as EventPhase["name"],
    startDate: toDateString(record.startDate),
    endDate: toDateString(record.endDate),
  }));
}

export async function deleteEventPhase(phaseId: EventPhaseId): Promise<void> {
  await prisma.eventPhase.delete({
    where: { id: phaseId },
  });
}
