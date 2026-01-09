“Manual Demand Planning with Capacity Evaluation (Single Event)”

What this slice proves

Manual allocations are the source of truth

Demand is time-phased

Capacity is passive and comparative

Evaluation produces signals, not decisions

Module boundaries hold under real use

In scope (explicit)
Modules involved

Events

Work

Schedule

Resources

Productivity (read-only conversions)

Capabilities included

1. Event setup

Create an Event with:

name

start date

end date

Event date range defines valid scheduling window

2. Work definition

Create Work Categories scoped to the Event

Set estimated total effort per Work Category (hours or FTE)

3. Resource capacity input

Define one or more Resources

Enter:

daily capacity (hours)

simple availability (e.g. working days only)

4. Manual allocation (core of the system)

Manually create allocations:

work category

date

effort (hours or FTE)

System:

validates references

normalizes units

persists exactly as entered

5. Demand aggregation

Aggregate daily demand across all work categories

Produce time-phased demand totals

6. Capacity comparison (evaluation only)

Compare demand vs capacity per day

Produce:

over/under-allocation indicators

no enforcement

no correction

Explicitly out of scope (important)

These are not allowed in the first slice:

Multiple events

Dependencies between work categories

Automatic spreading or rescheduling

Optimization or suggestions

Gantt charts or calendars

Actuals tracking beyond data model stubs

Multi-resource assignment logic

UI polish or drag-and-drop

Permissions, auth, or roles

If Claude tries to add any of these, it’s wrong.

Minimal UI expectations (very low bar)

Simple CRUD screens or forms are acceptable

Table view of:

dates

demand

capacity

indicators

No interaction intelligence in UI

UI exists only to exercise the model.

Success criteria (binary)

This slice is considered successful when:

A user can manually allocate effort across days

Allocations are stored exactly as entered

Daily demand is computed correctly

Capacity comparison produces visible warnings

Nothing is auto-corrected or optimized

If all five are true, the slice is done.
