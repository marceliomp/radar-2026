/**
 * Agregador estadual: governador e senador.
 * Mesmo espírito do presidente: recência · √n · modo · quality (MAE).
 * Não altera o motor presidencial.
 */

import {
  recencyWeight,
  sampleWeight,
  modeWeight,
  gapSe,
  type PollMode,
} from "./engine.ts";
import { trackQuality } from "./track-record.ts";
import { round } from "../format.ts";

export type { PollMode };

export type RaceOffice = "governor" | "senator";

export type RacePoll = {
  id: string;
  office: RaceOffice;
  uf: string;
  institute: string;
  date: string;
  fieldEnd: string;
  sample: number;
  moe: number;
  mode: PollMode;
  firstRound: Record<string, number>;
  secondRound?: Record<string, number>;
  notes?: string;
};

export type RaceCandidate = { slug: string; name: string; party: string };

export type RaceMean = { mean: number; se: number };

export type RaceForecastConfig = {
  office: RaceOffice;
  uf: string;
  asOf: string;
  halfLifeDays?: number;
  simulations?: number;
  extraVarPp?: number;
  includeOnline?: boolean;
  includeRemoto?: boolean;
  includeModelo?: boolean;
  useTrackRecord?: boolean;
};

export type RaceForecastResult = {
  first: Record<string, RaceMean>;
  ordered: { slug: string; mean: number; se: number }[];
  probs: Record<string, number>;
  goesToSecond?: number;
  rows: { poll: RacePoll; weight: number; weightShare: number }[];
};

const DEFAULT_HALF_LIFE = 14;
const DEFAULT_SIMS = 4000;
const DEFAULT_EXTRA_VAR = 1.15;

/** Variância mínima do 1º. Uma casa só não fecha a cadeira (se=8 / se=4). */
function varFloor(nPolls: number): number {
  if (nPolls <= 1) return 64;
  if (nPolls === 2) return 16;
  return 0.25;
}

/** House + campanha restante quando há poucas urnas de casa. */
function extraVarForPolls(nPolls: number, extraVarPp: number): number {
  if (nPolls <= 1) return extraVarPp + 6;
  if (nPolls === 2) return extraVarPp + 2.5;
  return extraVarPp;
}

/** Mistura leve rumo a 50/50 no par do 2º. Uma Quaest não vira 100,0%. */
function pairLambda(nPolls: number): number {
  if (nPolls <= 1) return 0.04;
  if (nPolls === 2) return 0.02;
  return 0;
}

type ResolvedCfg = {
  office: RaceOffice;
  uf: string;
  asOf: string;
  halfLifeDays: number;
  simulations: number;
  extraVarPp: number;
  includeOnline: boolean;
  includeRemoto: boolean;
  includeModelo: boolean;
  useTrackRecord: boolean;
};

function resolveCfg(cfg: RaceForecastConfig): ResolvedCfg {
  return {
    office: cfg.office,
    uf: cfg.uf,
    asOf: cfg.asOf,
    halfLifeDays: cfg.halfLifeDays ?? DEFAULT_HALF_LIFE,
    simulations: cfg.simulations ?? DEFAULT_SIMS,
    extraVarPp: cfg.extraVarPp ?? DEFAULT_EXTRA_VAR,
    includeOnline: cfg.includeOnline ?? true,
    includeRemoto: cfg.includeRemoto ?? true,
    includeModelo: cfg.includeModelo ?? false,
    useTrackRecord: cfg.useTrackRecord ?? true,
  };
}

function pollPassesFilter(poll: RacePoll, cfg: ResolvedCfg): boolean {
  if (poll.office !== cfg.office) return false;
  if (poll.uf !== cfg.uf) return false;
  if (poll.mode === "online" && !cfg.includeOnline) return false;
  if (
    (poll.mode === "remoto" || poll.mode === "telefone") &&
    !cfg.includeRemoto
  ) {
    return false;
  }
  if (poll.mode === "modelo" && !cfg.includeModelo) return false;
  if (poll.date > cfg.asOf || poll.fieldEnd > cfg.asOf) return false;
  return true;
}

