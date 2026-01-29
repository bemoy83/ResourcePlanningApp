# Workspace Page Refactoring Plan

**Target File:** `app/(planning)/workspace/page.tsx`
**Current Size:** ~920 lines
**Target Size:** ~150-200 lines
**Approach:** Incremental extraction with validation between each phase

---

## Phase 1: Extract Loading/Error/Empty States

**Goal:** Create reusable `PageState` component to eliminate duplicated UI patterns.

**Files to Create:**
- `app/components/PageState.tsx`

**Changes to `page.tsx`:**
- Replace three similar conditional blocks (lines 557-630) with single `<PageState>` wrapper

**Extraction:**
```tsx
// app/components/PageState.tsx
interface PageStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function PageState({
  loading,
  error,
  empty,
  emptyMessage = "No data available",
  children
}: PageStateProps) {
  if (loading) return <CenteredMessage>Loading workspace...</CenteredMessage>;
  if (error) return <CenteredMessage variant="error">Error: {error}</CenteredMessage>;
  if (empty) return <CenteredMessage>{emptyMessage}</CenteredMessage>;
  return <>{children}</>;
}
```

**Validation Checklist:**
- [ ] Loading state displays correctly on initial page load
- [ ] Error state displays when API fails (can test by temporarily breaking an API URL)
- [ ] Empty state displays when no events exist
- [ ] Normal content renders when data is present
- [ ] Styles match original implementation exactly

**Estimated Impact:** -70 lines

---

## Phase 2: Extract Toast/Notification System

**Goal:** Isolate toast state and logic into a reusable hook.

**Files to Create:**
- `app/hooks/useToast.ts`

**Changes to `page.tsx`:**
- Remove `toastMessage` state
- Remove `toastTimeoutRef` ref
- Remove `showToast` callback
- Remove toast cleanup effect
- Import and use `useToast` hook

**Extraction:**
```tsx
// app/hooks/useToast.ts
interface UseToastOptions {
  duration?: number;
}

interface UseToastReturn {
  message: string | null;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export function useToast({ duration = 2500 }: UseToastOptions = {}): UseToastReturn {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const hideToast = useCallback(() => {
    setMessage(null);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      timeoutRef.current = null;
    }, duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, showToast, hideToast };
}
```

**Validation Checklist:**
- [ ] Toast appears when filters result in no matches
- [ ] Toast auto-dismisses after ~2.5 seconds
- [ ] Multiple rapid toasts don't stack (latest replaces previous)
- [ ] Toast clears when filtered data becomes non-empty
- [ ] No memory leaks (timeout cleared on unmount)

**Estimated Impact:** -25 lines

---

## Phase 3: Extract Filter Alert Logic

**Goal:** Move complex filter alert effect into dedicated hook.

**Files to Create:**
- `app/hooks/useFilterAlerts.ts`

**Changes to `page.tsx`:**
- Remove the large `useEffect` block (lines 162-243)
- Remove `lastAlertKeyRef`
- Remove related memos (`filterAlertKey`, `hasActiveDateRange`)
- Import and use `useFilterAlerts` hook

**Extraction:**
```tsx
// app/hooks/useFilterAlerts.ts
interface UseFilterAlertsOptions {
  filteredEventsCount: number;
  selectedEventIds: Set<string>;
  selectedLocationIds: Set<string>;
  activeDateRange: { startDate: string | null; endDate: string | null };
  isRangeLocked: boolean;
  eventIdsForSelectedLocations: Set<string> | null;
  eventIdsInActiveDateRange: Set<string> | null;
  onAlert: (message: string) => void;
}

export function useFilterAlerts(options: UseFilterAlertsOptions): void {
  // All filter alert logic here
}
```

**Validation Checklist:**
- [ ] "Selected events are outside the current date range" shows correctly
- [ ] "Selected locations have no events in the current date range" shows correctly
- [ ] "Selected events are not scheduled at the selected locations" shows correctly
- [ ] "No events fall within the selected date range" shows correctly
- [ ] "No events match the current filters" shows as fallback
- [ ] Alerts don't repeat for same filter combination
- [ ] Alerts clear when filters produce results

**Estimated Impact:** -80 lines

---

## Phase 4: Extract Event Navigation Logic

**Goal:** Isolate event navigation state and handlers.

**Files to Create:**
- `app/hooks/useEventNavigation.ts`

**Changes to `page.tsx`:**
- Remove `focusedEventId` state
- Remove `currentEventIndex` state
- Remove `selectedEventsForNavigation` memo
- Remove `handleLocatePrevious` callback
- Remove `handleLocateNext` callback
- Remove navigation-related effects
- Remove derived navigation state (`hasNavigationSelection`, `canLocatePrevious`, etc.)

