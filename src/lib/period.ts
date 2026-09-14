/** Recência do Radar: meia-vida em dias. Default público = 15 dias. Teto 90. */
export const HL_MIN = 5;
export const HL_MAX = 90;
export const DEFAULT_HALF_LIFE = 15;
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

export function isoShiftDays(iso: string, days: number): string {
  const ms = new Date(iso + "T12:00:00").getTime() + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Eixo da curva pública: no máximo os últimos HL_MAX dias, nunca o ano civil. */
export function curveAxisStart(asOf: string): string {
  const start = isoShiftDays(asOf, -HL_MAX);
  return start > YEAR_START ? start : YEAR_START;
}
