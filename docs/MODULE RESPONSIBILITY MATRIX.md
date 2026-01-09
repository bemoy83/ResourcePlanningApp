Events Module

Owns

Event (trade fair) identity and lifecycle

Event metadata:

Event name

Location

Start and end dates

Timezone

Event validity rules:

Start date must be before end date

Date ranges define the maximum schedulable window

Calculations:

Event duration (days/weeks) derived from start/end dates

Exposes

Read-only event context by Event ID:

Date range

Location

Event status (e.g. active, archived)

Service operations such as:

getEvent(eventId)

listEvents()

Domain events such as:

Event created

Event date range changed

Must Not

Access work categories, effort estimates, or allocations

Contain productivity, capacity, or scheduling logic

Decide whether plans are feasible or “on track”

Modify or infer resource usage or demand

Work Module

Owns

Event-scoped work categories (work bands)

Estimated total effort per work category (in hours or FTE)

Work categorization rules:

Work is grouped by category, not micro-tasks

Work categories are scoped to exactly one event

Validation rules:

Estimated effort must be ≥ 0

Calculations:

None beyond simple totals explicitly stored

Exposes

Work category definitions by Event ID

Estimated effort per work category

Service operations such as:

getWorkCategories(eventId)

updateEstimatedEffort(workCategoryId, value)

Stable identifiers for use by Schedule allocations

Must Not

Access schedules, allocations, or time-phased data

Contain productivity rates or capacity assumptions

Spread, split, or normalize effort over time

Decide when work should be done

Productivity Module

Owns

Productivity rates (e.g. hours per FTE per day)

Conversion rules between units:

FTE ↔ hours

Productivity assumptions:

Standard working day definitions

Validation rules:

Rates must be positive and explicit

Calculations:

Pure conversions (e.g. 0.5 FTE → X hours/day)

Exposes

Stateless, pure services such as:

convertFteToHours(value, context)

convertHoursToFte(value, context)

Read-only productivity parameters

No persistence-dependent behavior required by consumers

Must Not

Access events, work categories, schedules, or resources

Contain deadlines, capacity checks, or planning evaluation

Make decisions about feasibility or overload

Store or mutate planning data

Schedule Module

Owns

Time-phased effort allocations:

Per day (or week)

Per work category

In hours (internally normalized)

Manual allocation entries

Aggregated daily demand totals

Validation rules:

Allocations must reference valid Work IDs and Event IDs

Allocations must fall within event date range

Calculations:

Daily and period demand aggregation

Normalization of FTE inputs to hours

Detection signals (not decisions):

Over/under-allocation indicators

Deadline pressure signals

Exposes

Read models for planning views:

Time-phased demand board data

Aggregated demand per day/week

Service operations such as:

addAllocation(workCategoryId, date, hours)

getDemandByPeriod(eventId)

Evaluation outputs as indicators only (warnings, flags)

Must Not

Automatically distribute or rebalance work

Decide optimal schedules or enforce corrections

Access resource definitions or capacity rules directly

Modify work estimates or productivity rates

Resources Module

Owns

Resource definitions:

People, teams, or generic capacity pools

Resource attributes:

Capacity inputs (e.g. available hours per day)

Availability constraints (e.g. non-working days)

Validation rules:

Capacity values must be ≥ 0

Calculations:

Total available capacity per period

Exposes

Capacity data by Resource ID and period

Service operations such as:

getResourceCapacity(resourceId, dateRange)

listResources()

Read-only capacity summaries for evaluation purposes

Must Not

Access schedules or allocation details

Decide whether demand should be reduced or shifted

Contain productivity conversion logic

Assign resources to specific work categories or dates