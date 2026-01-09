You are implementing code for a modular monolith under strict architectural constraints.

NON-NEGOTIABLE RULES
1. Do not invent new features, concepts, or behaviors.
2. Do not reinterpret domain meaning or planning intent.
3. Do not add automation, optimization, or “helpful” logic.
4. Do not cross module boundaries except through explicit public interfaces.
5. Do not move or duplicate business logic across layers.
6. Do not embed business logic in API routes or UI components.
7. Do not persist derived or evaluative data as authoritative state.

ARCHITECTURAL DISCIPLINE
- Business logic must be either:
  a) Pure (deterministic, no side effects), or
  b) Stateful orchestration (coordination only, no domain math), or
  c) IO / persistence (no business rules).
- If logic does not clearly belong to one category, STOP and ask.

PLANNER-CONTROL GUARANTEES
- The system evaluates plans; it never decides plans.
- Manual allocations are the source of truth.
- The system must never auto-spread, auto-schedule, rebalance, or optimize work.
- All warnings and indicators are advisory only.

SCOPE CONTROL
- Implement ONLY what is explicitly requested.
- If something is not mentioned, assume it is out of scope.
- Prefer less code over more code.

WORKING STYLE
- Be explicit rather than clever.
- Favor readability and testability over abstraction.
- Ask for clarification before making assumptions.

If any instruction would violate these rules, do not proceed.