**Extraction:**
```tsx
// app/hooks/useEventNavigation.ts
interface UseEventNavigationOptions {
  events: PlanningEvent[];
  selectedEventIds: Set<string>;
}

interface UseEventNavigationReturn {
  focusedEventId: string | null;
  currentIndex: number;
  totalSelected: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  label: string;
  title: string | undefined;
  goToPrevious: () => void;
  goToNext: () => void;
  reset: () => void;
}

export function useEventNavigation(options: UseEventNavigationOptions): UseEventNavigationReturn {
  // All navigation logic here
}
```

**Validation Checklist:**
- [ ] "Locate" button group appears when events are selected
- [ ] Prev/Next buttons navigate through selected events in date order
- [ ] Label updates correctly ("Locate 1 of 3", etc.)
- [ ] Navigation resets when selection changes
- [ ] Prev disabled at start, Next disabled at end
- [ ] `focusedEventId` correctly passed to UnifiedPlanningTable

**Estimated Impact:** -60 lines

---

## Phase 5: Extract Date Navigation Utilities

**Goal:** Consolidate year/month navigation logic.

**Files to Create:**
- `app/hooks/useDateNavigation.ts`

**Changes to `page.tsx`:**
- Remove `yearMonthPrevDisabled` memo
- Remove `yearMonthNextDisabled` memo
- Remove `handleYearMonthPreviousWithAlert` callback
- Remove `handleYearMonthNextWithAlert` callback

**Extraction:**
```tsx
// app/hooks/useDateNavigation.ts
interface UseDateNavigationOptions {
  selectedYear: number | null;
  selectedMonth: number | null;
  availableYears: number[];
  onPrevious: () => void;
  onNext: () => void;
  onBlocked: (message: string) => void;
}

interface UseDateNavigationReturn {
  canGoPrevious: boolean;
  canGoNext: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
}

export function useDateNavigation(options: UseDateNavigationOptions): UseDateNavigationReturn {
  // Consolidate navigation boundary logic
}
```

**Validation Checklist:**
- [ ] Month navigation arrows work correctly
- [ ] Navigation stops at year boundaries when no data exists
- [ ] Toast shows "No events exist in {year}" at boundaries
- [ ] Disabled state visually correct on buttons

**Estimated Impact:** -40 lines

---

## Phase 6: Extract Allocation Operations

**Goal:** Move all allocation CRUD logic to dedicated hook.

**Files to Create:**
- `app/hooks/useAllocations.ts`

**Changes to `page.tsx`:**
- Remove `drafts` state
- Remove `errorsByCellKey` state
- Remove all allocation handler functions:
  - `startCreateAllocation`
  - `startEditAllocation`
  - `changeDraft`
  - `commitDraft`
  - `cancelDraft`
  - `deleteAllocation`
  - `refreshEvaluation`

**Extraction:**
```tsx
// app/hooks/useAllocations.ts
interface UseAllocationsOptions {
  allocations: Allocation[];
  setAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
  workCategories: WorkCategory[];
  onEvaluationRefresh: () => Promise<void>;
}

interface UseAllocationsReturn {
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
  startCreate: (workCategoryId: string, date: string) => void;
  startEdit: (allocationId: string, workCategoryId: string, date: string, effortHours: number) => void;
  changeDraft: (draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE") => void;
  commitDraft: (draftKey: string) => Promise<void>;
  cancelDraft: (draftKey: string) => void;
  deleteAllocation: (allocationId: string) => Promise<void>;
}

export function useAllocations(options: UseAllocationsOptions): UseAllocationsReturn {
  // All allocation CRUD logic with proper useCallback wrapping
}
```

**Validation Checklist:**
- [ ] Can create new allocation by clicking empty cell
- [ ] Can edit existing allocation by clicking filled cell
- [ ] Draft value changes update in real-time
- [ ] Committing draft saves to server and updates UI
- [ ] Cancel clears draft without saving
- [ ] Delete removes allocation from server and UI
- [ ] Errors display correctly per cell
- [ ] Cross-event evaluation refreshes after changes

**Estimated Impact:** -140 lines

---

## Phase 7: Extract Data Fetching

**Goal:** Consolidate all data loading into a single hook.

**Files to Create:**
- `app/hooks/useWorkspaceData.ts`

**Changes to `page.tsx`:**
- Remove all entity state: `events`, `workCategories`, `locations`, `eventLocations`, `allocations`
- Remove `evaluation`, `crossEventEvaluation` state
- Remove `isLoading`, `error` state
- Remove data loading effects (lines 325-404)

