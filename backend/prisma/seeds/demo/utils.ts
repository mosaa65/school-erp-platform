export function asUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}
