**Planner-Control Invariants**

### 1. **Allocation control**

**Invariant:** The system must never create, modify, split, or delete an allocation unless explicitly invoked by a user action or an explicit, user-confirmed bulk operation.
**Rationale:** Prevents any form of implicit or background automation of effort placement.

---

### 2. **Allocation control**

**Invariant:** The system may only persist allocations that reference an existing Work Category ID and Event ID supplied by the caller.
**Rationale:** Ensures allocations cannot be inferred, synthesized, or redirected by internal logic.

---

### 3. **Scheduling behavior**

**Invariant:** The system must never automatically distribute estimated effort across time periods.
**Rationale:** Explicitly blocks auto-spreading, even if estimates and date ranges are known.

---

### 4. **Scheduling behavior**

**Invariant:** The system must never decide which days receive effort or how much effort is applied on those days.
**Rationale:** Protects human ownership of temporal planning decisions.

---

### 5. **Evaluation vs enforcement**

**Invariant:** Evaluation outputs (warnings, indicators, signals) must never mutate allocations, work estimates, capacities, or productivity data.
**Rationale:** Enforces a strict separation between feedback and control.

---

### 6. **Evaluation vs enforcement**

**Invariant:** The system must never block, reject, or auto-correct a plan based on evaluation results alone.
**Rationale:** Prevents “soft enforcement” disguised as validation.

---

### 7. **Evaluation vs enforcement**

**Invariant:** Deadline pressure, over/under-allocation, and overtime indicators must be computed as pure, derived values and must not be persisted as authoritative planning state.
**Rationale:** Ensures indicators remain advisory and inspectable.

---

### 8. **Data mutability & overrides**

**Invariant:** Manually entered allocations must always be persisted exactly as entered (after unit normalization), without later adjustment by the system.
**Rationale:** Guarantees manual overrides remain authoritative.

---

### 9. **Data mutability & overrides**

**Invariant:** The system must never reinterpret or “optimize” historical allocation data when assumptions (capacity, productivity, dates) change.
**Rationale:** Prevents silent retroactive planning changes.

---

### 10. **Cross-module authority**

**Invariant:** The Schedule module must never read or write Resource capacity data directly.
**Rationale:** Prevents hidden coupling that could enable automatic feasibility decisions.

---

### 11. **Cross-module authority**

**Invariant:** The Work module must never create or infer time-phased data from estimates.
**Rationale:** Protects the estimate as a non-temporal, non-directive input.

---

### 12. **Cross-module authority**

**Invariant:** The Productivity module must never persist, derive, or modify planning data.
**Rationale:** Keeps productivity as a pure assumption layer, not a planning authority.

---

### 13. **Scheduling behavior**

**Invariant:** Allocations must never be created outside the event date range defined by the Events module.
**Rationale:** Enforces a hard temporal boundary without implying scheduling decisions.

---

### 14. **Evaluation vs enforcement**

**Invariant:** Load, demand, and capacity comparisons must never result in automatic demand reduction or shifting.
**Rationale:** Explicitly blocks optimization logic creeping in via evaluation paths.

---

### 15. **Cross-module authority**

**Invariant:** No module may mutate another module’s data except through its published service interface.
**Rationale:** Prevents indirect authority escalation and “helpful” automation.

---

### 16. **Data mutability & overrides**

**Invariant:** The system must always allow users to create allocations that exceed capacity or estimates.
**Rationale:** Ensures feasibility is evaluated, not enforced.

---

### 17. **Scheduling behavior**

**Invariant:** UI components must never compute or suggest specific allocation values or dates including via defaults, presets, or recommendations..
**Rationale:** Prevents decision logic from leaking into the presentation layer.

---

### 18. **Evaluation vs enforcement**

**Invariant:** Any function labeled as “evaluate” must be side-effect free with respect to core planning tables.
**Rationale:** Makes enforcement violations detectable in code review and tests.