**Extraction:**
```tsx
// app/hooks/useWorkspaceData.ts
interface WorkspaceData {
  events: PlanningEvent[];
  workCategories: WorkCategory[];
  locations: Location[];
  eventLocations: EventLocation[];
  allocations: Allocation[];
  evaluation: Evaluation;
  crossEventEvaluation: CrossEventEvaluation;
  isLoading: boolean;
  error: string | null;
  setAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
  refreshCrossEventEvaluation: () => Promise<void>;
}

export function useWorkspaceData(): WorkspaceData {
  // All data fetching and state
}
```

**Validation Checklist:**
- [ ] All data loads correctly on mount
- [ ] Loading state shows during fetch
- [ ] Error state shows on fetch failure
- [ ] Active events filtered correctly (status === "ACTIVE")
- [ ] Cross-event evaluation refreshes when allocations change
- [ ] No duplicate fetches on re-renders

**Estimated Impact:** -80 lines

---

## Phase 8: Extract Toolbar Components

**Goal:** Break up the large JSX return into focused components.

**Files to Create:**
- `app/components/workspace/WorkspaceHeader.tsx`
- `app/components/workspace/WorkspaceFilters.tsx`
- `app/components/workspace/LocationTagBar.tsx`
- `app/components/workspace/EventNavigator.tsx`

**Changes to `page.tsx`:**
- Remove inline `PlanningToolbar` component
- Replace large toolbar JSX with composed components

**Validation Checklist:**
- [ ] Header renders with correct title and links
- [ ] Filter bar renders with all filter controls
- [ ] Location tags render when tags are selected
- [ ] Event navigator appears when events selected
- [ ] All interactions work as before
- [ ] Styling matches original

**Estimated Impact:** -150 lines

---

## Phase 9: Extract Styles

**Goal:** Move inline styles to CSS modules.

**Files to Create:**
- `app/(planning)/workspace/page.module.css`

**Changes to `page.tsx`:**
- Import styles module
- Replace all inline `style={{}}` with `className={styles.xxx}`

**Validation Checklist:**
- [ ] All visual styling identical to inline version
- [ ] CSS variables still work correctly
- [ ] Responsive behavior unchanged
- [ ] Dark/light theme switching works

**Estimated Impact:** -100 lines (style objects), cleaner JSX

---

## Phase 10: Final Cleanup

**Goal:** Polish and optimize the refactored code.

**Tasks:**
- [ ] Remove any unused imports
- [ ] Ensure consistent naming conventions
- [ ] Add JSDoc comments to hooks
- [ ] Review and optimize memo/callback dependencies
- [ ] Run TypeScript strict checks
- [ ] Add index exports for hooks folder

**Final File Structure:**
```
app/
├── (planning)/
│   └── workspace/
│       ├── page.tsx              (~150-200 lines)
│       └── page.module.css
├── components/
│   ├── PageState.tsx
│   └── workspace/
│       ├── WorkspaceHeader.tsx
│       ├── WorkspaceFilters.tsx
│       ├── LocationTagBar.tsx
│       └── EventNavigator.tsx
└── hooks/
    ├── useToast.ts
    ├── useFilterAlerts.ts
    ├── useEventNavigation.ts
    ├── useDateNavigation.ts
    ├── useAllocations.ts
    ├── useWorkspaceData.ts
    └── index.ts
```

**Final Validation:**
- [ ] Full manual regression test of all features
- [ ] No console errors or warnings
- [ ] Performance profiling (no unnecessary re-renders)
- [ ] Build completes without errors

---

## Summary

| Phase | Description | Lines Saved | Cumulative |
|-------|-------------|-------------|------------|
| 1 | PageState component | ~70 | 70 |
| 2 | Toast hook | ~25 | 95 |
| 3 | Filter alerts hook | ~80 | 175 |
| 4 | Event navigation hook | ~60 | 235 |
| 5 | Date navigation hook | ~40 | 275 |
| 6 | Allocations hook | ~140 | 415 |
| 7 | Workspace data hook | ~80 | 495 |
| 8 | Toolbar components | ~150 | 645 |
| 9 | CSS modules | ~100 | 745 |
| 10 | Final cleanup | ~20 | 765 |

**Starting:** ~920 lines
**Target:** ~155 lines
**Reduction:** ~83%

---

## Notes

- Each phase should be a separate commit/PR for easy rollback
- Run the app after each phase to catch issues early
- Phases 1-5 are lower risk and can be done quickly
- Phases 6-7 touch critical business logic - extra care needed
- Consider adding unit tests for extracted hooks as you go
