import { isoDayUtc, round } from "../format.ts";
import {
  buildWeightedRows,
  DEFAULT_CONFIG,
  dedupePolls,
  type ForecastPoll,
} from "./engine.ts";
import { resolveInstitute } from "./track-record.ts";

export type DayAverage = {
  date: string;
  t: number;
  lula: number;
  flavio: number;
  cury: number | null;
  renan: number | null;
  caiado: number | null;
  zema: number | null;
};

export function publicationDays(
  polls: ForecastPoll[],
  asOf: string,
  needSecond: boolean,
): string[] {
  const days = new Set<string>();
  for (const poll of polls) {
    if (!poll.national || poll.date > asOf || poll.fieldEnd > asOf) continue;
    if (needSecond) {
      if (poll.secondRound?.lula == null || poll.secondRound?.flavio == null) continue;
    } else if (poll.firstRound.lula == null || poll.firstRound.flavio == null) {
      continue;
    }
    days.add(poll.date);
  }
  return [...days].sort();
}

function meanAsked(
  rows: { weight: number; poll: ForecastPoll }[],
  key: "cury" | "renan" | "caiado" | "zema",
): number | null {
  let sum = 0;
  let sumW = 0;
  for (const row of rows) {
    const value = row.poll.firstRound[key];
    if (value == null || !Number.isFinite(value)) continue;
    sum += row.weight * value;
    sumW += row.weight;
  }
  if (sumW <= 0) return null;
  return round(sum / sumW, 2);
}

/** One point per publication day. Mean uses the same recency half-life as the chance. */
export function asOfDayAverages(
  polls: ForecastPoll[],
  asOf: string,
  halfLifeDays: number,
  needSecond: boolean,
): DayAverage[] {
  const days = publicationDays(polls, asOf, needSecond);
  const hl = Math.max(halfLifeDays, 1);
  const pool = dedupePolls(polls);
  const out: DayAverage[] = [];
  for (const day of days) {
    const rows = buildWeightedRows(pool, {
      ...DEFAULT_CONFIG,
      asOf: day,
      halfLifeDays: hl,
    });
    const subset = needSecond
      ? rows.filter((row) => row.adjLula2 != null && row.adjFlavio2 != null)
      : rows.filter(
          (row) =>
            row.poll.firstRound.lula != null && row.poll.firstRound.flavio != null,
        );
    const sumW = subset.reduce((sum, row) => sum + row.weight, 0);
    if (sumW <= 0) continue;
    const lula =
      subset.reduce(
        (sum, row) =>
          sum + row.weight * (needSecond ? (row.adjLula2 ?? 0) : row.adjLula1),
        0,
      ) / sumW;
    const flavio =
      subset.reduce(
        (sum, row) =>
          sum +
          row.weight * (needSecond ? (row.adjFlavio2 ?? 0) : row.adjFlavio1),
        0,
      ) / sumW;
    out.push({
      date: day,
      t: isoDayUtc(day),
      lula: round(lula, 2),
      flavio: round(flavio, 2),
      cury: needSecond ? null : meanAsked(subset, "cury"),
      renan: needSecond ? null : meanAsked(subset, "renan"),
      caiado: needSecond ? null : meanAsked(subset, "caiado"),
      zema: needSecond ? null : meanAsked(subset, "zema"),
    });
  }
  return out;
}

function mixNum(a: number, b: number, w: number): number {
  return round(a + (b - a) * w, 2);
}

function mixAsked(a: number | null, b: number | null, w: number): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return mixNum(a, b, w);
}

