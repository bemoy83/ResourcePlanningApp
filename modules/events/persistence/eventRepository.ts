import { Event, EventId, EventPhase } from "../domain/event";
import { prisma } from "@/lib/prisma";

const toDateString = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.split("T")[0];
};

function mapPhaseRecord(record: {
  id: string;
  eventId: string;
  name: string;
  startDate: Date;
  endDate: Date;
}): EventPhase {
  return {
    id: record.id,
    eventId: record.eventId,
    name: record.name as EventPhase["name"],
    startDate: toDateString(record.startDate),
    endDate: toDateString(record.endDate),
  };
}

function mapEventRecord(
  record: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: string;
  },
  phases: EventPhase[]
): Event {
  return {
    id: record.id,
    name: record.name,
    startDate: toDateString(record.startDate),
    endDate: toDateString(record.endDate),
    status: record.status as Event["status"],
    // Event.startDate/endDate represents the "Event" phase; stored phases are additional metadata.
    phases,
  };
}

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

  const phaseRecords = await prisma.eventPhase.findMany({
    where: { eventId: record.id },
  });

  return mapEventRecord(record, phaseRecords.map(mapPhaseRecord));
}

export async function listEvents(): Promise<Event[]> {
  const records = await prisma.event.findMany();

  if (records.length === 0) {
    return [];
  }

  const eventIds = records.map((record) => record.id);
  const phaseRecords = await prisma.eventPhase.findMany({
    where: { eventId: { in: eventIds } },
  });

  const phasesByEventId = new Map<string, EventPhase[]>();
  for (const phaseRecord of phaseRecords) {
    const phase = mapPhaseRecord(phaseRecord);
    const phases = phasesByEventId.get(phase.eventId);
    if (phases) {
      phases.push(phase);
    } else {
      phasesByEventId.set(phase.eventId, [phase]);
    }
  }

  return records.map((record) =>
    mapEventRecord(record, phasesByEventId.get(record.id) ?? [])
  );
}
