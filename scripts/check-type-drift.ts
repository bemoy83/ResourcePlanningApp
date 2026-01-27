#!/usr/bin/env tsx
/**
 * Type Drift Detection Script
 *
 * Scans for duplicate type definitions that should use shared types.
 * Fails if canonical types are redefined outside allowed locations.
 *
 * Run: npx tsx scripts/check-type-drift.ts
 * Or: npm run check:types
 */

import * as fs from 'fs';
import * as path from 'path';

// Canonical types that should only be defined in allowed locations
const CANONICAL_TYPES = [
  'Allocation',
  'WorkCategory',
  'Event',
  'EventPhase',
  'AllocationDraft',
  'WorkCategoryPressure',
  'DailyCapacityComparison',
  'DailyDemand',
  'Location',
  'EventLocation',
  'Evaluation',
  'CrossEventEvaluation',
  'TimelineLayout',
];

// Locations where canonical types can be defined
const ALLOWED_PATTERNS = [
  /^app\/types\/shared\.ts$/,
  /^modules\/[^/]+\/domain\/[^/]+\.ts$/,
  /^types\/[^/]+\.ts$/,
];

// Patterns to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /\.git/,
  /scripts\/check-type-drift\.ts$/,
];

interface Violation {
  file: string;
  line: number;
  typeName: string;
  snippet: string;
}

function isAllowedLocation(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

function isExcluded(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];

  if (isExcluded(filePath) || isAllowedLocation(filePath)) {
    return violations;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip import/export statements
    if (line.trim().startsWith('import ') || line.trim().startsWith('export {')) {
      continue;
    }

    // Check for interface definitions
    for (const typeName of CANONICAL_TYPES) {
      // Match interface definitions: "interface TypeName {" or "interface TypeName extends"
      const interfacePattern = new RegExp(`\\binterface\\s+${typeName}\\s*[{<]|\\binterface\\s+${typeName}\\s+extends\\b`);
      // Match type definitions: "type TypeName =" (but not "type TypeName = imported")
      const typePattern = new RegExp(`\\btype\\s+${typeName}\\s*=\\s*\\{`);

      if (interfacePattern.test(line) || typePattern.test(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          typeName,
          snippet: line.trim().substring(0, 80),
        });
      }
    }
  }

  return violations;
}

function walkDirectory(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (isExcluded(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function main(): void {
  const projectRoot = process.cwd();
  const extensions = ['.ts', '.tsx'];

  console.log('Scanning for type drift...\n');

  const files = walkDirectory(projectRoot, extensions);
  const allViolations: Violation[] = [];

  for (const file of files) {
    const relativePath = path.relative(projectRoot, file);
    const violations = scanFile(relativePath);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log('No type drift detected. All canonical types are properly centralized.');
    process.exit(0);
  }

  console.log(`Found ${allViolations.length} type drift violation(s):\n`);

  // Group by file
  const byFile = new Map<string, Violation[]>();
  for (const v of allViolations) {
    if (!byFile.has(v.file)) {
      byFile.set(v.file, []);
    }
    byFile.get(v.file)!.push(v);
  }

  for (const [file, violations] of byFile) {
    console.log(`${file}:`);
    for (const v of violations) {
      console.log(`  Line ${v.line}: Duplicate definition of "${v.typeName}"`);
      console.log(`    ${v.snippet}`);
    }
    console.log();
  }

  console.log('Fix: Import these types from "app/types/shared" instead of redefining them.');
  console.log('Example: import { Allocation, WorkCategory } from "../types/shared";');

  process.exit(1);
}

main();
