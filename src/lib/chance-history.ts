import { isoDayUtc } from "./format.ts";
import { isoShiftDays } from "./period.ts";
import type { ChanceHistoryPoint } from "../data/chance-history.ts";

/** Display window is independent of the model half-life. */
export const CHANCE_HISTORY_DAYS = 60;

export const CHANCE_MODEL_HALF_LIFE = 5;

export function chanceAxisStart(asOf: string, windowDays = CHANCE_HISTORY_DAYS): string {
  return isoShiftDays(asOf, -windowDays);
}

/** Points inside (asOf − window, asOf], sorted ascending. */
export function pointsInWindow(
  points: ChanceHistoryPoint[],
  asOf: string,
  windowDays = CHANCE_HISTORY_DAYS,
): ChanceHistoryPoint[] {
  const start = isoShiftDays(asOf, -windowDays);
  return points
    .filter((p) => p.date > start && p.date <= asOf)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type ChanceStepDay = {
  date: string;
  t: number;
  lula: number;
  flavio: number;
  publishedOn: string;
};

/**
 * Daily step series of stored chance (replay or promote). Holds the last
 * point's value through asOf on the chart.
 */
export function buildChanceStepSeries(
  points: ChanceHistoryPoint[],
  asOf: string,
  windowDays = CHANCE_HISTORY_DAYS,
): ChanceStepDay[] {
  const inWindow = pointsInWindow(points, asOf, windowDays);
  if (!inWindow.length) return [];

  const start = chanceAxisStart(asOf, windowDays);
  const first = inWindow[0]!;
  const seriesStart = first.date > start ? first.date : start;

  const rows: ChanceStepDay[] = [];
  let i = 0;
  let cursor = seriesStart;
  while (cursor <= asOf) {
    while (i + 1 < inWindow.length && inWindow[i + 1]!.date <= cursor) i++;
    const hit = inWindow[i]!;
    if (hit.date <= cursor) {
      rows.push({
        date: cursor,
        t: isoDayUtc(cursor),
        lula: hit.lula,
        flavio: hit.flavio,
        publishedOn: hit.date,
      });
    }
    cursor = isoShiftDays(cursor, 1);
  }
  return rows;
}

/** Upsert one published day. Same date replaces. Returns next points array. */
export function upsertChancePoint(
  points: ChanceHistoryPoint[],
  next: ChanceHistoryPoint,
): ChanceHistoryPoint[] {
  const row: ChanceHistoryPoint = {
    date: next.date,
    lula: Math.round(next.lula * 10) / 10,
    flavio: Math.round(next.flavio * 10) / 10,
    source: next.source,
    ...(next.commit ? { commit: next.commit } : {}),
  };
  const without = points.filter((p) => p.date !== row.date);
  return [...without, row].sort((a, b) => a.date.localeCompare(b.date));
}

/** Only a current estimate from the same model may update the current day. */
export function alignChanceWithCurrentModel(
  steps: ChanceStepDay[],
  asOf: string,
  halfLifeDays: number,
  current: { lula: number; flavio: number } | null,
): ChanceStepDay[] {
  if (halfLifeDays !== CHANCE_MODEL_HALF_LIFE || !current) return steps;
  if (!Number.isFinite(current.lula) || !Number.isFinite(current.flavio)) return steps;
  return steps.map((step) => step.date === asOf
    ? { ...step, lula: current.lula, flavio: current.flavio, publishedOn: asOf }
    : step);
}
