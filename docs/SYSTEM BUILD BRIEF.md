Trade Fair Resource Planning App — System Build Brief
System Purpose

Web application for estimating, planning, and managing resource demand for trade fair events.

Supports manual, time-phased allocation of effort based on workload, productivity, capacity, dependencies, and deadlines.

The system evaluates plans and provides feedback; humans retain full control over decisions.

Non-Negotiable Architectural Rules

Modular monolith

Single backend, single database, single frontend.

Internally split into domain modules that behave as if independently deployable.

Strict module boundaries

Each module owns its data models, persistence, and business logic.

No direct cross-module table access or internal logic calls.

Cross-module interaction only via:

Service interfaces

IDs

Domain events

Pure business logic

All calculations live in pure functions or domain services.

UI components contain no decision logic.

Separation of concerns

What work exists → Work module

How fast work is done → Productivity module

When effort is applied → Schedule module

Who/what performs work → Resources module

Event/project context → Events module

Planning Model Rules

Planning is resource loading, not task micromanagement.

Primary planning surface:

Time-phased demand board

Shared X-axis = time (days or weeks)

Effort allocation:

Manually entered per day

Supports uneven distributions

Units:

Hours

FTE (internally normalized to hours)

The system:

May evaluate allocations and show feedback

May normalize FTE → hours internally

The system may not:

Automatically spread work unless explicitly requested

Decide how much effort is applied or on which days

Work Band Rules

Work is grouped by category / task type, scoped to an event.

Rows represent event-specific work categories, not micro-tasks.

Work items have estimated total effort.

Allocations reference work categories, not individual tasks.

Guardrails (Not Automation)

The system provides:

Capacity warnings

Over/under-allocation indicators

Deadline pressure signals

Overtime indicators

The system evaluates plans but never enforces or auto-corrects them.

Module List & Responsibilities

Events

Trade fairs as projects

Event metadata, locations, date ranges

Work

Work categories and estimated effort per event

Productivity

Productivity rates and conversion rules

Schedule

Time-phased allocation of hours/FTE

Daily demand aggregation

Resources

Resource definitions and capacity inputs

Data Ownership Rules

Each module owns its own database tables.

Cross-module references use IDs only.

Planning views must rely on derived/read models.

Avoid deep cross-module joins in read-heavy paths.

Hard Prohibitions (Must Never Do)

Must never:

Force automatic scheduling or workload spreading

Embed business logic in UI components

Bypass module boundaries

Use “black box” planning logic

Introduce microservices

Add billing, quotation, or invoicing logic

Create generic “do everything” abstractions

Technology Constraints

Language: TypeScript

Frontend: React (Next.js)

Backend: Node / Next.js API routes

Database: Postgres

ORM/Data access: Prisma or equivalent

Validation: Shared schemas (e.g. Zod)

Implementation Guidance (Binding)

Always identify which module owns a feature before coding.

Prefer small, explicit, composable services.

Assume planning data is incomplete and frequently revised.

Manual overrides are expected and supported.

Assumptions must be explicit and inspectable.

Optimize for clarity, maintainability, and future change over cleverness or premature optimization.