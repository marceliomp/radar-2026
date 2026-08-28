import type { ForecastPoll } from "@/lib/forecast/engine";
import { round } from "@/lib/format";

export type TrendPoint = {
  id: string;
  date: string;
  published: string;
  fieldEnd: string;
  label: string;
  institute: string;
  mode: string;
  lula1: number;
  flavio1: number;
  gap1: number;
  lula2: number | null;
  flavio2: number | null;
  gap2: number | null;
};

export type HouseDelta = {
  institute: string;
  from: string;
  to: string;
  days: number;
  dLula1: number;
  dFlavio1: number;
  dGap1: number;
  dLula2: number | null;
  dFlavio2: number | null;
  dGap2: number | null;
  whoImproved1: "lula" | "flavio" | "tie";
  whoImproved2: "lula" | "flavio" | "tie" | "n/a";
};

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function shortHouse(name: string): string {
  const first = name.split("/")[0] ?? name;
  if (first === "Genial") return "Quaest";
  if (first === "PoderData") return "Poder";
  if (first === "Real Time Big Data") return "RTBD";
  return first.length > 8 ? `${first.slice(0, 7)}.` : first;
}

export function buildNationalTrend(polls: ForecastPoll[]): TrendPoint[] {
  const sorted = polls
    .filter((p) => p.national)
    .slice()
    .sort((a, b) => {
      const pub = a.date.localeCompare(b.date);
      if (pub !== 0) return pub;
      const field = a.fieldEnd.localeCompare(b.fieldEnd);
      if (field !== 0) return field;
      return a.id.localeCompare(b.id);
    });

  const pubCount = new Map<string, number>();
  for (const p of sorted) {
    pubCount.set(p.date, (pubCount.get(p.date) ?? 0) + 1);
  }

  return sorted.map((p) => {
    const lula1 = p.firstRound.lula ?? 0;
    const flavio1 = p.firstRound.flavio ?? 0;
    const lula2 = p.secondRound?.lula ?? null;
    const flavio2 = p.secondRound?.flavio ?? null;
    const pub = shortDate(p.date);
    const label =
      (pubCount.get(p.date) ?? 0) > 1
        ? `${pub} ${shortHouse(p.institute)}`
        : pub;
    return {
      id: p.id,
      date: p.date,
      published: p.date,
      fieldEnd: p.fieldEnd,
      label,
      institute: p.institute,
      mode: p.mode,
      lula1: round(lula1, 1),
      flavio1: round(flavio1, 1),
      gap1: round(lula1 - flavio1, 1),
      lula2: lula2 != null ? round(lula2, 1) : null,
      flavio2: flavio2 != null ? round(flavio2, 1) : null,
      gap2:
        lula2 != null && flavio2 != null ? round(lula2 - flavio2, 1) : null,
    };
  });
}

export function rollingAverage(points: TrendPoint[], k = 3) {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - k + 1), i + 1);
    const avg = (fn: (p: TrendPoint) => number) =>
      slice.reduce((s, p) => s + fn(p), 0) / slice.length;
    const with2 = slice.filter((p) => p.gap2 != null);
    return {
      ...points[i]!,
      lula1Avg: round(avg((p) => p.lula1), 2),
      flavio1Avg: round(avg((p) => p.flavio1), 2),
      gap1Avg: round(avg((p) => p.gap1), 2),
      lula2Avg:
        with2.length > 0
          ? round(
              with2.reduce((s, p) => s + (p.lula2 ?? 0), 0) / with2.length,
              2,
            )
          : null,
      flavio2Avg:
        with2.length > 0
          ? round(
              with2.reduce((s, p) => s + (p.flavio2 ?? 0), 0) / with2.length,
              2,
            )
          : null,
      gap2Avg:
        with2.length > 0
          ? round(
              with2.reduce((s, p) => s + (p.gap2 ?? 0), 0) / with2.length,
              2,
            )
          : null,
    };
  });
}

