export type EventId = string;

export enum EventStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export interface Event {
  id: EventId;
  name: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
}
