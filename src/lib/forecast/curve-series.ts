import { isoDayUtc, round } from "../format.ts";
import {
  buildWeightedRows,
  DEFAULT_CONFIG,
  type ForecastPoll,
} from "./engine.ts";

export type DayAverage = {
  date: string;
  t: number;
  lula: number;
  flavio: number;
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

export function asOfDayAverages(
  polls: ForecastPoll[],
  asOf: string,
  halfLifeDays: number,
  needSecond: boolean,
): DayAverage[] {
  const days = publicationDays(polls, asOf, needSecond);
  const out: DayAverage[] = [];
  for (const day of days) {
    const rows = buildWeightedRows(polls, {
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
    });
  }
  return out;
}
