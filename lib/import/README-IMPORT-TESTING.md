# Event Import Testing Guide

## Overview

This guide explains how to test the complete event import flow from Phases 0-4.

## Prerequisites

1. Database running (PostgreSQL)
2. Prisma schema migrated (`npx prisma migrate dev`)
3. Dev server running (`npm run dev`)

## Testing Method 1: Via UI (Recommended)

### Step 1: Start Dev Server

```bash
npm run dev
```

### Step 2: Navigate to Import Page

Open browser to: `http://localhost:3000/data/events/import`

### Step 3: Paste Example CSV

Copy the contents of `lib/import/example-import.csv`:

```csv
eventName,locationName,phase,startDate,endDate
Spring Trade Fair 2026,Hall A,ASSEMBLY,2026-03-01,2026-03-05
Spring Trade Fair 2026,Hall A,EVENT,2026-03-06,2026-03-10
Spring Trade Fair 2026,Hall A,DISMANTLE,2026-03-11,2026-03-15
Spring Trade Fair 2026,Hall B,ASSEMBLY,2026-03-01,2026-03-05
Spring Trade Fair 2026,Hall B,EVENT,2026-03-06,2026-03-10
Autumn Trade Fair 2026,Hall A,MOVE_IN,2026-09-01,2026-09-03
Autumn Trade Fair 2026,Hall A,EVENT,2026-09-04,2026-09-08
Autumn Trade Fair 2026,Hall A,MOVE_OUT,2026-09-09,2026-09-11
```

### Step 4: Preview

1. Make sure "CSV" format is selected
2. Click "Preview Import"
3. Verify:
   - 8 rows parsed successfully
   - 0 errors
   - Events Detected: Spring Trade Fair 2026, Autumn Trade Fair 2026
   - Locations Detected: Hall A, Hall B
   - Phases shown per event

### Step 5: Execute Import

1. Click "Import Events" button
2. Wait for success message
3. Expected results (first run):
   - Events created: 2
   - Locations created: 2
   - Event-Location links created: 3
   - Phases created: 8

### Step 6: Verify in Calendar

Click "View Event Calendar" or navigate to `/calendar`

Verify:
- Spring Trade Fair 2026 appears
- Autumn Trade Fair 2026 appears
- Locations (Hall A, Hall B) show in rows
- Phases render correctly

## Testing Method 2: Via Script

### Run Import Test Script

```bash
# Make sure dev server is running first
npm run dev

# In another terminal:
npx tsx lib/import/test-import-execution.ts
```

Expected output:
```
=== Testing Import Execution ===

Step 1: Parsing example CSV...
  Parsed 8 rows
  Parse errors: 0

Preview of parsed rows:
  1. Spring Trade Fair 2026 | Hall A | ASSEMBLY | 2026-03-01 to 2026-03-05
  2. Spring Trade Fair 2026 | Hall A | EVENT | 2026-03-06 to 2026-03-10
  3. Spring Trade Fair 2026 | Hall A | DISMANTLE | 2026-03-11 to 2026-03-15
  ... and 5 more rows

Step 2: Sending to import API...

✅ Import successful!

Results:
  Events created: 2
  Events reused: 0
  Locations created: 2
  Event-Location links created: 3
  Phases created: 8
```

## Testing Idempotency

### Run Import Twice

Execute the same import a second time (either via UI or script).

Expected results (second run):
- Events created: 0
- Events reused: 2
- Locations created: 0
- Event-Location links created: 0
- Phases created: 0

This confirms the import is idempotent - running it twice doesn't create duplicates.

## Testing JSON Format

### Use JSON Example

Paste contents of `lib/import/example-import.json` into the import page:

```json
[
  {
    "eventName": "Spring Trade Fair 2026",
    "locationName": "Hall A",
    "phase": "ASSEMBLY",
    "startDate": "2026-03-01",
    "endDate": "2026-03-05"
  },
  ...
]
```

1. Select "JSON" format
2. Click "Preview Import"
3. Verify parsing works
4. Click "Import Events"
5. Verify import succeeds

## Testing Error Handling

### Test Parse Errors

Try importing invalid CSV:

```csv
eventName,locationName,phase,startDate,endDate
Bad Event,Hall A,INVALID_PHASE,2026-01-01,2026-01-05
Another Bad,Hall B,EVENT,not-a-date,2026-01-05
```

Expected behavior:
- Parse errors appear in red section
- Shows specific error messages per row
- "Import Events" button is disabled
- Message: "Cannot import: Fix parse errors first"

### Test Empty Input

1. Clear textarea
2. Click "Preview Import"

Expected:
- Error: "Input is empty"
- No import button

## Database Verification

### Check Created Records

```sql
-- Check events
SELECT * FROM "Event" WHERE name LIKE '%Trade Fair%';

-- Check locations
SELECT * FROM "Location";

-- Check event-location links
SELECT * FROM "EventLocation";

-- Check phases
SELECT * FROM "EventPhase" ORDER BY "eventId", "startDate";
```

## Files Involved

- **Parser**: `lib/import/parseEventImport.ts`
- **API Route**: `app/api/data/events/import/route.ts`
- **UI Page**: `app/data/events/import/page.tsx`
- **Types**: `types/event-import.ts`
- **Examples**: `lib/import/example-import.csv`, `example-import.json`
- **Test Script**: `lib/import/test-import-execution.ts`

## Troubleshooting

### "Module not found" errors

Run: `npm install`

### Database connection errors

1. Check PostgreSQL is running
2. Verify `.env` has correct `DATABASE_URL`
3. Run: `npx prisma migrate dev`

### Import button disabled

- Verify no parse errors
- Check browser console for errors
- Ensure parsed rows exist

### API returns 500 error

- Check server console for detailed error
- Verify database connection
- Check Prisma Client is generated: `npx prisma generate`