export function sameHouseDeltas(polls: ForecastPoll[]): HouseDelta[] {
  const byInst = new Map<string, ForecastPoll[]>();
  for (const p of polls.filter((x) => x.national)) {
    const arr = byInst.get(p.institute) ?? [];
    arr.push(p);
    byInst.set(p.institute, arr);
  }
  const out: HouseDelta[] = [];
  for (const [institute, arr] of byInst) {
    const sorted = arr
      .slice()
      .sort((a, b) => a.fieldEnd.localeCompare(b.fieldEnd));
    if (sorted.length < 2) continue;
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]!;
      const b = sorted[i]!;
      const dLula1 = round(
        (b.firstRound.lula ?? 0) - (a.firstRound.lula ?? 0),
        1,
      );
      const dFlavio1 = round(
        (b.firstRound.flavio ?? 0) - (a.firstRound.flavio ?? 0),
        1,
      );
      const gapA = (a.firstRound.lula ?? 0) - (a.firstRound.flavio ?? 0);
      const gapB = (b.firstRound.lula ?? 0) - (b.firstRound.flavio ?? 0);
      const dGap1 = round(gapB - gapA, 1);
      let dLula2: number | null = null;
      let dFlavio2: number | null = null;
      let dGap2: number | null = null;
      if (a.secondRound && b.secondRound) {
        dLula2 = round(b.secondRound.lula - a.secondRound.lula, 1);
        dFlavio2 = round(b.secondRound.flavio - a.secondRound.flavio, 1);
        dGap2 = round(
          b.secondRound.lula -
            b.secondRound.flavio -
            (a.secondRound.lula - a.secondRound.flavio),
          1,
        );
      }
      const days =
        (new Date(b.fieldEnd + "T12:00:00").getTime() -
          new Date(a.fieldEnd + "T12:00:00").getTime()) /
        86400000;
      out.push({
        institute,
        from: a.fieldEnd,
        to: b.fieldEnd,
        days: round(days, 0),
        dLula1,
        dFlavio1,
        dGap1,
        dLula2,
        dFlavio2,
        dGap2,
        whoImproved1:
          dFlavio1 - dLula1 > 0.3
            ? "flavio"
            : dLula1 - dFlavio1 > 0.3
              ? "lula"
              : "tie",
        whoImproved2:
          dFlavio2 == null || dLula2 == null
            ? "n/a"
            : dFlavio2 - dLula2 > 0.3
              ? "flavio"
              : dLula2 - dFlavio2 > 0.3
                ? "lula"
                : "tie",
      });
    }
  }
  return out.sort((a, b) => b.to.localeCompare(a.to));
}

export function windowMomentum(points: TrendPoint[]) {
  if (points.length < 2) {
    return {
      earlyGap1: 0,
      lateGap1: 0,
      dGap1: 0,
      earlyFlavio1: 0,
      lateFlavio1: 0,
      dFlavio1: 0,
      earlyLula1: 0,
      lateLula1: 0,
      dLula1: 0,
      earlyGap2: 0,
      lateGap2: 0,
      dGap2: 0,
      earlyFlavio2: 0,
      lateFlavio2: 0,
      dFlavio2: 0,
    };
  }
  const mid = Math.floor(points.length / 2);
  const early = points.slice(0, mid);
  const late = points.slice(mid);
  const mean = (arr: TrendPoint[], key: keyof TrendPoint) => {
    const vals = arr
      .map((p) => p[key])
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };
  const earlyGap1 = mean(early, "gap1");
  const lateGap1 = mean(late, "gap1");
  const earlyFlavio1 = mean(early, "flavio1");
  const lateFlavio1 = mean(late, "flavio1");
  const earlyLula1 = mean(early, "lula1");
  const lateLula1 = mean(late, "lula1");
  const earlyGap2 = mean(early, "gap2");
  const lateGap2 = mean(late, "gap2");
  const earlyFlavio2 = mean(early, "flavio2");
  const lateFlavio2 = mean(late, "flavio2");
  return {
    earlyGap1: round(earlyGap1, 1),
    lateGap1: round(lateGap1, 1),
    dGap1: round(lateGap1 - earlyGap1, 1),
    earlyFlavio1: round(earlyFlavio1, 1),
    lateFlavio1: round(lateFlavio1, 1),
    dFlavio1: round(lateFlavio1 - earlyFlavio1, 1),
    earlyLula1: round(earlyLula1, 1),
    lateLula1: round(lateLula1, 1),
    dLula1: round(lateLula1 - earlyLula1, 1),
    earlyGap2: round(earlyGap2, 1),
    lateGap2: round(lateGap2, 1),
    dGap2: round(lateGap2 - earlyGap2, 1),
    earlyFlavio2: round(earlyFlavio2, 1),
    lateFlavio2: round(lateFlavio2, 1),
    dFlavio2: round(lateFlavio2 - earlyFlavio2, 1),
  };
}

export { fmtDelta } from "@/lib/format";
