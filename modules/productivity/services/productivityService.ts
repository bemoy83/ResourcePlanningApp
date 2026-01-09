import { getProductivityContext } from '../config/productivityConfig';
import {
  convertFteToHours as convertFteToHoursPure,
  convertHoursToFte as convertHoursToFtePure
} from '../domain/productivity';

export function getCurrentProductivityContext() {
  return getProductivityContext();
}

export function convertFteToHours(fte: number): number {
  const context = getProductivityContext();
  return convertFteToHoursPure(fte, context);
}

export function convertHoursToFte(hours: number): number {
  const context = getProductivityContext();
  return convertHoursToFtePure(hours, context);
}
