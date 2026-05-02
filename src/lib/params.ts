export function parseIntParam(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${label}.`);
  }
  return parsed;
}
