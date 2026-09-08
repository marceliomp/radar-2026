/** Recência do Radar: meia-vida em dias. Default = o ano até hoje. */
export const HL_MIN = 5;
export const HL_MAX = 365;
export const YEAR_START = "2026-01-01";

export function clampHalfLife(n: number): number {
  if (!Number.isFinite(n)) return HL_MIN;
  return Math.round(Math.min(HL_MAX, Math.max(HL_MIN, n)));
}

export function yearToDateDays(asOf: string): number {
  const ms =
    new Date(asOf + "T12:00:00").getTime() -
    new Date(YEAR_START + "T12:00:00").getTime();
  return clampHalfLife(Math.round(ms / (1000 * 60 * 60 * 24)));
}
