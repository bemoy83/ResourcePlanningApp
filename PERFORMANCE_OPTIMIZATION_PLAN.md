# Performance Optimization Plan - Workspace Page

**Document Version:** 1.0
**Date:** 2026-01-12
**Target:** `app/(planning)/workspace/page.tsx` and related components

---

## Executive Summary

The workspace page has several performance bottlenecks related to:
- Unoptimized filtering and data transformations (O(n²) complexity)
- Complex scroll synchronization system
- Missing React optimization patterns (memoization)
- Redundant API calls and computations

This plan outlines a phased approach to address these issues with minimal risk to existing functionality.

---

## Phase 1: Low-Risk Memoization (Week 1)

**Goal:** Add memoization to prevent redundant calculations
**Risk Level:** 🟢 Low
**Impact:** High (30-50% render time reduction expected)

### 1.1 Memoize Filtered Data
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Lines 689-775: Multiple filtering passes run on every render
- No caching of filter results
- Cascading re-renders to all child components

**Solution:**
```typescript
// Consolidate all filtering into single useMemo
const filteredData = useMemo(() => {
  // Filter events
  let filtered = unifiedEvents;
  if (selectedEventIds.size > 0) { /* filter */ }
  if (selectedLocationIds.size > 0) { /* filter */ }
  if (activeDateRange.startDate) { /* filter */ }

  // Filter dependent data in single pass
  const eventIds = new Set(filtered.map(e => e.id));
  const workCategories = workCategories.filter(wc => eventIds.has(wc.eventId));
  // ... etc

  return { events: filtered, workCategories, allocations, evaluation };
}, [
  unifiedEvents,
  selectedEventIds,
  selectedLocationIds,
  activeDateRange,
  workCategories,
  allocations,
  evaluation
]);
```

**Changes:**
- Lines 689-775: Replace inline filtering with useMemo
- Pass `filteredData.events`, `filteredData.workCategories`, etc. to components

**Testing:**
- Verify filters still work correctly
- Check that changes to filters trigger re-renders
- Validate that unrelated state changes don't trigger filters

### 1.2 Memoize Date Range Calculation
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Lines 777-808: Date array generated on every render
- Creates new array reference each time

**Solution:**
```typescript
const { dates, minDate, maxDate } = useMemo(() => {
  let min: string | null = null;
  let max: string | null = null;

  // Calculate date range
  if (activeDateRange.startDate && activeDateRange.endDate) {
    min = activeDateRange.startDate;
    max = activeDateRange.endDate;
  } else {
    // Calculate from events
  }

  // Generate dates array
  const datesArray: string[] = [];
  if (min && max) {
    const start = new Date(min);
    const end = new Date(max);
    const current = new Date(start);
    while (current <= end) {
      datesArray.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  return { dates: datesArray, minDate: min, maxDate: max };
}, [activeDateRange, filteredEventsArray]);
```

**Changes:**
- Lines 777-808: Wrap in useMemo
- Use destructured values in timeline object

### 1.3 Memoize Timeline Layout Object
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Lines 811-815: Timeline object created on every render
- Causes props changes to all child components

**Solution:**
```typescript
const timeline: TimelineLayout = useMemo(() => ({
  dates,
  dateColumnWidth: TIMELINE_DATE_COLUMN_WIDTH,
  timelineOriginPx: TIMELINE_ORIGIN_PX,
}), [dates]);
```

**Changes:**
- Line 811-815: Wrap timeline object in useMemo

**Deliverables:**
- ✅ All filter operations memoized
- ✅ Date calculations memoized
- ✅ Timeline object stable across renders
- ✅ Unit tests for filter logic
- ✅ Performance benchmarks (before/after)

---

## Phase 2: Component Optimization (Week 2)

**Goal:** Prevent unnecessary child component re-renders
**Risk Level:** 🟡 Medium
**Impact:** High (20-40% reduction in re-renders)

### 2.1 Memoize EventCalendar Component
**Files:** `app/components/EventCalendar.tsx`

**Current Problem:**
- Re-renders whenever parent re-renders
- Expensive location map building (lines 40-48)
- Complex row calculation algorithm (lines 66-151)

**Solution:**
```typescript
export const EventCalendar = React.memo(function EventCalendar({
  events,
  timeline
}: EventCalendarProps) {
  // Memoize location processing
  const locations = useMemo(() => {
    const locationMap = new Map<string, { id: string; name: string }>();
    for (const event of events) {
      for (const location of event.locations) {
        locationMap.set(location.id, location);
      }
    }
    return Array.from(locationMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [events]);

  // Memoize row calculation
  const locationEventRows = useMemo(() => {
    // Complex row calculation logic
    return calculateLocationEventRows(locations, events);
  }, [locations, events]);

  // ... render
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when props unchanged
  return (
    prevProps.events === nextProps.events &&
    prevProps.timeline.dates === nextProps.timeline.dates
  );
});
```

