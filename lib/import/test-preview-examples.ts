/**
 * Test the preview examples to demonstrate functionality
 * Run with: npx tsx lib/import/test-preview-examples.ts
 */

import { readFileSync } from "fs";
import { parseEventImport } from "./parseEventImport";

console.log("=== Testing Preview Examples ===\n");

// Test CSV example
console.log("--- CSV Example ---");
const csvContent = readFileSync("lib/import/example-import.csv", "utf-8");
const csvResult = parseEventImport(csvContent, "csv");

console.log(`Parsed rows: ${csvResult.rows.length}`);
console.log(`Errors: ${csvResult.errors.length}`);

if (csvResult.rows.length > 0) {
  console.log("\nFirst 3 rows:");
  csvResult.rows.slice(0, 3).forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.eventName} | ${row.locationName} | ${row.phase} | ${row.startDate} to ${row.endDate}`);
  });

  // Calculate interpretation summary
  const events = new Set(csvResult.rows.map(r => r.eventName));
  const locations = new Set(csvResult.rows.map(r => r.locationName));

  console.log(`\nInterpretation Summary:`);
  console.log(`  Events detected: ${events.size} (${Array.from(events).join(", ")})`);
  console.log(`  Locations detected: ${locations.size} (${Array.from(locations).join(", ")})`);

  // Phases per event
  const eventPhases = new Map<string, Set<string>>();
  csvResult.rows.forEach(row => {
    if (!eventPhases.has(row.eventName)) {
      eventPhases.set(row.eventName, new Set());
    }
    eventPhases.get(row.eventName)!.add(row.phase);
  });

  console.log(`\n  Phases per event:`);
  eventPhases.forEach((phases, eventName) => {
    console.log(`    ${eventName}:`);
    phases.forEach(phase => console.log(`      - ${phase}`));
  });
}

console.log("\n");

// Test JSON example
console.log("--- JSON Example ---");
const jsonContent = readFileSync("lib/import/example-import.json", "utf-8");
const jsonResult = parseEventImport(jsonContent, "json");

console.log(`Parsed rows: ${jsonResult.rows.length}`);
console.log(`Errors: ${jsonResult.errors.length}`);

if (jsonResult.rows.length > 0) {
  console.log("\nFirst 3 rows:");
  jsonResult.rows.slice(0, 3).forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.eventName} | ${row.locationName} | ${row.phase} | ${row.startDate} to ${row.endDate}`);
  });

  // Calculate interpretation summary
  const events = new Set(jsonResult.rows.map(r => r.eventName));
  const locations = new Set(jsonResult.rows.map(r => r.locationName));

  console.log(`\nInterpretation Summary:`);
  console.log(`  Events detected: ${events.size} (${Array.from(events).join(", ")})`);
  console.log(`  Locations detected: ${locations.size} (${Array.from(locations).join(", ")})`);
}

console.log("\n=== Tests Complete ===");
