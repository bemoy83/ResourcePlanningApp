# Event Import Contract: Spreadsheet → UnifiedEvent

**Phase 3: Design Specification (No Implementation)**

---

## 1. Canonical Import Row Schema

```typescript
interface EventImportRow {
  eventName: string;
  location: string;
  spanType: "EVENT" | "ASSEMBLY" | "MOVE_IN" | "MOVE_OUT" | "DISMANTLE";
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}
```

### Field Semantics

| Field | Purpose | Constraints |
|-------|---------|-------------|
| `eventName` | Event identifier and grouping key | Non-empty string. All rows with same eventName belong to same event. |
| `location` | Location name where span occurs | Non-empty string. Must match existing Location.name or will create new location. |
| `spanType` | Type of span this row represents | One of: `EVENT` (main event), `ASSEMBLY`, `MOVE_IN`, `MOVE_OUT`, `DISMANTLE` (phases) |
| `startDate` | Span start date (inclusive) | ISO 8601 date string (YYYY-MM-DD) |
| `endDate` | Span end date (inclusive) | ISO 8601 date string (YYYY-MM-DD), must be >= startDate |

---

## 2. Import File Semantics

### How Events Are Grouped

- **All rows with the same `eventName` belong to the same event.**
- Event grouping is case-sensitive: `"Trade Fair"` ≠ `"trade fair"`
- Whitespace is significant: `"Trade Fair"` ≠ `"Trade Fair "`

### How Event Date Range Is Determined

- **Each event must have at least one row with `spanType: "EVENT"`**
- All `EVENT` rows for the same event should have identical `startDate` and `endDate`
- If `EVENT` rows for the same event have different dates:
  - The event's date range is the **union** (minimum startDate, maximum endDate)
  - A validation signal is reported
- The resulting `Event.startDate` and `Event.endDate` represent the EVENT phase

### How Locations Are Assigned

- **Locations are aggregated from all rows for an event**
- Each unique `location` value creates an EventLocation mapping
- If a location name doesn't exist in the database, it will be created
- Duplicate location assignments (multiple rows, same event, same location) are deduplicated

**Example:**
```
eventName: "Trade Fair", location: "Hall A", spanType: "EVENT", ...
eventName: "Trade Fair", location: "Hall B", spanType: "EVENT", ...
eventName: "Trade Fair", location: "Hall A", spanType: "ASSEMBLY", ...
```
Results in: `locations: ["Hall A", "Hall B"]` (deduplicated)

### How Phases Are Determined

- **Rows with `spanType` ∈ {ASSEMBLY, MOVE_IN, MOVE_OUT, DISMANTLE} create phases**
- Each unique combination of `(eventName, spanType, startDate, endDate)` creates one phase
- Phases are **not location-specific** (location field is ignored for phase rows)
- Phases can have any date range (may extend before/after EVENT dates)
- Events with zero phase rows will have `phases: []`

**Deduplication:**
```
eventName: "Trade Fair", location: "Hall A", spanType: "ASSEMBLY", startDate: "2026-02-27", endDate: "2026-02-28"
eventName: "Trade Fair", location: "Hall B", spanType: "ASSEMBLY", startDate: "2026-02-27", endDate: "2026-02-28"
```
Results in: **One phase** (ASSEMBLY, 2026-02-27 to 2026-02-28)

But:
```
eventName: "Trade Fair", location: "Hall A", spanType: "ASSEMBLY", startDate: "2026-02-27", endDate: "2026-02-28"
eventName: "Trade Fair", location: "Hall A", spanType: "ASSEMBLY", startDate: "2026-02-25", endDate: "2026-02-26"
```
Results in: **Two phases** (different dates)

---

## 3. Import → UnifiedEvent Transformation

### Pure Transformation: `EventImportRow[] → UnifiedEvent[]`

```typescript
function transformImportToUnifiedEvents(rows: EventImportRow[]): UnifiedEvent[] {
  // Group rows by eventName
  const eventGroups = groupBy(rows, row => row.eventName);

  return eventGroups.map(([eventName, eventRows]) => {
    // Extract EVENT rows to determine event date range
    const eventSpans = eventRows.filter(r => r.spanType === "EVENT");

    // Event date range: union of all EVENT spans
    const startDate = min(eventSpans.map(r => r.startDate));
    const endDate = max(eventSpans.map(r => r.endDate));

    // Aggregate unique locations
    const uniqueLocations = deduplicate(
      eventRows.map(r => r.location)
    );
    const locations = uniqueLocations.map(name => ({
      id: lookupOrCreateLocationId(name), // Implementation detail
      name: name
    }));

    // Extract phases (deduplicated by spanType + dates)
    const phaseRows = eventRows.filter(r => r.spanType !== "EVENT");
    const uniquePhases = deduplicateBy(
      phaseRows,
      r => `${r.spanType}|${r.startDate}|${r.endDate}`
    );
    const phases = uniquePhases.map(r => ({
      name: r.spanType,
      startDate: toISODateTime(r.startDate),
      endDate: toISODateTime(r.endDate)
    }));

    return {
      id: generateUUID(),
      name: eventName,
      startDate: toISODateTime(startDate),
      endDate: toISODateTime(endDate),
      locations: locations,
      phases: phases
    };
  });
}
```