**Changes:**
- Wrap component in React.memo
- Add custom comparison function
- Memoize location map construction
- Memoize row calculation

### 2.2 Memoize PlanningBoardGrid Component
**Files:** `app/components/PlanningBoardGrid.tsx`

**Current Problem:**
- Lines 121-134: Rebuilds eventMap and workCategoriesByEvent on every render
- Lines 156-165: Rebuilds pressureMap and capacityMap on every render
- Receives 16 props, many cause unnecessary re-renders

**Solution:**
```typescript
export const PlanningBoardGrid = React.memo(function PlanningBoardGrid({
  events,
  workCategories,
  allocations,
  evaluation,
  // ... other props
}: PlanningBoardGridProps) {
  // Memoize lookup maps
  const eventMap = useMemo(() => {
    const map = new Map<string, Event>();
    for (const event of events) {
      map.set(event.id, event);
    }
    return map;
  }, [events]);

  const workCategoriesByEvent = useMemo(() => {
    const map = new Map<string, WorkCategory[]>();
    for (const wc of workCategories) {
      const existing = map.get(wc.eventId);
      if (existing) {
        existing.push(wc);
      } else {
        map.set(wc.eventId, [wc]);
      }
    }
    return map;
  }, [workCategories]);

  const pressureMap = useMemo(() => {
    const map = new Map<string, WorkCategoryPressure>();
    for (const pressure of evaluation.workCategoryPressure) {
      map.set(pressure.workCategoryId, pressure);
    }
    return map;
  }, [evaluation.workCategoryPressure]);

  // ... render
});
```

**Changes:**
- Wrap component in React.memo
- Memoize all map constructions
- Add shallow comparison for props

### 2.3 Memoize CrossEventContext Component
**Files:** `app/components/CrossEventContext.tsx`

**Current Problem:**
- Re-renders even when evaluation data unchanged
- Simple component but re-renders frequently

**Solution:**
```typescript
export const CrossEventContext = React.memo(function CrossEventContext({
  crossEventEvaluation,
  timeline,
}: CrossEventContextProps) {
  // Memoize demand map
  const demandMap = useMemo(() => {
    const map = new Map<string, DailyDemand>();
    for (const demand of crossEventEvaluation.crossEventDailyDemand) {
      map.set(demand.date, demand);
    }
    return map;
  }, [crossEventEvaluation.crossEventDailyDemand]);

  const comparisonMap = useMemo(() => {
    const map = new Map<string, DailyCapacityComparison>();
    for (const comparison of crossEventEvaluation.crossEventCapacityComparison) {
      map.set(comparison.date, comparison);
    }
    return map;
  }, [crossEventEvaluation.crossEventCapacityComparison]);

  // ... render
});
```

**Changes:**
- Wrap component in React.memo
- Memoize internal data structures

**Deliverables:**
- ✅ All child components memoized
- ✅ Internal computations memoized
- ✅ Custom comparison functions tested
- ✅ Re-render profiling shows improvement

---

## Phase 3: Scroll Synchronization Simplification (Week 3)

**Goal:** Reduce complexity and potential memory leaks
**Risk Level:** 🟡 Medium
**Impact:** Medium (improved reliability, reduced code complexity)

### 3.1 Evaluate Alternative Approaches

**Option A: CSS-Only Solution**
```typescript
// Single scroll container with nested sticky elements
<div className="unified-scroll-container">
  <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
    <EventCalendar />
  </div>
  <div style={{ position: 'sticky', top: 'calc(var(--calendar-height))', zIndex: 9 }}>
    <CrossEventContext />
  </div>
  <div style={{ position: 'sticky', top: 'calc(var(--calendar-height) + var(--cross-event-height))', zIndex: 8 }}>
    <GridHeader />
  </div>
  <div>
    <GridBody />
  </div>
</div>
```

**Pros:**
- No JS scroll synchronization needed
- Browser-native performance
- No memory leaks

**Cons:**
- May require significant CSS refactoring
- Height calculations become CSS variable dependencies

