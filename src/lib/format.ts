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

/** ISO YYYY-MM-DD → 01/09 */
export function dateBr(iso?: string | null): string {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Date-only UTC ms so the curve axis does not shift the calendar day. */
export function isoDayUtc(iso: string): number {
  if (!iso || iso.length < 10) return Number.NaN;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (![y, m, d].every(Number.isFinite)) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

/** Epoch ms → 01/09 in UTC. */
export function utcMsToDayBr(ms: number): string {
  const t = Number(ms);
  if (!Number.isFinite(t)) return "";
  const dt = new Date(t);
  if (Number.isNaN(dt.getTime())) return "";
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

/** Só as datas: 30/08 a 01/09. Sem início, "até 01/09". */
export function fieldRangeLabel(start?: string | null, end?: string | null): string {
  const from = dateBr(start);
  const to = dateBr(end);
  if (from && to && from !== to) return `${from} a ${to}`;
  if (to) return from === to ? to : `até ${to}`;
  return from;
}

/** Linha pública do período: "Entrevistas de 30/08 a 01/09". */
export function fieldPeriodLine(start?: string | null, end?: string | null): string {
  const from = dateBr(start);
  const to = dateBr(end);
  if (from && to && from !== to) return `Entrevistas de ${from} a ${to}`;
  if (from && to) return `Entrevistas em ${to}`;
  if (to) return `Entrevistas até ${to}`;
  if (from) return `Entrevistas a partir de ${from}`;
  return "";
}

export type PairTightnessKind = "tie" | "inside" | "outside";

/** Aperto do 2º na ficha da casa: percents e moe dela, sem inventar. */
export function pairTightness(
  aPct: number,
  bPct: number,
  moe: number,
): { kind: PairTightnessKind; gap: number; leader: "a" | "b" | "tie" } {
  const gap = round(Math.abs(aPct - bPct), 1);
  const margin = round(Math.abs(moe), 1);
  if (gap === 0) return { kind: "tie", gap: 0, leader: "tie" };
  const leader = aPct >= bPct ? "a" : "b";
  if (gap <= margin) return { kind: "inside", gap, leader };
  return { kind: "outside", gap, leader };
}

export function pairTightnessLine(
  aName: string,
  bName: string,
  aPct: number,
  bPct: number,
  moe: number,
): string {
  const t = pairTightness(aPct, bPct, moe);
  const left = `${aName} ${fmtPct(aPct)} × ${bName} ${fmtPct(bPct)}`;
  if (t.kind === "tie") return `${left}: empate nesta casa.`;
  const who = t.leader === "a" ? aName : bName;
  const unit = t.gap === 1 ? "ponto" : "pontos";
  const where = t.kind === "inside" ? "dentro da margem" : "fora da margem";
  return `${left}: ${who} com ${fmtNum(t.gap)} ${unit} de vantagem, ${where} de ${fmtNum(moe)}.`;
}
