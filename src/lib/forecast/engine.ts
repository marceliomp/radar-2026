/**
 * Election forecast engine:
 * - recency decay · √n · methodology · 2022 track-record quality
 * - blended house effects
 * - Monte Carlo win probs
 */

import {
  blendHouseEffects,
  trackQuality,
} from "@/lib/forecast/track-record";
import { round } from "@/lib/format";

export type PollMode = "presencial" | "remoto" | "online" | "modelo" | "telefone";

export type CandidateKey =
  | "lula"
  | "flavio"
  | "renan"
  | "caiado"
  | "zema"
  | "other";

export type ForecastPoll = {
  id: string;
  institute: string;
  date: string;
  fieldEnd: string;
  sample: number;
  moe: number;
  mode: PollMode;
  national: boolean;
  uf?: string;
  /** metro/recorte — fora do agregador da UF */
  coverage?: "uf" | "metro";
  firstRound: Partial<Record<CandidateKey, number>>;
  secondRound?: { lula: number; flavio: number };
  notes?: string;
};

export type EngineConfig = {
  halfLifeDays: number;
  includeOnline: boolean;
  includeRemoto: boolean;
  includeModelo: boolean;
  asOf: string;
  simulations: number;
  houseEffects: Record<string, Partial<Record<"lula" | "flavio", number>>>;
  useTrackRecord: boolean;
  useTrackHouse: boolean;
  /** If set, only that UF (ignores national). */
  uf?: string;
  /** Fill 2º from 1º two-way share when the poll skipped runoff. */
  imputeSecond?: boolean;
};

export const DEFAULT_HOUSE_EFFECTS: EngineConfig["houseEffects"] = {
  Gerp: { lula: -1.5, flavio: 2.0 },
  Palver: { lula: 1.0, flavio: 2.5 },
  "Nexus/BTG": { lula: 0.5, flavio: 0.5 },
  "Genial/Quaest": { lula: 0.5, flavio: -1.5 },
  Quaest: { lula: 0.5, flavio: -1.5 },
  "Quaest/Globo": { lula: 0.5, flavio: -1.5 },
  "Quaest/TV Bahia": { lula: 0.5, flavio: -1.5 },
  "Quaest/Rede Amazônica": { lula: 0.5, flavio: -1.5 },
  AtlasIntel: { lula: 0, flavio: 0.3 },
  "American Analytics": { lula: -0.3, flavio: 0.6 },
  "Meio/Ideia": { lula: 1.0, flavio: 0 },
  "Futura/Apex": { lula: 0.2, flavio: 0.3 },
  Datafolha: { lula: 0, flavio: -0.5 },
  "Real Time Big Data": { lula: 0.5, flavio: 0 },
  "Real Time": { lula: 0.5, flavio: 0 },
  "Paraná Pesquisas": { lula: 0, flavio: 0 },
  Veritá: { lula: -0.5, flavio: 0.8 },
  "CNT/MDA": { lula: 0.8, flavio: -0.5 },
  "PoderData/Aya": { lula: 0.2, flavio: 0.4 },
};

export const DEFAULT_CONFIG: EngineConfig = {
  halfLifeDays: 14,
  includeOnline: true,
  includeRemoto: true,
  includeModelo: false,
  asOf: "2026-08-28",
  simulations: 8000,
  houseEffects: DEFAULT_HOUSE_EFFECTS,
  useTrackRecord: true,
  useTrackHouse: true,
};

const MODE_QUALITY: Record<PollMode, number> = {
  presencial: 1.0,
  remoto: 0.88,
  telefone: 0.88,
  online: 0.68,
  modelo: 0.42,
};

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

export function recencyWeight(
  fieldEnd: string,
  asOf: string,
  halfLife: number,
): number {
  const d = daysBetween(fieldEnd, asOf);
  return Math.exp((-Math.LN2 * d) / halfLife);
}

export function sampleWeight(n: number): number {
  return Math.sqrt(Math.max(n, 1));
}

export function modeWeight(mode: PollMode): number {
  return MODE_QUALITY[mode] ?? 0.5;
}

export function pollPassesFilter(
  poll: ForecastPoll,
  cfg: EngineConfig,
): boolean {
  if (cfg.uf) {
    if (poll.national || poll.uf !== cfg.uf) return false;
    if (poll.coverage === "metro") return false;
  } else if (!poll.national) {
    return false;
  }
  if (poll.mode === "online" && !cfg.includeOnline) return false;
  if ((poll.mode === "remoto" || poll.mode === "telefone") && !cfg.includeRemoto)
    return false;
  if (poll.mode === "modelo" && !cfg.includeModelo) return false;
  return true;
}