**Option B: Simplified Scroll Sync**
```typescript
// Single scroll handler with intersection observer for visibility
const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  const scrollLeft = e.currentTarget.scrollLeft;

  // Use a single RAF to update all containers
  requestAnimationFrame(() => {
    [calendarRef, crossEventRef, gridHeaderRef, gridRef].forEach(ref => {
      if (ref.current && ref !== e.currentTarget) {
        ref.current.scrollLeft = scrollLeft;
      }
    });
  });
}, []);
```

**Pros:**
- Simpler than current implementation
- Still uses refs but cleaner

**Cons:**
- Still has JS overhead
- Potential for scroll jank

**Recommendation:** Start with Option B (simpler sync), evaluate Option A if issues persist

### 3.2 Implement Simplified Scroll Sync
**Files:** `app/(planning)/workspace/page.tsx`

**Changes:**
- Lines 159-165: Reduce refs to essential ones only
- Lines 311-392: Replace with simplified sync logic (remove timeout, Set tracking)
- Lines 394-420: Consolidate scroll handlers into single reusable function
- Lines 299-308: Improve cleanup logic

**New Implementation:**
```typescript
// Simplified sync without timeout/Set tracking
const syncScroll = useCallback((sourceElement: HTMLDivElement) => {
  const scrollLeft = sourceElement.scrollLeft;

  requestAnimationFrame(() => {
    const targets = [
      eventCalendarScrollRef,
      crossEventScrollRef,
      planningGridHeaderScrollRef,
      planningGridScrollRef,
    ];

    targets.forEach(ref => {
      if (ref.current && ref.current !== sourceElement) {
        ref.current.scrollLeft = scrollLeft;
      }
    });
  });
}, []);

const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  syncScroll(e.currentTarget);
}, [syncScroll]);

// Use same handler for all scroll containers
```

### 3.3 Add Scroll Performance Monitoring

**Changes:**
- Add performance marks to measure scroll jank
- Log warnings if scroll sync takes >16ms

**Deliverables:**
- ✅ Simplified scroll sync implementation
- ✅ Reduced code from 80+ lines to ~20 lines
- ✅ Memory leak risks eliminated
- ✅ Scroll performance meets 60fps target
- ✅ Browser testing (Chrome, Safari, Firefox)

---

## Phase 4: API and State Management (Week 4)

**Goal:** Eliminate redundant API calls and optimize data flow
**Risk Level:** 🟢 Low
**Impact:** Medium (reduced network traffic, faster updates)

### 4.1 Consolidate Cross-Event Evaluation Loading
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Lines 240-255: Initial load useEffect
- Lines 258-269: Separate refresh function
- Called after every allocation mutation

**Solution:**
```typescript
// Single source of truth for cross-event evaluation
const { data: crossEventEvaluation, refetch: refetchCrossEvent } = useCrossEventEvaluation({
  enabled: allocations.length > 0,
  dependencies: [allocations], // Auto-refetch when allocations change
});

// Remove separate useEffect and refreshEvaluation function
// Call refetchCrossEvent() after successful mutations
```

**Alternative (without custom hook):**
```typescript
// Combine into single effect with proper dependency array
useEffect(() => {
  let cancelled = false;

  async function loadCrossEventEvaluation() {
    try {
      const res = await fetch('/api/schedule/evaluation/cross-event');
      if (res.ok && !cancelled) {
        const data = await res.json();
        setCrossEventEvaluation(data);
      }
    } catch (err) {
      console.warn("Failed to load cross-event evaluation:", err);
    }
  }

  loadCrossEventEvaluation();

  return () => { cancelled = true; };
}, [allocations]); // Auto-refetch when allocations change

// Remove refreshEvaluation function
// Update commitDraft and deleteAllocation to rely on effect
```

**Changes:**
- Lines 240-269: Consolidate into single effect
- Lines 563, 602: Remove manual refreshEvaluation calls
- Add cancellation token to prevent race conditions

### 4.2 Add Request Deduplication
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Multiple rapid filter changes trigger multiple requests
- No caching of evaluation results

**Solution:**
```typescript
// Add debouncing for evaluation requests
const debouncedRefetchCrossEvent = useMemo(
  () => debounce(() => {
    // Fetch cross-event evaluation
  }, 300),
  []
);

// Or use SWR/React Query for automatic caching and deduplication
```

### 4.3 Optimize Initial Data Loading
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Lines 188-237: 5 parallel API calls
- All data loaded even if not needed
- No error boundaries for partial failures

**Solution:**
```typescript
// Add granular error handling
const [dataState, setDataState] = useState({
  events: { data: [], loading: true, error: null },
  workCategories: { data: [], loading: true, error: null },
  allocations: { data: [], loading: true, error: null },
  locations: { data: [], loading: true, error: null },
  eventLocations: { data: [], loading: true, error: null },
});

// Allow partial success - show what data is available
// Provide retry mechanism for failed requests
```

