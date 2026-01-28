export interface TooltipContent {
  eventName: string;
  phaseName: string;
  locationName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
}

export interface TooltipState {
  visible: boolean;
  content: TooltipContent;
  position: { top: number; left: number };
}