export type WeightedPollRow = {
  poll: ForecastPoll;
  wRecency: number;
  wSample: number;
  wMode: number;
  wTrack: number;
  weight: number;
  weightShare: number;
  adjLula1: number;
  adjFlavio1: number;
  adjLula2?: number;
  adjFlavio2?: number;
  houseLula: number;
  houseFlavio: number;
};

function resolveHouseMap(cfg: EngineConfig) {
  return blendHouseEffects(cfg.houseEffects, cfg.useTrackHouse);
}

function house(
  institute: string,
  cand: "lula" | "flavio",
  map: ReturnType<typeof resolveHouseMap>,
): number {
  return map[institute]?.[cand] ?? 0;
}

export function buildWeightedRows(
  polls: ForecastPoll[],
  cfg: EngineConfig,
): WeightedPollRow[] {
  const houseMap = resolveHouseMap(cfg);
  const eligible = polls.filter((p) => pollPassesFilter(p, cfg));
  const raw = eligible.map((poll) => {
    const wRecency = recencyWeight(poll.fieldEnd, cfg.asOf, cfg.halfLifeDays);
    const wSample = sampleWeight(poll.sample);
    const wMode = modeWeight(poll.mode);
    const wTrack = cfg.useTrackRecord ? trackQuality(poll.institute) : 1;
    const weight = wRecency * wSample * wMode * wTrack;
    const houseLula = house(poll.institute, "lula", houseMap);
    const houseFlavio = house(poll.institute, "flavio", houseMap);
    const l1 = (poll.firstRound.lula ?? 0) - houseLula;
    const f1 = (poll.firstRound.flavio ?? 0) - houseFlavio;
    const row: WeightedPollRow = {
      poll,
      wRecency: round(wRecency, 4),
      wSample: round(wSample, 2),
      wMode,
      wTrack: round(wTrack, 2),
      weight,
      weightShare: 0,
      adjLula1: round(l1, 2),
      adjFlavio1: round(f1, 2),
      houseLula,
      houseFlavio,
    };
    if (poll.secondRound) {
      const tBoost =
        cfg.useTrackRecord && trackQuality(poll.institute) >= 1.2 ? 0.65 : 0.8;
      row.adjLula2 = round(poll.secondRound.lula - houseLula * tBoost, 2);
      row.adjFlavio2 = round(poll.secondRound.flavio - houseFlavio * tBoost, 2);
    } else if (cfg.imputeSecond) {
      const tot = Math.max(l1 + f1, 1);
      row.adjLula2 = round((l1 / tot) * 90, 2);
      row.adjFlavio2 = round((f1 / tot) * 90, 2);
    }
    return row;
  });

  const sumW = raw.reduce((s, r) => s + r.weight, 0) || 1;
  return raw
    .map((r) => ({
      ...r,
      weightShare: round(r.weight / sumW, 4),
    }))
    .sort((a, b) => b.weight - a.weight);
}

export type AggregateResult = {
  mean: number;
  se: number;
  low: number;
  high: number;
  nPolls: number;
  effectiveN: number;
};

function weightedMeanVar(
  values: number[],
  weights: number[],
  moes: number[],
): AggregateResult {
  const sumW = weights.reduce((s, w) => s + w, 0) || 1;
  const mean = values.reduce((s, v, i) => s + v * weights[i]!, 0) / sumW;
  const between =
    values.reduce((s, v, i) => s + weights[i]! * (v - mean) ** 2, 0) / sumW;
  const avgSamp =
    moes.reduce((s, m, i) => s + weights[i]! * (m / 1.96) ** 2, 0) / sumW;
  const se = Math.sqrt(
    Math.max(between + avgSamp * 0.5, values.length < 3 ? 4.84 : 0.25),
  );
  const effectiveN = sumW ** 2 / weights.reduce((s, w) => s + w * w, 0);
  return {
    mean: round(mean, 2),
    se: round(se, 3),
    low: round(mean - 1.96 * se, 2),
    high: round(mean + 1.96 * se, 2),
    nPolls: values.length,
    effectiveN: round(effectiveN, 2),
  };
}

export type ForecastSnapshot = {
  rows: WeightedPollRow[];
  first: {
    lula: AggregateResult;
    flavio: AggregateResult;
    renan: AggregateResult;
    gap: number;
    technicalTie: boolean;
  };
  second: {
    lula: AggregateResult;
    flavio: AggregateResult;
    gap: number;
    technicalTie: boolean;
  } | null;
  probs: {
    lulaWinsSecond: number;
    flavioWinsSecond: number;
    lulaLeadsFirst: number;
    flavioLeadsFirst: number;
    goesToSecond: number;
  };
  config: EngineConfig;
};

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

