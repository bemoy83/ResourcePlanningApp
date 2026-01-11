/**
 * Test import execution by calling the API directly
 *
 * This script:
 * 1. Parses example CSV
 * 2. Sends parsed rows to import API
 * 3. Displays results
 *
 * Prerequisites:
 * - Dev server running on port 3000 (npm run dev)
 * - Database up and running
 *
 * Run with: npx tsx lib/import/test-import-execution.ts
 */

import { readFileSync } from "fs";
import { parseEventImport } from "./parseEventImport";

const API_URL = "http://localhost:3000/api/data/events/import";

async function testImportExecution() {
  console.log("=== Testing Import Execution ===\n");

  // Step 1: Parse example CSV
  console.log("Step 1: Parsing example CSV...");
  const csvContent = readFileSync("lib/import/example-import.csv", "utf-8");
  const parseResult = parseEventImport(csvContent, "csv");

  console.log(`  Parsed ${parseResult.rows.length} rows`);
  console.log(`  Parse errors: ${parseResult.errors.length}`);

  if (parseResult.errors.length > 0) {
    console.log("\nParse errors found:");
    parseResult.errors.forEach((err) => {
      console.log(`  Row ${err.rowIndex}: ${err.message}`);
    });
    console.log("\nCannot proceed with import due to parse errors.");
    return;
  }

  console.log("\nPreview of parsed rows:");
  parseResult.rows.slice(0, 3).forEach((row, idx) => {
    console.log(
      `  ${idx + 1}. ${row.eventName} | ${row.locationName} | ${row.phase} | ${row.startDate} to ${row.endDate}`
    );
  });
  console.log(`  ... and ${parseResult.rows.length - 3} more rows\n`);

  // Step 2: Send to import API
  console.log("Step 2: Sending to import API...");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: parseResult.rows,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`\n❌ Import failed: ${data.error}`);
      return;
    }

    // Step 3: Display results
    console.log("\n✅ Import successful!\n");
    console.log("Results:");
    console.log(`  Events created: ${data.eventsCreated}`);
    console.log(`  Events reused: ${data.eventsReused}`);
    console.log(`  Locations created: ${data.locationsCreated}`);
    console.log(`  Event-Location links created: ${data.eventLocationsCreated}`);
    console.log(`  Phases created: ${data.phasesCreated}`);

    console.log("\n=== Test Complete ===");
    console.log("Visit http://localhost:3000/calendar to view imported events");
  } catch (error) {
    console.error(
      `\n❌ Error calling API: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    console.log("\nMake sure the dev server is running on port 3000:");
    console.log("  npm run dev");
  }
}

// Run the test
testImportExecution();
