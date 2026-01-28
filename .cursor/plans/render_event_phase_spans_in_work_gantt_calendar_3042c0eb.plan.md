---
name: Render Event Phase Spans in Work Gantt Calendar
overview: Render event phase spans as prominent colored bars with labels on the event header row in WorkGanttCalendar, similar to EventCalendar. Phases should be visible in both expanded and collapsed states, providing context for allocated work without cluttering the work category rows.
todos:
  - id: "1"
    content: Create phase span rendering logic similar to EventCalendar (with labels, colors, positioning)
    status: pending
  - id: "2"
    content: Render phase spans in event header row timeline area (both expanded and collapsed states), replacing summary bar when collapsed
    status: pending
  - id: "3"
    content: Handle phase span positioning and date normalization (YYYY-MM-DD format)
    status: pending
  - id: "4"
    content: Style phase spans with proper colors, borders, labels matching EventCalendar style
    status: pending
  - id: "5"
    content: Handle edge cases (no phases, empty phases array, phases with different dates per location)
    status: pending
isProject: false
---

# Render Event Phase Spans in Work Gantt Calendar

## Overview

Render event phase spans as **prominent colored bars with labels** on the event header row button in `WorkGanttCalendar`, similar to how `EventCalendar` renders phases. This provides visual context for event phases when viewing allocated work, without cluttering the work category allocation rows below.

## Implementation Details

### 1. Phase Span Rendering

- **Location**: `app/components/WorkGanttCalendar.tsx` - Event header button (lines 643-784)
- Render phase spans in the timeline area of the event header row (lines 700-728)
- Phases should be **visible colored bars with labels**, not subtle background elements
- Similar visual style to `EventCalendar.tsx` phase rendering (lines 760-792)
- Use existing `getPhaseBackgroundColor()` function for phase colors
- Use `formatPhaseNameForDisplay()` for phase labels

### 2. Phase Data Access

- Events already include `phases?: EventPhase[]` from the API (`/api/events` returns events with phases)
- Access `event.phases` directly in the component
- Handle cases where `phases` is undefined or empty array

### 3. Visual Design (Matching EventCalendar)

- **Height**: Similar to EventCalendar phase spans (approximately 20px, centered in 24px row)
- **Position**: Center vertically within the 24px row height
- **Background**: Use phase-specific colors via `getPhaseBackgroundColor()`
- **Border**: `var(--border-width-thin) solid var(--border-primary)` with `borderRadius: 'var(--radius-sm)'`
- **Label**: Display formatted phase name (e.g., "ASSEMBLY" → "ASSEMBLY", "MOVE_IN" → "MOVE IN")
- **Font**: `fontSize: '11px'`, `fontWeight: 'var(--font-weight-bold)'`
- **Z-index**: Use `'var(--z-phase)'` to ensure proper layering

### 4. Current Behavior vs. New Behavior

**Current (Collapsed State)**:

- Shows a summary bar with total hours spanning min-max days with work allocated

**New (Both States)**:

- Show phase spans as colored bars with labels on the event header row
- **When collapsed**: Replace summary bar with phase spans (summary bar removed for now)
- **When expanded**: Show phase spans on header row, work category rows below show allocations
- **Future enhancement**: Re-implement summary bar as progress indicators within phase bars (out of scope for this session)

### 5. Edge Case Handling

- **Different dates per location**: Since phases are unified by design (not location-specific), this is an edge case
- **Guardrail rule**: If phases exist, render them as-is (they're already unified across locations)
- **No phases**: Gracefully handle events with no phases (no rendering, no error)
- **Empty phases array**: Handle empty array gracefully
- **Overlapping phases**: Handle phases that overlap in date ranges (render all, similar to EventCalendar)

### 6. Implementation Steps

1. **Create phase span rendering logic**:
  - Map `event.phases` to span objects with normalized dates (YYYY-MM-DD)
  - Calculate position and width similar to EventCalendar (using `dates` array and `DAY_COL_FULL_WIDTH`)
  - Handle date normalization (split 'T' from ISO strings)
  - Sort phases by start date for consistent rendering order
2. **Add phase spans to event header timeline area**:
  - In the event header button's timeline area (around line 700-728, after gridlines)
  - Render phase spans using absolute positioning within the timeline container
  - Position spans similar to how EventCalendar does it (lines 760-792)
  - Render phases in both expanded and collapsed states
3. **Replace summary bar when collapsed**:
  - Remove the collapsed summary bar rendering (lines 730-783)
  - Phase spans will serve as the visual indicator when collapsed
  - Keep summary bar logic commented or remove it (can be re-implemented later as progress bars)
4. **Styling to match EventCalendar**:
  - Use same styling approach as EventCalendar phase spans
  - Colors via `getPhaseBackgroundColor()`
  - Labels via `formatPhaseNameForDisplay()`
  - Proper borders, padding, and typography
  - Center vertically within the 24px row height

## Files to Modify

- `app/components/WorkGanttCalendar.tsx`: Add phase span rendering in event header row timeline area

## Reference Implementation

- `app/components/EventCalendar.tsx` lines 337-344 (phase span creation) and 760-792 (phase span rendering)
- Similar pattern: map phases → calculate positions → render as colored bars with labels

## Notes

- Phases are unified across locations by design (see `docs/event-import-contract.md`)
- The edge case of different dates per location shouldn't occur in normal operation, but if it does, render phases as-is
- Phase spans should be prominent and visible, providing clear context for event phases
- **Summary bar replacement**: The current summary bar (showing total hours) is replaced by phase spans when collapsed. This is a temporary simplification - future enhancement will add progress indicators within phase bars showing allocation progress
- Consider adding tooltips on phase spans showing phase name and date range (optional enhancement, similar to EventCalendar)

## Out of Scope (Future Enhancements)

- **Progress bars**: Showing allocation progress within each phase bar (e.g., filled percentage, overlay indicators)
- **Summary bar re-implementation**: Re-adding summary information as progress indicators integrated with phase bars
- These features require additional data aggregation logic and UX design decisions that are better handled in a separate session

