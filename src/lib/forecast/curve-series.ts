import { isoDayUtc, round } from "../format.ts";
import {
  buildWeightedRows,
  DEFAULT_CONFIG,
  type ForecastPoll,
} from "./engine.ts";
import { resolveInstitute } from "./track-record.ts";

/** The day's polls plus the 6 days before it. */
export const CURVE_PERIOD_DAYS = 6;

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

function ageDays(fieldEnd: string, asOf: string): number {
  return Math.round((isoDayUtc(asOf) - isoDayUtc(fieldEnd)) / 86_400_000);
}

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

export function asOfDayAverages(
  polls: ForecastPoll[],
  asOf: string,
  halfLifeDays: number,
  needSecond: boolean,
): DayAverage[] {
  const days = publicationDays(polls, asOf, needSecond);
  const out: DayAverage[] = [];
  for (const day of days) {
    const windowed = polls.filter((poll) => {
      if (!poll.national) return false;
      const end = poll.fieldEnd || poll.date;
      if (end > day) return false;
      return ageDays(end, day) <= halfLifeDays;
    });
    const rows = buildWeightedRows(windowed, {
      ...DEFAULT_CONFIG,
      asOf: day,
      halfLifeDays,
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
