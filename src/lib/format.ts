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

/** Diferença a partir dos % já arredondados na tela. 39,64−34,99 → 4,6, não 4,7. */
export function shownGap(a: number, b: number, digits = 1): number {
  return round(round(a, digits) - round(b, digits), digits);
}

/** Teto da margem que o leitor entende (pesquisa, nao o SE inflado do modelo). */
export const TECHNICAL_TIE_CAP_PP = 3;

/** Empate tecnico: gap da tela cabe na margem E nao passa do teto de pesquisa. */
export function isShownTie(
  a: number,
  b: number,
  se: number,
  digits = 1,
  capPp = TECHNICAL_TIE_CAP_PP,
): boolean {
  const gap = Math.abs(shownGap(a, b, digits));
  if (gap > capPp) return false;
  return gap <= round(1.96 * se, digits);
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
