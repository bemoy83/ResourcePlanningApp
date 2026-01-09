Trade Fair Resource Planning App

You are helping build a trade fair event resource planning web application.

The system is not a single mega-feature app, but a modular monolith designed to grow over time.

Primary goal

Help planners estimate, plan, and manage resource demand for trade fair events, based on workload, productivity rates, capacity, dependencies, and deadlines — while keeping human planners in control of when and how work is applied.

Core architectural principles (non-negotiable)
1. Modular boundaries first

The codebase is organized into domain modules (e.g. Work, Schedule, Resources, Productivity, Events).

Each module owns its own data models, services, and business logic.

Other modules interact only through exposed service interfaces or domain events, never by directly accessing internal tables or logic.

2. Modular monolith, single deployment

There is one backend, one database, one frontend.

Modules must behave as if they could be standalone later, but are deployed together for simplicity.

3. Business logic is pure and testable

Calculations (hours, FTE, capacity, productivity, dependencies, demand totals) live in pure functions or services.

UI components do not contain decision logic — they display, edit, and visualize data.

4. Clear separation of concerns

What work exists → Work module

How fast work is done → Productivity module

When effort is applied → Schedule module

Who/what performs work → Resources module

Which event everything belongs to → Events module

Planning model (important domain rule)

This system is built around resource loading, not rigid task micromanagement.

The primary planning surface is a time-phased demand board, not a traditional calendar or Gantt chart.

The shared X-axis is time (days or weeks).

Planning happens by manually allocating effort (hours or FTE) per day.

The system supports uneven, manual distributions of work across days.

Planners remain in control of:

how much effort is applied

on which days

with or without overtime

Work Band principles

Work is grouped by task type / category, scoped to an event/project.

Rows represent event-specific work categories, not individual micro-tasks.

Users may input effort as:

hours, or

FTE (normalized internally to hours)

The system must never force automatic spreading of work unless explicitly requested.

Guardrails, not automation

The system provides feedback, not commands:

capacity warnings

over/under-allocation

deadline pressure

overtime indicators

The system does not decide the plan — it evaluates it.

Design philosophy
Design for change, not cleverness

Prefer explicit, readable code over abstraction-heavy or magical solutions.

Optimize for maintainability and extensibility, not premature performance or algorithmic perfection.

Respect real-world planning

Planning data may be incomplete or revised frequently.

Manual overrides are expected and supported.

Assumptions should be explicit and inspectable.

Technology constraints

Language: TypeScript

Frontend: React (Next.js)

Backend: Node / Next.js API routes

Database: Postgres (via Prisma or equivalent)

Validation: Shared schemas (e.g. Zod)

Data ownership rules

Each module owns its tables and persistence logic.

Cross-module communication happens via IDs, service calls, or domain events.

Read-heavy planning views must use derived/read models, not deep cross-module joins.

Initial scope (MVP bias)

Events (trade fairs as projects)

Locations and event date ranges (importable from Excel)

Work items grouped by category with estimated total hours

Manual time-phased allocation of hours / FTE

Daily demand totals and basic capacity comparison

Tracking actual hours vs estimates

Explicit non-goals (for now)

Quotation, invoicing, or billing logic

Over-engineered microservices

Fully generic “do everything” abstractions

Fully automated scheduling or “black box” planning logic

When generating code

Always ask: Which module does this belong to?

Assume planners want control first, assistance second.

Prefer small, composable services over large all-in-one classes.

Assume the system will grow to handle many events, many resources, and evolving rules.

Build this system as if a different developer will maintain it in 2 years —
and they should thank you for its clarity.