### Transformation Rules

1. **Grouping:** Group all rows by `eventName`
2. **Event Dates:**
   - Filter rows where `spanType === "EVENT"`
   - `startDate` = minimum of all EVENT row startDates
   - `endDate` = maximum of all EVENT row endDates
3. **Locations:**
   - Collect all unique `location` values across all rows for this event
   - Map location names to `{ id, name }` objects
4. **Phases:**
   - Filter rows where `spanType !== "EVENT"`
   - Deduplicate by `(spanType, startDate, endDate)`
   - Map to `{ name: spanType, startDate, endDate }`
5. **Event ID:** Generate new UUID (not from spreadsheet)

---

## 4. Validation Signals (Non-Blocking)

These conditions should be **reported** to the planner but **not prevent** import:

### ⚠️ Event-Level Signals

| Signal | Condition | Severity |
|--------|-----------|----------|
| **Inconsistent EVENT dates** | EVENT rows for same event have different startDate/endDate | Warning |
| **No EVENT span** | Event has only phase rows, no EVENT row | Warning |
| **Zero locations** | Event has no location assignments | Warning |
| **Event date mismatch** | Multiple EVENT rows exist but dates don't align exactly | Info |

### ⚠️ Phase-Level Signals

| Signal | Condition | Severity |
|--------|-----------|----------|
| **Phase outside event range** | Phase startDate < Event.startDate or phase endDate > Event.endDate | Info |
| **Overlapping phases** | Two phases of same type have overlapping date ranges | Info |
| **Duplicate phase rows** | Multiple rows with identical (event, spanType, dates, location) | Info |
| **Orphan phase** | Phase row exists for event with no EVENT row | Warning |

### ⚠️ Location-Level Signals

| Signal | Condition | Severity |
|--------|-----------|----------|
| **New location** | Location name doesn't exist in database (will be created) | Info |
| **Duplicate location assignment** | Same location appears multiple times for same event | Info |

### ⚠️ Data Quality Signals

| Signal | Condition | Severity |
|--------|-----------|----------|
| **End before start** | endDate < startDate | Error |
| **Invalid date format** | Date string is not YYYY-MM-DD | Error |
| **Empty required field** | eventName, location, spanType, or dates are empty/null | Error |
| **Unknown span type** | spanType not in allowed values | Error |

**Severity Levels:**
- **Error**: Malformed data, row will be skipped
- **Warning**: Unusual structure, may indicate planner mistake
- **Info**: Informational, may be intentional

---

## 5. Explicit Non-Goals

This import contract **does NOT**:

❌ **Perform scheduling** - Does not assign work or allocate resources
❌ **Check capacity** - Does not validate if dates are feasible
❌ **Auto-correct data** - Does not fix malformed dates or guess missing fields
❌ **Optimize layout** - Does not rearrange phases or adjust dates
❌ **Normalize silently** - Does not trim whitespace, change case, or standardize naming
❌ **Enforce business rules** - Does not prevent overlapping events or validate event duration
❌ **Generate phases** - Does not create phases that aren't explicitly listed
❌ **Infer locations** - Does not guess locations from event names or patterns
❌ **Validate feasibility** - Does not check if move-in/move-out dates make logistical sense

The import is **declarative**: it creates exactly what the planner specified.

---

## 6. Example Spreadsheet

**CSV Format:**

```csv
eventName,location,spanType,startDate,endDate
Spring Trade Fair 2026,Hall A,EVENT,2026-03-01,2026-03-06
Spring Trade Fair 2026,Hall A,ASSEMBLY,2026-02-27,2026-02-28
Spring Trade Fair 2026,Hall A,DISMANTLE,2026-03-07,2026-03-08
GRESS 2026,Hall B,EVENT,2026-02-24,2026-03-04
GRESS 2026,Hall B,MOVE_IN,2026-02-22,2026-02-23
GRESS 2026,Hall C,EVENT,2026-02-24,2026-03-04
Multi-Location Expo,Convention Center,EVENT,2026-04-10,2026-04-15
Multi-Location Expo,Outdoor Pavilion,EVENT,2026-04-10,2026-04-15
Multi-Location Expo,Convention Center,ASSEMBLY,2026-04-08,2026-04-09
```

---

