# Unified Planning Table

A refactored planning workspace that combines EventCalendar, CrossEventContext, and PlanningBoardGrid into a single scrollable table.

## Architecture

Instead of three separate components with synchronized scrolling, the unified table uses **one scroll container** with different row types:

```
UnifiedPlanningTable (single scroll container)
├── PlanningTableHeader (sticky header)
├── Calendar Section
│   └── CalendarLocationRow (one per location)
├── Cross-Event Section
│   ├── CrossEventDemandRow
│   └── CrossEventCapacityRow
└── Planning Grid Section
    └── WorkCategoryRow (one per work category)
```

## Benefits

### ✅ Eliminates Scroll Synchronization
- **Old approach**: 4 separate scroll containers requiring manual JavaScript synchronization
- **New approach**: 1 scroll container, browser handles everything natively

### ✅ Eliminates Duplicate Header
- **Old approach**: Header duplicated in workspace page for sticky positioning
- **New approach**: Single header with native `position: sticky`

### ✅ Simpler Sticky Columns
- **Old approach**: Complex z-index layering and dynamic top offsets
- **New approach**: Native sticky positioning in single scroll context

### ✅ Better Performance
- No scroll event handlers (except for row-specific interactions)
- No `requestAnimationFrame` overhead for sync
- Browser's optimized sticky positioning

### ✅ Easier to Maintain
- Small, focused row components (~50-150 lines each)
- Clear separation of concerns
- Easy to add new row types or modify existing ones

## File Structure

```
unified-planning-table/
├── UnifiedPlanningTable.tsx       # Main assembly component
├── PlanningTableHeader.tsx        # Sticky header with date columns
├── rows/
│   ├── CalendarLocationRow.tsx    # Location row with event phases
│   ├── CrossEventDemandRow.tsx    # Total demand row
│   ├── CrossEventCapacityRow.tsx  # Total capacity row
│   └── (WorkCategoryRow.tsx)      # Reuses existing component
├── shared/
│   ├── DateCellsContainer.tsx     # Date cells positioning utility
│   ├── StickyLeftCell.tsx         # Sticky left column utility
│   └── types.ts                   # Shared TypeScript types
├── index.ts                       # Public exports
└── README.md                      # This file
```

## Usage

### Basic Usage

```tsx
import { UnifiedPlanningTable } from '@/app/components/unified-planning-table';

<UnifiedPlanningTable
  events={events}
  locations={locations}
  eventLocations={eventLocations}
  dates={dates}
  workCategories={workCategories}
  allocations={allocations}
  evaluation={evaluation}
  crossEventEvaluation={crossEventEvaluation}
  drafts={drafts}
  errorsByCellKey={errorsByCellKey}
  tooltipsEnabled={tooltipsEnabled}
  onStartCreate={startCreateAllocation}
  onStartEdit={startEditAllocation}
  onChangeDraft={changeDraft}
  onCommit={commitDraft}
  onCancel={cancelDraft}
  onDelete={deleteAllocation}
/>
```

### Access via Workspace

The unified table is available at:
- **URL**: `/workspace`
- **File**: `app/(planning)/workspace/page.tsx`

## Component Details

### PlanningTableHeader
- Shows 5 sticky left columns (Event, Work Category, Estimate, Allocated, Remaining)
- Shows date columns with day name and date
- Sticks to top during vertical scroll
- Left columns stick during horizontal scroll

### CalendarLocationRow
- One row per location
- Shows event phases as colored timeline spans
- Handles vertical stacking for overlapping events
- Tooltip support for phase details
- Reuses phase color mapping from EventCalendar

### CrossEventDemandRow
- Shows aggregated demand across all events
- Highlights over-allocated dates in red
- Displays total hours per date

### CrossEventCapacityRow
- Shows capacity status (demand vs capacity)
- Color-coded: red for over, green for under
- Shows available hours and over/under amounts

### WorkCategoryRow
- Reuses existing component from PlanningBoardGrid
- Shows work category details and allocation cells
- Handles editing, drafts, and validation

## Shared Utilities

### DateCellsContainer
Positions date columns absolutely after sticky left columns.

```tsx
<DateCellsContainer
  timelineOriginPx={700}
  timelineWidth={9000}
>
  {dates.map(date => <DateCell key={date} />)}
</DateCellsContainer>
```

### StickyLeftCell
Creates sticky left column cells with consistent styling.

```tsx
<StickyLeftCell
  leftOffset={220}
  style={{ fontWeight: 'bold' }}
>
  Content
</StickyLeftCell>
```

## Migration Notes

### From Old Workspace to Unified Table

**Removed:**
- `syncScrollToOthers` function and all scroll synchronization logic
- Duplicate header rendering in workspace page
- `eventCalendarScrollRef`, `crossEventScrollRef`, `planningGridHeaderScrollRef` refs
- `useElementHeight` hook for dynamic height measurements
- Dynamic sticky top offset calculations
- Scroll timeout management and feedback loop prevention

**Simplified:**
- Single scroll container instead of 4
- Native sticky positioning instead of complex JS
- Row-based components instead of monolithic sections

### Testing Checklist

When testing the unified table:
- [ ] Sticky header stays at top when scrolling down
- [ ] Left 5 columns stick when scrolling right
- [ ] Date columns align across all row types
- [ ] Calendar phase spans render correctly
- [ ] Cross-event rows show correct aggregated data
- [ ] Work category editing works (create, edit, delete allocations)
- [ ] Tooltips work on calendar phases
- [ ] Filters work (event, location, date range)
- [ ] Theme toggle works
- [ ] Performance is smooth with large datasets

## Future Enhancements

Potential improvements:
- Virtual scrolling for very large datasets (>1000 rows)
- Row grouping/collapsing for better navigation
- Column resizing for left columns
- Export functionality
- Keyboard navigation

## Legacy Cleanup

If the unified table remains stable, legacy code can be removed:
- Delete `app/components/EventCalendar.tsx`
- Delete `app/components/CrossEventContext.tsx`
- Delete `app/components/PlanningBoardGrid.tsx` (keep WorkCategoryRow)
- Remove scroll sync logic and duplicate header code