**Deliverables:**
- ✅ Consolidated evaluation loading
- ✅ Request deduplication implemented
- ✅ Granular error handling
- ✅ Reduced redundant API calls by 50%+

---

## Phase 5: Advanced Optimizations (Week 5)

**Goal:** Address remaining edge cases and scalability
**Risk Level:** 🟡 Medium
**Impact:** Low-Medium (handles edge cases, future-proofing)

### 5.1 Implement Virtual Scrolling for Date Range
**Files:** `app/components/EventCalendar.tsx`, `app/components/PlanningBoardGrid.tsx`

**Trigger Condition:** If date range > 90 days

**Current Problem:**
- Large date ranges (6+ months) render hundreds of DOM elements
- Lines 192-206 (EventCalendar), Lines 266-280 (PlanningBoardGrid): Render all dates

**Solution:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const columnVirtualizer = useVirtualizer({
  count: dates.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => TIMELINE_DATE_COLUMN_WIDTH,
  horizontal: true,
  overscan: 5,
});

// Only render visible date columns
{columnVirtualizer.getVirtualItems().map(virtualColumn => {
  const date = dates[virtualColumn.index];
  return (
    <div
      key={date}
      style={{
        position: 'absolute',
        left: virtualColumn.start,
        width: virtualColumn.size,
      }}
    >
      {/* Date cell content */}
    </div>
  );
})}
```

**Changes:**
- Add `@tanstack/react-virtual` dependency
- Refactor date rendering to use virtual list
- Test with 180+ day ranges

### 5.2 Web Worker for Heavy Computations
**Files:** `app/workers/filterWorker.ts` (new)

**Trigger Condition:** If events > 50 or work categories > 200

**Solution:**
```typescript
// Offload filtering logic to Web Worker
const filterWorker = new Worker(new URL('./filterWorker.ts', import.meta.url));

filterWorker.postMessage({
  events: unifiedEvents,
  workCategories,
  allocations,
  filters: { selectedEventIds, selectedLocationIds, activeDateRange },
});

filterWorker.onmessage = (e) => {
  setFilteredData(e.data);
};
```

### 5.3 Normalize State Structure
**Files:** `app/(planning)/workspace/page.tsx`

**Current Problem:**
- Data stored as arrays requiring linear searches
- Multiple map constructions in child components

**Solution:**
```typescript
// Normalize state to entities + ids pattern
interface NormalizedState {
  events: {
    byId: Record<string, Event>;
    allIds: string[];
  };
  workCategories: {
    byId: Record<string, WorkCategory>;
    allIds: string[];
    byEventId: Record<string, string[]>;
  };
  // ... etc
}

