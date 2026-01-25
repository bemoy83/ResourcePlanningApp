"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { EventFilter } from "../../components/EventFilter";

type EventPhase = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

type PlanningEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  phases?: EventPhase[];
};

const DEFAULT_PHASES = ["ASSEMBLY", "MOVE_IN", "EVENT", "MOVE_OUT", "DISMANTLE"] as const;

const formatPhaseLabel = (phase: string) => {
  return phase
    .toLowerCase()
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ""))
    .join(" ");
};

const sortPhases = (phases: string[]) => {
  const order = new Map(DEFAULT_PHASES.map((name, index) => [name, index]));
  return [...phases].sort((a, b) => {
    const orderA = order.get(a) ?? 999;
    const orderB = order.get(b) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
};

export default function WorkCategoryPage() {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [name, setName] = useState("");
  const [estimatedEffortHours, setEstimatedEffortHours] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events");
        if (!res.ok) {
          throw new Error("Failed to load events");
        }
        const data: PlanningEvent[] = await res.json();
        const activeEvents = data.filter((event) => event.status === "ACTIVE");
        setEvents(activeEvents);
        setSelectedEventIds((current) => {
          if (activeEvents.length === 0) {
            return new Set();
          }
          const currentId = current.values().next().value as string | undefined;
          if (currentId && activeEvents.some((event) => event.id === currentId)) {
            return current;
          }
          return new Set([activeEvents[0].id]);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setIsLoading(false);
      }
    }

    loadEvents();
  }, []);

  const selectedEventId = useMemo(() => {
    const iterator = selectedEventIds.values();
    const first = iterator.next();
    return first.done ? "" : first.value;
  }, [selectedEventIds]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const phaseOptions = useMemo(() => {
    const phaseNames = selectedEvent?.phases?.map((phase) => phase.name) ?? [];
    const unique = Array.from(new Set(phaseNames.filter(Boolean)));
    const base = unique.length > 0 ? unique : [...DEFAULT_PHASES];
    return sortPhases(base);
  }, [selectedEvent]);

  useEffect(() => {
    if (phaseOptions.length === 0) {
      setSelectedPhase("");
      return;
    }
    setSelectedPhase((current) => (current && phaseOptions.includes(current) ? current : phaseOptions[0]));
  }, [phaseOptions]);

  const canSubmit =
    Boolean(selectedEventId) &&
    Boolean(selectedPhase) &&
    Boolean(name.trim()) &&
    estimatedEffortHours.trim() !== "" &&
    !isSaving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const hours = Number(estimatedEffortHours);
    if (!selectedEventId) {
      setError("Select an event before saving.");
      return;
    }
    if (!selectedPhase) {
      setError("Select a phase before saving.");
      return;
    }
    if (!name.trim()) {
      setError("Work category name is required.");
      return;
    }
    if (!Number.isFinite(hours) || hours < 0) {
      setError("Estimated effort hours must be a number greater than or equal to 0.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/work-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          name: name.trim(),
          estimatedEffortHours: hours,
          phase: selectedPhase,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create work category");
      }

      setSuccessMessage("Work category created.");
      setName("");
      setEstimatedEffortHours("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work category");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px", backgroundColor: "var(--bg-secondary)" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              fontWeight: 600,
            }}
          >
            Planning Tools
          </p>
          <h1 style={{ margin: "10px 0 0", fontSize: "28px", letterSpacing: "-0.02em" }}>
            Add Work Categories
          </h1>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/workspace"
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border-primary)",
              textDecoration: "none",
              color: "var(--text-primary)",
              backgroundColor: "var(--surface-default)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Workspace
          </Link>
          <Link
            href="/planning/work/import"
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border-primary)",
              textDecoration: "none",
              color: "var(--text-primary)",
              backgroundColor: "var(--surface-default)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Import work categories
          </Link>
          <Link
            href="/data/events/import"
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border-primary)",
              textDecoration: "none",
              color: "var(--text-primary)",
              backgroundColor: "var(--surface-default)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Import events
          </Link>
        </div>
      </header>

      <section
        style={{
          maxWidth: 720,
          width: "100%",
          backgroundColor: "var(--surface-default)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {isLoading ? (
          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            No active events found. Import events before adding work categories.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
              <span>Event</span>
              <EventFilter
                events={events}
                selectedEventIds={selectedEventIds}
                onSelectionChange={setSelectedEventIds}
                selectionMode="single"
                label="Event"
              />
            </div>

            <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
              Phase
              <select
                value={selectedPhase}
                onChange={(event) => setSelectedPhase(event.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-primary)",
                  backgroundColor: "var(--surface-default)",
                }}
              >
                {phaseOptions.map((phase) => (
                  <option key={phase} value={phase}>
                    {formatPhaseLabel(phase)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
              Work category name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Booth design, Keynote prep"
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-primary)",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
              Estimated effort hours
              <input
                value={estimatedEffortHours}
                onChange={(event) => setEstimatedEffortHours(event.target.value)}
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-primary)",
                }}
              />
            </label>

            {error && (
              <div style={{ color: "var(--status-error)", fontSize: "13px" }}>{error}</div>
            )}
            {successMessage && (
              <div style={{ color: "var(--status-success)", fontSize: "13px" }}>
                {successMessage}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" variant="primary" size="md" disabled={!canSubmit}>
                {isSaving ? "Saving..." : "Create work category"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