export function runForecast(
  polls: ForecastPoll[],
  cfg: EngineConfig = DEFAULT_CONFIG,
): ForecastSnapshot {
  const rows = buildWeightedRows(polls, cfg);
  const emptyAgg = (): AggregateResult => ({
    mean: 0,
    se: 5,
    low: 0,
    high: 0,
    nPolls: 0,
    effectiveN: 0,
  });

  if (rows.length === 0) {
    return {
      rows,
      first: {
        lula: emptyAgg(),
        flavio: emptyAgg(),
        renan: emptyAgg(),
        gap: 0,
        technicalTie: true,
      },
      second: null,
      probs: {
        lulaWinsSecond: 0.5,
        flavioWinsSecond: 0.5,
        lulaLeadsFirst: 0.5,
        flavioLeadsFirst: 0.5,
        goesToSecond: 0.9,
      },
      config: cfg,
    };
  }

  const w = rows.map((r) => r.weight);
  const moe = rows.map((r) => r.poll.moe);
  const lula1 = weightedMeanVar(
    rows.map((r) => r.adjLula1),
    w,
    moe,
  );
  const flavio1 = weightedMeanVar(
    rows.map((r) => r.adjFlavio1),
    w,
    moe,
  );
  const renan = weightedMeanVar(
    rows.map((r) => r.poll.firstRound.renan ?? 0),
    w,
    moe,
  );

  const gap1 = round(lula1.mean - flavio1.mean, 2);
  const seGap1 = Math.sqrt(lula1.se ** 2 + flavio1.se ** 2);
  const technicalTie1 = Math.abs(gap1) < 1.96 * seGap1 * 0.55;

  const with2 = rows.filter(
    (r) => r.poll.secondRound && r.adjLula2 !== undefined && r.adjFlavio2 !== undefined,
  );
  const with2orImputed = rows.filter(
    (r) => r.adjLula2 !== undefined && r.adjFlavio2 !== undefined,
  );
  const secondRows = with2.length ? with2 : cfg.imputeSecond ? with2orImputed : [];
  let second: ForecastSnapshot["second"] = null;
  if (secondRows.length) {
    const w2 = secondRows.map((r) => r.weight);
    const m2 = secondRows.map((r) => r.poll.moe);
    const l2 = weightedMeanVar(
      secondRows.map((r) => r.adjLula2!),
      w2,
      m2,
    );
    const f2 = weightedMeanVar(
      secondRows.map((r) => r.adjFlavio2!),
      w2,
      m2,
    );
    const gap2 = round(l2.mean - f2.mean, 2);
    const seGap2 = Math.sqrt(l2.se ** 2 + f2.se ** 2);
    second = {
      lula: l2,
      flavio: f2,
      gap: gap2,
      technicalTie: Math.abs(gap2) < 1.96 * seGap2 * 0.55,
    };
  }

  const rng = mulberry32(20260811);
  let l2w = 0;
  let f2w = 0;
  let l1lead = 0;
  let f1lead = 0;
  let toSecond = 0;
  const n = cfg.simulations;
  const l1m = lula1.mean;
  const f1m = flavio1.mean;
  const l1s = lula1.se;
  const f1s = flavio1.se;
  const l2m = second?.lula.mean ?? 46;
  const f2m = second?.flavio.mean ?? 46;
  const l2s = second?.lula.se ?? 2.5;
  const f2s = second?.flavio.se ?? 2.5;

  for (let i = 0; i < n; i++) {
    const L1 = l1m + l1s * randn(rng);
    const F1 = f1m + f1s * randn(rng);
    if (L1 > F1) l1lead++;
    else f1lead++;
    const others = Math.max(0, 100 - L1 - F1);
    const maxShare = Math.max(L1, F1) / Math.max(L1 + F1 + others, 1);
    if (maxShare < 0.5 || (L1 < 50 && F1 < 50)) toSecond++;

    const L2 = l2m + l2s * randn(rng);
    const F2 = f2m + f2s * randn(rng);
    if (L2 >= F2) l2w++;
    else f2w++;
  }

  return {
    rows,
    first: {
      lula: lula1,
      flavio: flavio1,
      renan,
      gap: gap1,
      technicalTie: technicalTie1,
    },
    second,
    probs: {
      lulaWinsSecond: round(l2w / n, 4),
      flavioWinsSecond: round(f2w / n, 4),
      lulaLeadsFirst: round(l1lead / n, 4),
      flavioLeadsFirst: round(f1lead / n, 4),
      goesToSecond: round(
        Math.min(0.99, Math.max(0.55, toSecond / n)),
        4,
      ),
    },
    config: cfg,
  };
}

// re-export formatters for existing imports
export { fmtPct, fmtProb, fmtDelta } from "@/lib/format";