// Provides O(1) lookups instead of O(n) filters
```

**Deliverables:**
- ✅ Virtual scrolling for large date ranges
- ✅ Web Worker for heavy filtering (optional)
- ✅ Normalized state structure (optional)
- ✅ Performance benchmarks with large datasets

---

## Phase 6: Testing and Validation (Week 6)

**Goal:** Ensure all optimizations work correctly
**Risk Level:** 🟢 Low
**Impact:** High (prevents regressions)

### 6.1 Performance Benchmarking

**Metrics to Track:**
- Initial page load time
- Time to first render
- Filter operation duration
- Re-render count per user action
- Memory usage over time
- Scroll FPS

**Test Scenarios:**
1. Small dataset: 5 events, 20 work categories, 50 allocations
2. Medium dataset: 20 events, 100 work categories, 500 allocations
3. Large dataset: 50 events, 300 work categories, 2000 allocations
4. Extended date range: 180 days vs 30 days

**Tools:**
- React DevTools Profiler
- Chrome DevTools Performance tab
- Lighthouse
- `performance.mark()` / `performance.measure()`

### 6.2 Regression Testing

**Test Coverage:**
- All filter combinations work correctly
- Scroll synchronization across all 4 containers
- Allocation CRUD operations
- Draft state management
- Error handling for API failures
- Cross-event evaluation updates

### 6.3 Browser Compatibility Testing

**Browsers:**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

**Focus Areas:**
- Scroll performance (Safari has known issues)
- Memory leaks
- Visual rendering bugs

**Deliverables:**
- ✅ Performance benchmark report
- ✅ All regression tests pass
- ✅ Browser compatibility confirmed
- ✅ Documentation updated

---

## Success Metrics

### Before Optimization (Baseline)
- **Initial Load:** ~2-3s (medium dataset)
- **Filter Change:** ~500-800ms
- **Re-renders per filter:** 15-20 components
- **Scroll FPS:** 45-55fps
- **Memory Usage:** Growing over time (leak suspected)

### After Optimization (Target)
- **Initial Load:** <1.5s (50% improvement)
- **Filter Change:** <200ms (70% improvement)
- **Re-renders per filter:** 3-5 components (75% reduction)
- **Scroll FPS:** 58-60fps (smooth)
- **Memory Usage:** Stable over time

---

## Risk Mitigation

### Phase 1-2 Risks
- **Risk:** useMemo dependencies incorrect, causing stale data
- **Mitigation:** Comprehensive unit tests for filter logic
- **Rollback:** Easy - remove useMemo wrappers

### Phase 3 Risks
- **Risk:** New scroll sync breaks Safari or causes jank
- **Mitigation:** Extensive browser testing, feature flag
- **Rollback:** Keep old scroll sync code in git history

### Phase 4 Risks
- **Risk:** API consolidation breaks evaluation updates
- **Mitigation:** Integration tests for allocation mutations
- **Rollback:** Revert to separate useEffect and refresh function

### Phase 5 Risks
- **Risk:** Virtual scrolling introduces visual bugs
- **Mitigation:** Only enable for large datasets (feature flag)
- **Rollback:** Conditional rendering based on dataset size

---

## Implementation Strategy

### Sequencing
- Phases 1-2 can be done in parallel (independent changes)
- Phase 3 depends on Phase 1-2 completion (reduced re-renders help identify scroll issues)
- Phase 4 can be done independently
- Phase 5 depends on all previous phases
- Phase 6 runs continuously throughout

### Code Review Checkpoints
- End of Phase 1: Review memoization logic
- End of Phase 2: Review component optimization
- End of Phase 3: Review scroll sync
- End of Phase 4: Review API changes
- End of Phase 5: Review advanced optimizations

### Rollout Strategy
1. Deploy to staging after each phase
2. Run performance benchmarks
3. Get approval before proceeding to next phase
4. Feature flags for risky changes (virtual scrolling, web workers)

---

## Monitoring and Observability

### Production Metrics to Track
```typescript
// Add performance monitoring
useEffect(() => {
  performance.mark('workspace-page-mount');

  return () => {
    performance.mark('workspace-page-unmount');
    performance.measure('workspace-session', 'workspace-page-mount', 'workspace-page-unmount');

    const measure = performance.getEntriesByName('workspace-session')[0];
    // Send to analytics
  };
}, []);

// Track filter performance
const handleFilterChange = useCallback(() => {
  performance.mark('filter-start');
  // ... filter logic
  performance.mark('filter-end');
  performance.measure('filter-duration', 'filter-start', 'filter-end');

  const measure = performance.getEntriesByName('filter-duration')[0];
  if (measure.duration > 200) {
    console.warn('Slow filter detected:', measure.duration);
  }
}, []);
```

### Error Tracking
- Track failed API calls
- Monitor scroll sync errors
- Log slow filter operations (>200ms)
- Alert on memory growth

---

## Appendix: Code References

### Key Files
- `app/(planning)/workspace/page.tsx` - Main page component (1123 lines)
- `app/components/EventCalendar.tsx` - Calendar view (342 lines)
- `app/components/PlanningBoardGrid.tsx` - Grid view (462 lines)
- `app/components/CrossEventContext.tsx` - Cross-event summary (176 lines)

### Problem Areas by Line Number
- **page.tsx:311-392** - Scroll sync logic (80 lines)
- **page.tsx:689-775** - Filtering logic (86 lines)
- **page.tsx:777-808** - Date calculations (31 lines)
- **EventCalendar.tsx:66-151** - Row calculation (85 lines)
- **PlanningBoardGrid.tsx:121-165** - Map construction (44 lines)

---

## Questions for Stakeholders

1. **Priority:** Which performance issue impacts users most? (filter lag, scroll jank, initial load)
2. **Timeline:** Is a 6-week timeline acceptable, or should we prioritize specific phases?
3. **Risk Tolerance:** Are you comfortable with Phase 5 advanced optimizations, or prefer conservative approach?
4. **Dataset Size:** What's the expected maximum dataset size? (events, work categories, date range)
5. **Browser Support:** Are there specific browser versions we must support?

---

## Next Steps

1. **Review this plan** with team and stakeholders
2. **Establish baseline metrics** with current implementation
3. **Create feature branch** for Phase 1 work
4. **Set up performance monitoring** infrastructure
5. **Begin Phase 1 implementation**
