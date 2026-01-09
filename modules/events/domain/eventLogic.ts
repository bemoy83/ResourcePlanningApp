export function isValidEventDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
}

export function calculateEventDurationDays(startDate: string, endDate: string): number {
  // Inclusive: counts both start and end calendar days
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const diffDays = (endUtc - startUtc) / (1000 * 60 * 60 * 24);
  return diffDays + 1;
}
