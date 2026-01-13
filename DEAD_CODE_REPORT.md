# Dead/Unused Code Findings (Static Scan)

Notes: Findings are based on static reference search. Items with plausible indirect usage (dynamic imports, external routing/config) are marked with lower confidence and a note.

## app/components/EvaluationLegend.tsx
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| app/components/EvaluationLegend.tsx | EvaluationLegend | dead function | No in-repo imports/usages found | Medium | Could be loaded via `import()`/`next/dynamic()` by module path or via MDX/storybook config not visible in symbol search. |

## app/components/EvaluationSummary.tsx
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| app/components/EvaluationSummary.tsx | EvaluationSummary | dead function | No in-repo imports/usages found | Medium | Could be loaded via `import()`/`next/dynamic()` by module path or via MDX/storybook config not visible in symbol search. |

## app/components/layoutConstants.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| app/components/layoutConstants.ts | calculateLeftColumnsWidth | dead function | No in-repo imports/usages found | High | — |

## modules/events/api/events.routes.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/events/api/events.routes.ts | handleCreateEvent | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |
| modules/events/api/events.routes.ts | handleGetEventById | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |
| modules/events/api/events.routes.ts | handleListEvents | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |

## modules/events/domain/eventLogic.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/events/domain/eventLogic.ts | calculateEventDurationDays | dead function | No in-repo imports/usages found | Medium | — |

## modules/events/services/eventPhaseService.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/events/services/eventPhaseService.ts | listEventPhases | dead function | No in-repo imports/usages found | Low | Could be invoked by an external API layer or runtime config not present here. |

## modules/events/services/eventService.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/events/services/eventService.ts | updateEventDateRange | dead function | Only referenced by modules/events/api/events.routes.ts, which has no in-repo references | Low | If Express routes are wired externally, this can be indirectly used. |
| modules/events/services/eventService.ts | archiveEvent | dead function | Only referenced by modules/events/api/events.routes.ts, which has no in-repo references | Low | If Express routes are wired externally, this can be indirectly used. |

## modules/productivity/services/productivityService.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/productivity/services/productivityService.ts | getCurrentProductivityContext | dead function | No in-repo imports/usages found | Low | Could be consumed by external adapters/config not present in this repo. |
| modules/productivity/services/productivityService.ts | convertHoursToFte | dead function | No in-repo imports/usages found | Low | Could be consumed by external adapters/config not present in this repo. |

## modules/productivity/domain/productivity.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/productivity/domain/productivity.ts | convertHoursToFte | dead function | Only referenced by modules/productivity/services/productivityService.ts's unused convertHoursToFte | Low | If the service is used externally, this becomes indirectly used. |

## modules/schedule/domain/scheduleLogic.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/schedule/domain/scheduleLogic.ts | aggregatePeriodDemand | dead function | No in-repo imports/usages found | Low | Could be invoked by reporting/config-driven code outside this repo. |

## modules/work/api/work.routes.ts
| File | Symbol | Type | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| modules/work/api/work.routes.ts | handleCreateWorkCategory | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |
| modules/work/api/work.routes.ts | handleUpdateEstimate | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |
| modules/work/api/work.routes.ts | handleRenameWorkCategory | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |
| modules/work/api/work.routes.ts | handleListWorkCategoriesByEvent | dead function | No in-repo imports/usages found | Medium | Express-style handlers could be wired by external router/config outside this repo. |
