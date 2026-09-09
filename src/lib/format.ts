/** Number and date formatting. Default locale is pt-BR. */

import type { Locale } from "./i18n/locale.ts";
import { localeTag } from "./i18n/locale.ts";
import { messages } from "./i18n/messages.ts";

export function round(n: number, digits = 1): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  const r = Math.round((n + Number.EPSILON) * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

/** 40.2 → "40,2" (pt) or "40.2" (en) */
export function fmtNum(n: number, digits = 1, locale: Locale = "pt"): string {
  return round(n, digits).toLocaleString(localeTag(locale), {
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
export function fmtPct(n: number, digits = 1, locale: Locale = "pt"): string {
  return `${fmtNum(n, digits, locale)}%`;
}

/** 0.884 → "88,4%" (probabilidade 0–1) */
export function fmtProb(p: number, digits = 1, locale: Locale = "pt"): string {
  return fmtPct(p * 100, digits, locale);
}

/** +3.8 → "+3,8" · -4 → "−4,0" (minus tipográfico) */
export function fmtDelta(n: number, digits = 1, locale: Locale = "pt"): string {
  const r = round(n, digits);
  const body = fmtNum(Math.abs(r), digits, locale);
  if (r > 0) return `+${body}`;
  if (r < 0) return `−${body}`;
  return body;
}

/** peso 1.28 → "1,28" */
export function fmtMult(n: number, digits = 2, locale: Locale = "pt"): string {
  return fmtNum(n, digits, locale);
}

/** ISO YYYY-MM-DD → 01/09 */
export function dateBr(iso?: string | null): string {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

const MONTHS_BR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthName(monthIndex: number, locale: Locale): string {
  const names = locale === "en" ? MONTHS_EN : MONTHS_BR;
  return names[monthIndex] ?? "";
}

/** ISO YYYY-MM-DD → 01/09 (pt) or 1 Sep (en) */
export function dateShort(iso?: string | null, locale: Locale = "pt"): string {
  if (!iso || iso.length < 10) return "";
  if (locale === "en") {
    const d = Number(iso.slice(8, 10));
    const m = Number(iso.slice(5, 7));
    if (!Number.isFinite(d) || !Number.isFinite(m)) return "";
    return `${d} ${monthName(m - 1, "en")}`;
  }
  return dateBr(iso);
}

/** ISO YYYY-MM-DD → 01/09/2026 (pt) or 1 Sep 2026 (en) */
export function dateFull(iso?: string | null, locale: Locale = "pt"): string {
  if (!iso || iso.length < 10) return "";
  if (locale === "en") {
    const short = dateShort(iso, "en");
    return short ? `${short} ${iso.slice(0, 4)}` : "";
  }
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
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

export function utcMsToDay(ms: number, locale: Locale = "pt"): string {
  const t = Number(ms);
  if (!Number.isFinite(t)) return "";
  const dt = new Date(t);
  if (Number.isNaN(dt.getTime())) return "";
  if (locale === "en") {
    return `${dt.getUTCDate()} ${monthName(dt.getUTCMonth(), "en")}`;
  }
  return utcMsToDayBr(ms);
}

/** Epoch ms → jan, fev, mar. */
export function utcMsToMonthBr(ms: number): string {
  return utcMsToMonth(ms, "pt");
}

export function utcMsToMonth(ms: number, locale: Locale = "pt"): string {
  const t = Number(ms);
  if (!Number.isFinite(t)) return "";
  const dt = new Date(t);
  if (Number.isNaN(dt.getTime())) return "";
  return monthName(dt.getUTCMonth(), locale);
}

/** Só as datas: 30/08 a 01/09. Um dia só: 01/09. */
export function fieldRangeLabel(
  start?: string | null,
  end?: string | null,
  locale: Locale = "pt",
): string {
  const from = dateShort(start, locale);
  const to = dateShort(end, locale);
  const copy = messages(locale).format;
  if (from && to && from !== to) return copy.range(from, to);
  return to || from;
}

/** Linha pública do período: "Entrevistas de 30/08 a 01/09". */
export function fieldPeriodLine(
  start?: string | null,
  end?: string | null,
  locale: Locale = "pt",
): string {
  const from = dateShort(start, locale);
  const to = dateShort(end, locale);
  const copy = messages(locale).format;
  if (from && to && from !== to) return copy.interviewsRange(from, to);
  if (from && to) return copy.interviewsOn(to);
  if (to) return copy.interviewsOn(to);
  if (from) return copy.interviewsOn(from);
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
  locale: Locale = "pt",
): string {
  const t = pairTightness(aPct, bPct, moe);
  const copy = messages(locale).format;
  const left = `${aName} ${fmtPct(aPct, 1, locale)} × ${bName} ${fmtPct(bPct, 1, locale)}`;
  if (t.kind === "tie") return copy.tieHouse(left);
  const who = t.leader === "a" ? aName : bName;
  const unit = t.gap === 1 ? copy.ponto : copy.pontos;
  const where = t.kind === "inside" ? copy.inside : copy.outside;
  return copy.tightness(left, who, fmtNum(t.gap, 1, locale), unit, where, fmtNum(moe, 1, locale));
}
