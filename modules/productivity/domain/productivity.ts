import { ProductivityContext } from './productivityContext';

export function isValidProductivityContext(context: ProductivityContext): boolean {
  return Number.isFinite(context.hoursPerFtePerDay) && context.hoursPerFtePerDay > 0;
}

export function assertValidProductivityContext(context: ProductivityContext): void {
  if (!isValidProductivityContext(context)) {
    throw new Error('Invalid ProductivityContext');
  }
}

export function convertFteToHours(fte: number, context: ProductivityContext): number {
  return fte * context.hoursPerFtePerDay;
}

export function convertHoursToFte(hours: number, context: ProductivityContext): number {
  return hours / context.hoursPerFtePerDay;
}
