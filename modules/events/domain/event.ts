export type EventId = string;
export type EventPhaseId = string;

export enum EventStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum EventPhaseName {
  ASSEMBLY = "ASSEMBLY",
  MOVE_IN = "MOVE_IN",
  MOVE_OUT = "MOVE_OUT",
  DISMANTLE = "DISMANTLE",
}

// Event phases are explanatory metadata only; they do not drive planning logic.
export interface EventPhase {
  id: EventPhaseId;
  eventId: EventId;
  name: EventPhaseName;
  startDate: string;
  endDate: string;
}

export interface Event {
  id: EventId;
  name: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  phases?: EventPhase[];
}
