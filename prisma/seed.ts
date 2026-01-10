import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create locations
  const locations = [
    { id: 'loc-1', name: 'Main Hall' },
    { id: 'loc-2', name: 'Conference Room A' },
    { id: 'loc-3', name: 'Conference Room B' },
    { id: 'loc-4', name: 'Exhibition Space' },
    { id: 'loc-5', name: 'Workshop Area' },
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { id: location.id },
      update: {},
      create: location,
    });
  }

  console.log('Locations seeded');

  // Get existing events
  const events = await prisma.event.findMany();

  if (events.length > 0) {
    console.log(`Found ${events.length} events`);

    // Assign locations to events
    const eventLocationMappings = [
      // Spring Trade Fair 2026 - uses Main Hall and Exhibition Space
      { eventId: events[0]?.id, locationIds: ['loc-1', 'loc-4'] },
      // Autumn Trade Fair 2026 - uses Main Hall and Conference Room A
      { eventId: events[1]?.id, locationIds: ['loc-1', 'loc-2'] },
      // Industry Summit 2027 - uses Conference Room A, B, and Workshop Area
      { eventId: events[2]?.id, locationIds: ['loc-2', 'loc-3', 'loc-5'] },
      // Winter Expo 2026 - uses Exhibition Space
      { eventId: events[3]?.id, locationIds: ['loc-4'] },
    ];

    for (const mapping of eventLocationMappings) {
      if (mapping.eventId && mapping.locationIds) {
        for (const locationId of mapping.locationIds) {
          await prisma.eventLocation.upsert({
            where: {
              eventId_locationId: {
                eventId: mapping.eventId,
                locationId: locationId,
              },
            },
            update: {},
            create: {
              id: `${mapping.eventId}-${locationId}`,
              eventId: mapping.eventId,
              locationId: locationId,
            },
          });
        }
      }
    }

    console.log('Event-location mappings created');
  }

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
