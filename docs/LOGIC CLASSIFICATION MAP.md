## Events Module

### Pure

- `calculateEventDurationDays(startDate, endDate)`

  - Deterministic derivation explicitly listed under “Calculations”

- `calculateEventDurationWeeks(startDate, endDate)`

  - Same justification as above

- `isValidEventDateRange(startDate, endDate)`

  - Validation logic only; no state, no side effects

**Justification (non-obvious):**

- Event validity rules are allowed pure logic because they operate solely on provided inputs and do not inspect other modules or stored state.

### Stateful

- `createEvent(command)`

  - Coordinates validation + persistence

- `updateEventDateRange(eventId, newRange)`

  - Validates, updates state, emits domain events

- `archiveEvent(eventId)`

  - Lifecycle coordination only

**Justification:**

- These functions orchestrate lifecycle changes but do not calculate business outcomes beyond invoking pure validators.

### IO

- `getEvent(eventId)`
- `listEvents()`
- `saveEvent(event)`
- `loadEventById(eventId)`
- `emitEventCreated(event)`
- `emitEventDateRangeChanged(event)`

**Justification:**

- Domain event emission is IO-adjacent infrastructure, not business logic.

---

## Work Module

### Pure

- `validateEstimatedEffort(value)`

  - Simple invariant: `>= 0`

- `isWorkCategoryScopedToEvent(workCategory, eventId)`

  - Referential integrity check using IDs only

**Justification (non-obvious):**

- Although validation touches identifiers, it does not read persistence or compute planning outcomes.

### Stateful

- `updateEstimatedEffort(workCategoryId, value)`

  - Coordinates validation + persistence

- `createWorkCategory(eventId, definition)`
- `renameWorkCategory(workCategoryId, name)`

**Justification:**

- These mutate owned state but perform no planning math or scheduling decisions.

### IO

- `getWorkCategories(eventId)`
- `loadWorkCategoryById(workCategoryId)`
- `persistWorkCategory(workCategory)`
- `deleteWorkCategory(workCategoryId)`

---

## Productivity Module

### Pure

- `convertFteToHours(fteValue, productivityContext)`
- `convertHoursToFte(hoursValue, productivityContext)`
- `validateProductivityRate(rate)`
- `calculateHoursPerDay(rateDefinition)`

**Justification:**

- Explicitly defined as stateless, pure services
- No persistence, no cross-module access

### Stateful

- _None_

**Justification:**

- Module explicitly states no persistence-dependent behavior required by consumers.

### IO

- `getProductivityParameters()`

  - Read-only configuration access

- `loadStandardWorkingDayDefinition()`

**Justification (conservative):**

- Even if stored as config, reading parameters is IO, not logic.

---

## Schedule Module

### Pure

- `normalizeAllocationToHours(value, unit, productivityContext)`

  - Pure conversion using Productivity services

- `aggregateDailyDemand(allocations[])`
- `aggregatePeriodDemand(allocations[], period)`
- `calculateOverUnderAllocationIndicator(demand, capacity)`
- `calculateDeadlinePressureSignal(remainingEffort, remainingDays)`
- `isAllocationWithinEventRange(date, eventRange)`

**Justification (non-obvious):**

- Indicators are _signals_, not decisions; allowed as pure derived logic
- Deadline pressure explicitly defined as derived, non-enforcing

### Stateful

- `addAllocation(workCategoryId, date, hours)`

  - Validates references, normalizes input, persists

- `removeAllocation(allocationId)`
- `updateAllocation(allocationId, newValue)`
- `evaluateSchedule(eventId)`

  - evaluateSchedule must not persist indicators into core planning tables; it may only emit or populate derived/read models.

- `validateAllocationReferences(workCategoryId, eventId)`

  - Cross-module ID validation without business math

**Justification:**

- These coordinate user intent and validation but do not decide outcomes or auto-correct plans.

### IO

- `persistAllocation(allocation)`
- `loadAllocationsByEvent(eventId)`
- `loadAllocationsByWorkCategory(workCategoryId)`
- `getDemandByPeriod(eventId)`
- `storeEvaluationResult(eventId, indicators)` (if cached/read-model)

**Justification (conservative):**

- Even derived read models are persistence responsibilities.

---

## Resources Module

### Pure

- `calculateDailyCapacity(resource, date)`
- `calculatePeriodCapacity(resource, dateRange)`
- `applyAvailabilityConstraints(capacity, availabilityRules)`
- `validateCapacityValue(value)`

**Justification:**

- Capacity math is explicitly owned here and independent of demand.

### Stateful

- `createResource(definition)`
- `updateResourceCapacity(resourceId, capacityInput)`
- `updateAvailability(resourceId, rules)`
- `getResourceCapacity(resourceId, dateRange)`

  - The math is pure. The function is orchestration

**Justification (non-obvious):**

- Although it returns a number, the function itself is orchestration; the math must live in pure helpers.

### IO

- `loadResource(resourceId)`
- `listResources()`
- `persistResource(resource)`
- `loadAvailabilityRules(resourceId)`

---

## Cross-Module Boundary Enforcement (Implicit but Important)

### Pure (Shared / Contract-level)

- ID shape validation
- Schema validation (e.g. Zod schemas)

### Stateful

- Service adapters translating IDs → module calls
- Domain event handlers (reacting, not calculating)

### IO

- Event bus publishing
- Read-model materialization
