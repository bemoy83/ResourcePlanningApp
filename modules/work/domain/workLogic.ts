export function isValidEstimatedEffortHours(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function assertValidEstimatedEffortHours(value: number): void {
  if (!isValidEstimatedEffortHours(value)) {
    throw new Error('Estimated effort hours must be a finite number greater than or equal to 0');
  }
}
