# Architecture Overview

This document defines the **non-negotiable architectural rules** for the system.
All implementation must conform to this file. If ambiguity arises, this file overrides assumptions.

---

## 1. System Shape

* **Architecture**: Modular monolith
* **Deployment**: Single backend, single database, single frontend
* **Modules** behave as independently deployable systems but are deployed together

There is:

* One Postgres database
* One Next.js application
* One backend (Next.js API routes)

---

## 2. Core Domain Modules

The system is organized around **domain modules**.
Each module **owns its data, logic, and rules**.

### Defined Modules

* **Events**
* **Work**
* **Schedule**
* **Resources**
* **Productivity**

No other domain modules may be introduced without explicit intent.

---

## 3. Module Ownership Rules (Hard Boundary)

Each module:

* Owns its **tables**
* Owns its **business logic**
* Owns its **validation rules**

### Forbidden Actions

* No module may directly access another module’s database tables
* No module may import internal logic from another module
* No deep cross-module joins for read-heavy views

### Allowed Interactions

* Service calls via explicit interfaces
* Domain events
* Passing IDs only (never rich internal objects)

---

## 4. Separation of Concerns (Non-Negotiable)

The system models **planning**, not execution automation.

### Domain Responsibility Split

* **Work**
  Defines *what* work exists and total estimated effort

* **Productivity**
  Defines *how fast* work can be done (rates, assumptions)

* **Schedule**
  Defines *when* effort is applied (time-phased allocations)

* **Resources**
  Defines *who or what* performs work and capacity limits

* **Events**
  Defines *which project/event* all data belongs to

No module may assume responsibility outside its definition.

---

## 5. Planning Model (Critical Rule Set)

### Primary Planning Surface

* Planning is **time-phased resource loading**
* The shared X-axis is **time (days or weeks)**
* Planning is performed by **manual allocation of effort**

### Effort Input

Effort may be entered as:

* Hours
* FTE (internally normalized to hours)

### Explicit Prohibitions

* The system must **never auto-spread work**
* The system must **never auto-reschedule allocations**
* The system must **never overwrite manual input**

Any automatic behavior must be:

* Explicitly requested
* Fully inspectable
* Reversible

---

## 6. Guardrails, Not Automation

The system provides **evaluation only**, not decisions.

Allowed system outputs:

* Capacity warnings
* Over / under-allocation indicators
* Deadline pressure signals
* Overtime indicators

Forbidden system behavior:

* Creating allocations
* Modifying allocations
* Enforcing schedules

---

## 7. Business Logic Rules

* All calculations must live in **pure functions or services**
* Business logic must be **testable in isolation**
* UI components must **never contain decision logic**

Examples of pure logic:

* Daily demand totals
* Capacity comparisons
* Productivity-adjusted effort calculations

---

## 8. Data & Read Models

* Each module owns its persistence logic
* Read-heavy planning views must use:

  * Derived models
  * Projections
  * Materialized views (if needed)

Deep cross-module joins are not allowed for planning surfaces.

---

## 9. Technology Constraints

* **Language**: TypeScript
* **Frontend**: React (Next.js)
* **Backend**: Node / Next.js API routes
* **Database**: Postgres
* **ORM**: Prisma (or equivalent)
* **Validation**: Shared schemas (e.g. Zod)

No alternative stacks or patterns may be introduced.

---

## 10. Design Philosophy (Implementation Guidance)

* Prefer explicit, readable code over abstraction-heavy solutions
* Optimize for maintainability and change
* Assume planning data is incomplete and frequently revised
* Manual overrides are first-class and must persist

---

## 11. Change Discipline

If implementation pressure suggests violating this document:

1. Stop
2. Make the assumption explicit
3. Revisit the architecture intentionally

Silent drift is not acceptable.