## 7. Example Resulting UnifiedEvent JSON

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Spring Trade Fair 2026",
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": "2026-03-06T00:00:00.000Z",
    "locations": [
      {
        "id": "bda61dc5-fe4a-45f2-a1f4-7eb39e649dd0",
        "name": "Hall A"
      }
    ],
    "phases": [
      {
        "name": "ASSEMBLY",
        "startDate": "2026-02-27T00:00:00.000Z",
        "endDate": "2026-02-28T00:00:00.000Z"
      },
      {
        "name": "DISMANTLE",
        "startDate": "2026-03-07T00:00:00.000Z",
        "endDate": "2026-03-08T00:00:00.000Z"
      }
    ]
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "GRESS 2026",
    "startDate": "2026-02-24T00:00:00.000Z",
    "endDate": "2026-03-04T00:00:00.000Z",
    "locations": [
      {
        "id": "9bfa4624-05bb-4a72-8f54-151dee5e0d8f",
        "name": "Hall B"
      },
      {
        "id": "c7e8f9a0-1234-5678-9abc-def012345678",
        "name": "Hall C"
      }
    ],
    "phases": [
      {
        "name": "MOVE_IN",
        "startDate": "2026-02-22T00:00:00.000Z",
        "endDate": "2026-02-23T00:00:00.000Z"
      }
    ]
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Multi-Location Expo",
    "startDate": "2026-04-10T00:00:00.000Z",
    "endDate": "2026-04-15T00:00:00.000Z",
    "locations": [
      {
        "id": "d8f9a0b1-2345-6789-abcd-ef0123456789",
        "name": "Convention Center"
      },
      {
        "id": "e9f0a1b2-3456-789a-bcde-f01234567890",
        "name": "Outdoor Pavilion"
      }
    ],
    "phases": [
      {
        "name": "ASSEMBLY",
        "startDate": "2026-04-08T00:00:00.000Z",
        "endDate": "2026-04-09T00:00:00.000Z"
      }
    ]
  }
]
```

### Notes on Example

1. **Spring Trade Fair 2026**: Single location, two phases (ASSEMBLY before event, DISMANTLE after)
2. **GRESS 2026**: Multi-location (Hall B and C), one phase (MOVE_IN before event)
3. **Multi-Location Expo**: Two locations with identical EVENT dates, one phase at one location
   - The ASSEMBLY phase is deduplicated (only appears at Convention Center in spreadsheet)
   - Both locations receive the same event dates (2026-04-10 to 2026-04-15)

---

## 8. Edge Cases & Ambiguity Resolution

### Case 1: EVENT rows with different dates

**Input:**
```csv
eventName,location,spanType,startDate,endDate
Trade Fair,Hall A,EVENT,2026-03-01,2026-03-06
Trade Fair,Hall B,EVENT,2026-03-03,2026-03-08
```

**Resolution:**
- Event.startDate = `2026-03-01` (minimum)
- Event.endDate = `2026-03-08` (maximum)
- **Validation Signal:** "Inconsistent EVENT dates" (Warning)

### Case 2: Phase without EVENT

**Input:**
```csv
eventName,location,spanType,startDate,endDate
Orphan Event,Hall A,ASSEMBLY,2026-02-27,2026-02-28
```

**Resolution:**
- Event is created with:
  - startDate/endDate: Cannot be determined
  - Phases: [ASSEMBLY]
- **Validation Signal:** "No EVENT span" (Warning)
- **Recommendation:** Skip event or infer dates from phases (implementation choice)

### Case 3: Duplicate rows

**Input:**
```csv
eventName,location,spanType,startDate,endDate
Trade Fair,Hall A,EVENT,2026-03-01,2026-03-06
Trade Fair,Hall A,EVENT,2026-03-01,2026-03-06
```

**Resolution:**
- Locations deduplicated: `["Hall A"]` (not `["Hall A", "Hall A"]`)
- **Validation Signal:** "Duplicate location assignment" (Info)

### Case 4: Phase extends beyond event

**Input:**
```csv
eventName,location,spanType,startDate,endDate
Trade Fair,Hall A,EVENT,2026-03-01,2026-03-06
Trade Fair,Hall A,ASSEMBLY,2026-02-01,2026-02-28
```

**Resolution:**
- Phase is created as specified (2026-02-01 to 2026-02-28)
- Event dates remain 2026-03-01 to 2026-03-06
- **Validation Signal:** "Phase outside event range" (Info)
- **This is allowed** - phases can precede events

---

## 9. Design Principles

### Planner-Centric
- The spreadsheet is the planner's declaration of intent
- The system reflects, not reinterprets

### Explicit Over Implicit
- No hidden inference
- No silent normalization
- What you declare is what you get

### Inspectable
- Transformation logic is deterministic
- Validation signals surface potential issues
- Planners can debug by examining the spreadsheet

### Declarative
- Rows declare spans, not instructions
- No procedural ordering dependencies
- No state machine

---

## 10. Implementation Notes (For Future Phases)

When implementing this contract:

1. **Location Lookup/Creation:**
   - Check if `location` name exists in DB
   - Create new Location if not found
   - Return location ID for EventLocation mapping

2. **Date Parsing:**
   - Parse YYYY-MM-DD strings to ISO 8601 DateTime
   - Use UTC midnight (T00:00:00.000Z)
   - Validate format before attempting parse

3. **UUID Generation:**
   - Generate new UUIDs for Event and EventPhase records
   - Do not allow spreadsheet to specify IDs

4. **Validation Report:**
   - Return structured validation report alongside transformation
   - Include row numbers for errors/warnings
   - Allow planner to review before persisting

5. **Atomic Import:**
   - All events imported or none (transaction)
   - Roll back on critical errors
   - Warnings don't block import

---

**End of Design Specification**
