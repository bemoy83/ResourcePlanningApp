import { prisma } from '../../../lib/prisma';

export interface DailyCapacityRecord {
  id: string;
  eventId: string;
  date: string;
  capacityHours: number;
}

export async function saveDailyCapacity(capacity: DailyCapacityRecord): Promise<void> {
  await prisma.dailyCapacity.upsert({
    where: {
      eventId_date: {
        eventId: capacity.eventId,
        date: capacity.date,
      },
    },
    create: {
      id: capacity.id,
      eventId: capacity.eventId,
      date: capacity.date,
      capacityHours: capacity.capacityHours,
    },
    update: {
      capacityHours: capacity.capacityHours,
    },
  });
}

export async function loadDailyCapacitiesByEvent(eventId: string): Promise<DailyCapacityRecord[]> {
  const rows = await prisma.dailyCapacity.findMany({
    where: { eventId },
  });

  return rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    date: row.date,
    capacityHours: row.capacityHours,
  }));
}
