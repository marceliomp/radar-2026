/** pt-BR number formatting — vírgula decimal, sem lixo de float. */

export function round(n: number, digits = 1): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  const r = Math.round((n + Number.EPSILON) * f) / f;
  // avoid -0
  return Object.is(r, -0) ? 0 : r;
}

/** 40.2 → "40,2" */
export function fmtNum(n: number, digits = 1): string {
  return round(n, digits).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 40.2 → "40,2%" */
export function fmtPct(n: number, digits = 1): string {
  return `${fmtNum(n, digits)}%`;
}

/** 0.884 → "88,4%" (probabilidade 0–1) */
export function fmtProb(p: number, digits = 1): string {
  return fmtPct(p * 100, digits);
}

/** +3.8 → "+3,8" · -4 → "−4,0" (minus tipográfico) */
export function fmtDelta(n: number, digits = 1): string {
  const r = round(n, digits);
  const body = fmtNum(Math.abs(r), digits);
  if (r > 0) return `+${body}`;
  if (r < 0) return `−${body}`;
  return body;
}

/** peso 1.28 → "1,28" */
export function fmtMult(n: number, digits = 2): string {
  return fmtNum(n, digits);
}