function weightedMeanVar(
  values: number[],
  weights: number[],
  moes: number[],
): RaceMean {
  const n = values.length;
  if (!n) return { mean: 0, se: 0 };
  const sumW = weights.reduce((s, w) => s + w, 0) || 1;
  const mean = values.reduce((s, v, i) => s + v * weights[i]!, 0) / sumW;
  const between =
    values.reduce((s, v, i) => s + weights[i]! * (v - mean) ** 2, 0) / sumW;
  const avgSamp =
    moes.reduce((s, m, i) => s + weights[i]! * (m / 1.96) ** 2, 0) / sumW;
  const se = Math.sqrt(
    Math.max(between + avgSamp * 0.5, varFloor(n)),
  );
  return { mean: round(mean, 2), se: round(se, 3) };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function emptyResult(slugs: string[]): RaceForecastResult {
  const first: Record<string, RaceMean> = {};
  for (const slug of slugs) first[slug] = { mean: 0, se: 0 };
  return { first, ordered: [], probs: {}, rows: [] };
}

function buildRows(
  polls: RacePoll[],
  cfg: ResolvedCfg,
): RaceForecastResult["rows"] {
  const eligible = polls.filter((p) => pollPassesFilter(p, cfg));
  const raw = eligible.map((poll) => {
    const wRecency = recencyWeight(poll.fieldEnd, cfg.asOf, cfg.halfLifeDays);
    const wSample = sampleWeight(poll.sample);
    const wMode = modeWeight(poll.mode);
    const wTrack = cfg.useTrackRecord ? trackQuality(poll.institute) : 1;
    const weight = wRecency * wSample * wMode * wTrack;
    return { poll, weight };
  });
  const sumW = raw.reduce((s, wrow) => s + wrow.weight, 0) || 1;
  return raw
    .map((r) => ({
      poll: r.poll,
      weight: r.weight,
      weightShare: round(r.weight / sumW, 4),
    }))
    .sort((a, b) => b.weight - a.weight);
}

function aggregateFirst(
  rows: RaceForecastResult["rows"],
  slugs: string[],
): Record<string, RaceMean> {
  const first: Record<string, RaceMean> = {};
  for (const slug of slugs) {
    const subset = rows.filter((r) => r.poll.firstRound[slug] != null);
    if (!subset.length) {
      first[slug] = { mean: 0, se: 0 };
      continue;
    }
    first[slug] = weightedMeanVar(
      subset.map((r) => r.poll.firstRound[slug]!),
      subset.map((r) => r.weight),
      subset.map((r) => r.poll.moe),
    );
  }
  return first;
}

function orderFirst(
  first: Record<string, RaceMean>,
  slugs: string[],
  rows: RaceForecastResult["rows"],
): RaceForecastResult["ordered"] {
  return slugs
    .filter((slug) => rows.some((r) => r.poll.firstRound[slug] != null))
    .map((slug) => ({ slug, mean: first[slug]!.mean, se: first[slug]!.se }))
    .sort((a, b) => b.mean - a.mean || a.slug.localeCompare(b.slug));
}

function runoffPair(
  rows: RaceForecastResult["rows"],
  ordered: RaceForecastResult["ordered"],
): [string, string] | null {
  if (ordered.length < 2) return null;
  const topA = ordered[0]!.slug;
  const topB = ordered[1]!.slug;
  const with2 = rows.filter((r) => {
    const keys = Object.keys(r.poll.secondRound ?? {});
    return keys.length >= 2;
  });
  const matching = with2.filter((r) => {
    const sr = r.poll.secondRound!;
    return sr[topA] != null && sr[topB] != null;
  });
  if (matching.length || !with2.length) return [topA, topB];
  const sr = with2[0]!.poll.secondRound!;
  const keys = Object.keys(sr).sort((a, b) => (sr[b] ?? 0) - (sr[a] ?? 0));
  return [keys[0]!, keys[1]!];
}

function aggregateSecond(
  rows: RaceForecastResult["rows"],
  a: string,
  b: string,
  first: Record<string, RaceMean>,
  extraVarPp: number,
): { gap: number; seGap: number } {
  const with2 = rows.filter(
    (r) =>
      r.poll.secondRound &&
      r.poll.secondRound[a] != null &&
      r.poll.secondRound[b] != null,
  );
  if (with2.length) {
    const w = with2.map((r) => r.weight);
    const moe = with2.map((r) => r.poll.moe);
    const aggA = weightedMeanVar(
      with2.map((r) => r.poll.secondRound![a] ?? 0),
      w,
      moe,
    );
    const aggB = weightedMeanVar(
      with2.map((r) => r.poll.secondRound![b] ?? 0),
      w,
      moe,
    );
    return {
      gap: aggA.mean - aggB.mean,
      seGap: gapSe(aggA.se, aggB.se, extraVarPp, -0.85),
    };
  }
  const mA = first[a]?.mean ?? 0;
  const mB = first[b]?.mean ?? 0;
  const tot = Math.max(mA + mB, 1);
  const twoA = (mA / tot) * 100;
  const twoB = (mB / tot) * 100;
  return {
    gap: twoA - twoB,
    seGap: gapSe(first[a]?.se ?? 2, first[b]?.se ?? 2, extraVarPp, -0.85),
  };
}

function simulateGovernor(
  first: Record<string, RaceMean>,
  ordered: RaceForecastResult["ordered"],
  rows: RaceForecastResult["rows"],
  slugs: string[],
  cfg: ResolvedCfg,
): { probs: Record<string, number>; goesToSecond: number } {
  const n = cfg.simulations;
  const wins: Record<string, number> = {};
  for (const slug of slugs) wins[slug] = 0;
  if (!ordered.length) {
    return { probs: {}, goesToSecond: 0 };
  }

  const pair = runoffPair(rows, ordered);
  const a = pair?.[0] ?? ordered[0]!.slug;
  const b = pair?.[1];
  const mA = first[a]?.mean ?? 0;
  const mB = b != null ? (first[b]?.mean ?? 0) : 0;
  const seA = first[a]?.se ?? 2;
  const seB = b != null ? (first[b]?.se ?? 2) : 2;
  const othersMean = Math.max(0, 100 - mA - mB);
  const gap1 = mA - mB;
  const seG1 = b != null ? gapSe(seA, seB, cfg.extraVarPp) : Math.max(seA, 0.5);
  const second =
    b != null ? aggregateSecond(rows, a, b, first, cfg.extraVarPp) : null;

  const rng = mulberry32(20260811);
  let toSecond = 0;

  for (let i = 0; i < n; i++) {
    if (b == null) {
      const share = mA + seG1 * randn(rng);
      if (share >= 50) wins[a]!++;
      else toSecond++;
      continue;
    }
    const g1 = gap1 + seG1 * randn(rng);
    const mid = (mA + mB) / 2;
    let A1 = mid + g1 / 2;
    let B1 = mid - g1 / 2;
    const tot1 = Math.max(A1 + B1 + othersMean, 1);
    A1 = (A1 / tot1) * 100;
    B1 = (B1 / tot1) * 100;
    if (A1 >= 50) {
      wins[a]!++;
      continue;
    }
    if (B1 >= 50) {
      wins[b]!++;
      continue;
    }
    toSecond++;
    const g2 = second!.gap + second!.seGap * randn(rng);
    if (g2 >= 0) wins[a]!++;
    else wins[b]!++;
  }

  const probs: Record<string, number> = {};
  for (const slug of slugs) probs[slug] = round(wins[slug]! / n, 4);
  const lambda = pairLambda(rows.length);
  if (lambda > 0 && b != null) {
    probs[a] = round(probs[a]! * (1 - lambda) + 0.5 * lambda, 4);
    probs[b] = round(probs[b]! * (1 - lambda) + 0.5 * lambda, 4);
  }
  return { probs, goesToSecond: round(toSecond / n, 4) };
}

function simulateSenator(
  first: Record<string, RaceMean>,
  slugs: string[],
  cfg: ResolvedCfg,
): Record<string, number> {
  const n = cfg.simulations;
  const seats: Record<string, number> = {};
  for (const slug of slugs) seats[slug] = 0;
  const active = slugs.filter(
    (slug) => (first[slug]?.mean ?? 0) > 0 || (first[slug]?.se ?? 0) > 0,
  );
  if (!active.length) return seats;

  const rng = mulberry32(20260829);
  const extra = cfg.extraVarPp ** 2;

  for (let i = 0; i < n; i++) {
    const draws = active.map((slug) => {
      const { mean, se } = first[slug]!;
      const seSim = Math.sqrt(se * se + extra);
      return { slug, share: Math.max(0, mean + seSim * randn(rng)) };
    });
    const tot = draws.reduce((s, d) => s + d.share, 0) || 1;
    draws.forEach((d) => {
      d.share = (d.share / tot) * 100;
    });
    draws.sort((x, y) => y.share - x.share || x.slug.localeCompare(y.slug));
    const top = draws.slice(0, Math.min(2, draws.length));
    for (const d of top) seats[d.slug]!++;
  }

  const probs: Record<string, number> = {};
  for (const slug of slugs) probs[slug] = round(seats[slug]! / n, 4);
  return probs;
}

export function runRaceForecast(
  polls: RacePoll[],
  candidates: RaceCandidate[],
  cfg: RaceForecastConfig,
): RaceForecastResult {
  const resolved = resolveCfg(cfg);
  const slugs = candidates.map((c) => c.slug);
  const rows = buildRows(polls, resolved);

  if (!rows.length) return emptyResult(slugs);

  resolved.extraVarPp = extraVarForPolls(rows.length, resolved.extraVarPp);

  const first = aggregateFirst(rows, slugs);
  const ordered = orderFirst(first, slugs, rows);

  if (resolved.office === "governor") {
    const { probs, goesToSecond } = simulateGovernor(
      first,
      ordered,
      rows,
      slugs,
      resolved,
    );
    return { first, ordered, probs, goesToSecond, rows };
  }

  const probs = simulateSenator(
    first,
    ordered.map((o) => o.slug),
    resolved,
  );
  return { first, ordered, probs, rows };
}
