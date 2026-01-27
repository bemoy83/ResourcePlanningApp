import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function describeDatabase(url: string | undefined): string {
  if (!url) {
    return "DATABASE_URL is not set";
  }

  try {
    const parsed = new URL(url);
    const user = parsed.username || "unknown-user";
    const host = parsed.host || "unknown-host";
    const database = parsed.pathname.replace(/^\//, "") || "unknown-db";
    return `${user}@${host}/${database}`;
  } catch {
    return "DATABASE_URL is invalid";
  }
}

async function main() {
  if (process.env.CONFIRM_PURGE !== "true") {
    console.error("Refusing to purge. Set CONFIRM_PURGE=true to proceed.");
    console.error(`Target database: ${describeDatabase(process.env.DATABASE_URL)}`);
    process.exit(1);
  }

  console.log(`Purging import data from ${describeDatabase(process.env.DATABASE_URL)}...`);

  const eventPhases = await prisma.eventPhase.deleteMany();
  const eventLocations = await prisma.eventLocation.deleteMany();
  const allocations = await prisma.allocation.deleteMany();
  const workCategories = await prisma.workCategory.deleteMany();
  const dailyCapacities = await prisma.dailyCapacity.deleteMany();
  const events = await prisma.event.deleteMany();
  const locations = await prisma.location.deleteMany();

  console.log("Purge complete.");
  console.log(`EventPhase: ${eventPhases.count}`);
  console.log(`EventLocation: ${eventLocations.count}`);
  console.log(`Allocation: ${allocations.count}`);
  console.log(`WorkCategory: ${workCategories.count}`);
  console.log(`DailyCapacity: ${dailyCapacities.count}`);
  console.log(`Event: ${events.count}`);
  console.log(`Location: ${locations.count}`);
}

main()
  .catch((error) => {
    console.error("Purge failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
