/**
 * Example usage and tests for parseEventImport
 * Run with: npx tsx lib/import/parseEventImport.test.ts
 */

import { parseEventImport } from "./parseEventImport";

console.log("=== Event Import Parser Tests ===\n");

// Example 1: Valid CSV input
console.log("--- Example 1: Valid CSV ---");
const validCSV = `eventName,locationName,phase,startDate,endDate
Summer Festival,Main Stage,ASSEMBLY,2024-06-01,2024-06-05
Summer Festival,Main Stage,EVENT,2024-06-06,2024-06-10
Summer Festival,Main Stage,DISMANTLE,2024-06-11,2024-06-15
Winter Gala,Grand Hall,MOVE_IN,2024-12-01,2024-12-03
Winter Gala,Grand Hall,EVENT,2024-12-04,2024-12-06
Winter Gala,Grand Hall,MOVE_OUT,2024-12-07,2024-12-09`;

const result1 = parseEventImport(validCSV, "csv");
console.log("Parsed rows:", result1.rows.length);
console.log("Errors:", result1.errors.length);
console.log("Sample row:", result1.rows[0]);
console.log();

// Example 2: CSV with errors
console.log("--- Example 2: CSV with Errors ---");
const csvWithErrors = `eventName,locationName,phase,startDate,endDate
Good Event,Main Stage,EVENT,2024-06-01,2024-06-05
Bad Event,Main Stage,BUILD,2024-06-01,2024-06-05
Another Event,Main Stage,EVENT,invalid-date,2024-06-10
,Main Stage,EVENT,2024-07-01,2024-07-05`;

const result2 = parseEventImport(csvWithErrors, "csv");
console.log("Parsed rows:", result2.rows.length);
console.log("Errors:", result2.errors.length);
console.log("Error details:");
result2.errors.forEach((err) => {
  console.log(`  Row ${err.rowIndex}: ${err.message}`);
});
console.log();

// Example 3: CSV with extra columns (should be ignored)
console.log("--- Example 3: CSV with Extra Columns ---");
const csvWithExtra = `eventName,locationName,phase,startDate,endDate,extraColumn,anotherExtra
Conference,Hall A,ASSEMBLY,2024-08-01,2024-08-03,ignored,alsoIgnored
Conference,Hall A,EVENT,2024-08-04,2024-08-08,foo,bar`;

const result3 = parseEventImport(csvWithExtra, "csv");
console.log("Parsed rows:", result3.rows.length);
console.log("Errors:", result3.errors.length);
console.log("Sample row (extra columns ignored):", result3.rows[0]);
console.log();

// Example 4: CSV with blank rows (should be skipped)
console.log("--- Example 4: CSV with Blank Rows ---");
const csvWithBlanks = `eventName,locationName,phase,startDate,endDate
Event 1,Location 1,EVENT,2024-09-01,2024-09-05

Event 2,Location 2,ASSEMBLY,2024-09-10,2024-09-15

`;

const result4 = parseEventImport(csvWithBlanks, "csv");
console.log("Parsed rows (blank rows skipped):", result4.rows.length);
console.log("Errors:", result4.errors.length);
console.log();

// Example 5: Valid JSON input
console.log("--- Example 5: Valid JSON ---");
const validJSON = JSON.stringify([
  {
    eventName: "Tech Summit",
    locationName: "Convention Center",
    phase: "ASSEMBLY",
    startDate: "2024-10-01",
    endDate: "2024-10-03",
  },
  {
    eventName: "Tech Summit",
    locationName: "Convention Center",
    phase: "EVENT",
    startDate: "2024-10-04",
    endDate: "2024-10-06",
  },
]);

const result5 = parseEventImport(validJSON, "json");
console.log("Parsed rows:", result5.rows.length);
console.log("Errors:", result5.errors.length);
console.log("Sample row:", result5.rows[0]);
console.log();

// Example 6: Invalid JSON (not an array)
console.log("--- Example 6: Invalid JSON (Not an Array) ---");
const invalidJSON = JSON.stringify({
  eventName: "Bad Event",
  locationName: "Some Location",
  phase: "EVENT",
  startDate: "2024-11-01",
  endDate: "2024-11-05",
});

const result6 = parseEventImport(invalidJSON, "json");
console.log("Parsed rows:", result6.rows.length);
console.log("Errors:", result6.errors.length);
console.log("Error details:");
result6.errors.forEach((err) => {
  console.log(`  Row ${err.rowIndex}: ${err.message}`);
});
console.log();

// Example 7: JSON with invalid phase
console.log("--- Example 7: JSON with Invalid Phase ---");
const jsonWithInvalidPhase = JSON.stringify([
  {
    eventName: "Music Festival",
    locationName: "Park",
    phase: "SETUP", // Invalid phase
    startDate: "2024-12-01",
    endDate: "2024-12-05",
  },
]);

const result7 = parseEventImport(jsonWithInvalidPhase, "json");
console.log("Parsed rows:", result7.rows.length);
console.log("Errors:", result7.errors.length);
console.log("Error details:");
result7.errors.forEach((err) => {
  console.log(`  Row ${err.rowIndex}: ${err.message}`);
});
console.log();

// Example 8: Determinism test (same input = same output)
console.log("--- Example 8: Determinism Test ---");
const testInput = `eventName,locationName,phase,startDate,endDate
Event A,Location A,EVENT,2024-01-01,2024-01-05
Event B,Location B,ASSEMBLY,2024-02-01,2024-02-05`;

const resultA = parseEventImport(testInput, "csv");
const resultB = parseEventImport(testInput, "csv");

console.log("First parse - rows:", resultA.rows.length);
console.log("Second parse - rows:", resultB.rows.length);
console.log(
  "Results identical:",
  JSON.stringify(resultA) === JSON.stringify(resultB)
);
console.log();

console.log("=== All Tests Complete ===");
