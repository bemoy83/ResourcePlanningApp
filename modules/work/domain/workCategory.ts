export type WorkCategoryId = string & { readonly __brand: 'WorkCategoryId' };

export interface WorkCategory {
  id: WorkCategoryId;
  eventId: string;
  name: string;
  estimatedEffortHours: number;
  phase?: string;
}