/** Daily series for the chart line. Interpolates between publication days; holds after the last poll. */
export function densifyDayAverages(
  days: DayAverage[],
  toIso: string,
): DayAverage[] {
  if (days.length === 0) return [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const out: DayAverage[] = [];
  let cursor = sorted[0]!.date;
  let i = 0;
  while (cursor <= toIso) {
    while (i < sorted.length - 1 && sorted[i + 1]!.date <= cursor) i++;
    const left = sorted[i]!;
    const right = sorted[i + 1];
    if (!right || cursor <= left.date) {
      out.push({ ...left, date: cursor, t: isoDayUtc(cursor) });
    } else if (cursor >= right.date) {
      out.push({ ...right, date: cursor, t: isoDayUtc(cursor) });
    } else {
      const span = isoDayUtc(right.date) - isoDayUtc(left.date);
      const w = span <= 0 ? 0 : (isoDayUtc(cursor) - isoDayUtc(left.date)) / span;
      out.push({
        date: cursor,
        t: isoDayUtc(cursor),
        lula: mixNum(left.lula, right.lula, w),
        flavio: mixNum(left.flavio, right.flavio, w),
        cury: mixAsked(left.cury, right.cury, w),
        renan: mixAsked(left.renan, right.renan, w),
        caiado: mixAsked(left.caiado, right.caiado, w),
        zema: mixAsked(left.zema, right.zema, w),
      });
    }
    const next = new Date(`${cursor}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return out;
}

/** Round a Y domain to even 4pp ticks so the axis does not look handmade. */
export function niceYDomain(
  domain: [number, number],
  fallback: [number, number],
): [number, number] {
  const lo = Math.max(0, Math.floor(domain[0] / 4) * 4);
  const hi = Math.min(100, Math.ceil(domain[1] / 4) * 4);
  if (hi - lo < 8) return fallback;
  return [lo, hi];
}

export function axisTicks(values: number[], maxTicks = 6): number[] {
  const unique = [...new Set(values.filter((ms) => Number.isFinite(ms)))].sort(
    (a, b) => a - b,
  );
  if (unique.length <= maxTicks) return unique;
  const first = unique[0]!;
  const last = unique[unique.length - 1]!;
  const picked: number[] = [];
  for (let i = 0; i < maxTicks; i++) {
    const target = first + ((last - first) * i) / (maxTicks - 1);
    let best = first;
    let bestD = Infinity;
    for (const ms of unique) {
      const d = Math.abs(ms - target);
      if (d < bestD) {
        best = ms;
        bestD = d;
      }
    }
    if (picked[picked.length - 1] !== best) picked.push(best);
  }
  if (picked[0] !== first) picked.unshift(first);
  if (picked[picked.length - 1] !== last) picked.push(last);
  return [...new Set(picked)].sort((a, b) => a - b);
}

/** Tight Y range around the race, 2pp steps, with padding. */
export function paddedDomain(
  values: Iterable<number | null | undefined>,
  fallback: [number, number],
): [number, number] {
  const nums: number[] = [];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) nums.push(value);
  }
  if (nums.length < 2) return fallback;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const pad = Math.max(2, (hi - lo) * 0.14);
  const min = Math.max(0, Math.floor((lo - pad) / 2) * 2);
  const max = Math.min(100, Math.ceil((hi + pad) / 2) * 2);
  if (max - min < 8) return fallback;
  return [min, max];
}

/** First of each month from fromIso through toIso. */
export function monthTicks(fromIso: string, toIso: string): number[] {
  const from = isoDayUtc(fromIso);
  const to = isoDayUtc(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  const y = Number(fromIso.slice(0, 4));
  const m0 = Number(fromIso.slice(5, 7)) - 1;
  if (![y, m0].every(Number.isFinite)) return [];
  const ticks: number[] = [];
  for (let month = 0; ; month++) {
    const t = Date.UTC(y, m0 + month, 1);
    if (t > to) break;
    if (t >= from) ticks.push(t);
  }
  return ticks;
}

export function houseFilterKey(name: string): string {
  const resolved = resolveInstitute(name);
  if (resolved === "Genial/Quaest" || resolved === "Quaest") return "Quaest";
  if (resolved.startsWith("PoderData")) return "PoderData";
  if (resolved === "Real Time Big Data") return "RTBD";
  if (resolved.startsWith("Nexus")) return "Nexus";
  if (resolved.startsWith("Futura")) return "Futura";
  if (resolved.startsWith("Atlas")) return "AtlasIntel";
  return resolved.split("/")[0] ?? resolved;
}

export type ModeFilterKey = "presencial" | "telefone" | "online" | "modelo";

export function modeFilterKey(mode: string): ModeFilterKey {
  if (mode === "telefone" || mode === "remoto") return "telefone";
  if (mode === "online") return "online";
  if (mode === "modelo") return "modelo";
  return "presencial";
}

export function modeFilterLabel(key: ModeFilterKey): string {
  if (key === "telefone") return "Telefone";
  if (key === "online") return "Online";
  if (key === "modelo") return "Modelo";
  return "Presencial";
}

const MODE_ORDER: ModeFilterKey[] = [
  "presencial",
  "telefone",
  "online",
  "modelo",
];

export function modeFilterOptions(
  polls: { mode: string }[],
): ModeFilterKey[] {
  const n = new Map<ModeFilterKey, number>();
  for (const poll of polls) {
    const key = modeFilterKey(poll.mode);
    n.set(key, (n.get(key) ?? 0) + 1);
  }
  return MODE_ORDER.filter((key) => (n.get(key) ?? 0) >= 1);
}

export function houseFilterOptions(
  polls: { institute: string }[],
): string[] {
  const n = new Map<string, number>();
  for (const poll of polls) {
    const key = houseFilterKey(poll.institute);
    n.set(key, (n.get(key) ?? 0) + 1);
  }
  return [...n.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}
