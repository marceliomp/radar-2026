/**
 * Agregador neutro:
 * recência · √n · modo · quality (MAE 2018/2022)
 * 2º two-way · P(presidente) = vitória no 1º ou no 2º
 */

import { resolveInstitute, trackQuality } from "./track-record.ts";
import { isShownTie, round } from "../format.ts";
import { mixElectionProbs } from "./runoff-scenarios.ts";

export type PollMode =
  | "presencial"
  | "remoto"
  | "online"
  | "modelo"
  | "telefone";

export type PollSource = {
  tseProtocol: string | null;
  url: string | null;
  publisher: string;
  publishedAt: string;
  capturedAt: string;
};

export type CandidateKey =
  | "lula"
  | "flavio"
  | "renan"
  | "caiado"
  | "zema"
  | "cury"
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
  coverage?: "uf" | "metro";
  firstRound: Partial<Record<CandidateKey, number>>;
  secondRound?: Partial<Record<CandidateKey, number>>;
  /** Confrontos extras de 2º. Lula muda de % conforme o par: nao cabem no mesmo secondRound. */
  secondPairs?: { a: CandidateKey; b: CandidateKey; aPct: number; bPct: number }[];
  source: PollSource;
  notes?: string;
  govApproval?: number;
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
  uf?: string;
  imputeSecond?: boolean;
  /** Erro extra de casa/desenho, em pp, somado ao SE do gap. */
  extraVarPp: number;
  /** Teto da fatia de peso de uma casa (resolveInstitute). */
  houseCap: number;
};

export const DEFAULT_HOUSE_EFFECTS: EngineConfig["houseEffects"] = {};

export function todayAsOf(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export const DEFAULT_CONFIG: EngineConfig = {
  halfLifeDays: 14,
  includeOnline: true,
  includeRemoto: true,
  includeModelo: false,
  asOf: todayAsOf(),
  simulations: 8000,
  houseEffects: DEFAULT_HOUSE_EFFECTS,
  useTrackRecord: true,
  useTrackHouse: false,
  extraVarPp: 1.15,
  houseCap: 0.22,
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

export function pollDedupeKey(poll: ForecastPoll): string {
  const inst = resolveInstitute(poll.institute);
  const fr = poll.firstRound;
  return [
    inst,
    poll.fieldEnd,
    poll.sample,
    poll.national ? "BR" : (poll.uf ?? ""),
    fr.lula ?? "",
    fr.flavio ?? "",
  ].join("|");
}

/** Mesma casa, mesmo campo, mesmo n, mesmo 1º: fica a ficha mais rica. */
export function dedupePolls(polls: ForecastPoll[]): ForecastPoll[] {
  const richness = (p: ForecastPoll) => {
    const fr = Object.keys(p.firstRound).length;
    const pairs = p.secondPairs?.length ?? 0;
    const sr = p.secondRound ? 1 : 0;
    const notes = (p.notes ?? "").length;
    return pairs * 100 + sr * 20 + fr * 5 + Math.min(notes, 40);
  };
  const best = new Map<string, ForecastPoll>();
  for (const poll of polls) {
    const key = pollDedupeKey(poll);
    const prev = best.get(key);
    if (!prev || richness(poll) > richness(prev)) best.set(key, poll);
  }
  return polls.filter((p) => best.get(pollDedupeKey(p)) === p);
}

function capHouseWeights(
  rows: WeightedPollRow[],
  cap: number,
): WeightedPollRow[] {
  if (cap <= 0 || cap >= 1 || rows.length < 2) return rows;
  let next = rows;
  for (let i = 0; i < 8; i++) {
    const instW = new Map<string, number>();
    let sumW = 0;
    for (const r of next) {
      const inst = resolveInstitute(r.poll.institute);
      instW.set(inst, (instW.get(inst) ?? 0) + r.weight);
      sumW += r.weight;
    }
    if (sumW <= 0 || instW.size < 5) return next;
    let worst: { inst: string; w: number } | null = null;
    for (const [inst, w] of instW) {
      if (w / sumW > cap + 1e-6 && (!worst || w > worst.w)) {
        worst = { inst, w };
      }
    }
    if (!worst) break;
    const others = sumW - worst.w;
    if (others <= 0) break;
    const target = (cap / (1 - cap)) * others;
    const scale = target / worst.w;
    next = next.map((r) =>
      resolveInstitute(r.poll.institute) === worst!.inst
        ? { ...r, weight: r.weight * scale }
        : r,
    );
  }
  const sum2 = next.reduce((s, r) => s + r.weight, 0) || 1;
  return next
    .map((r) => ({ ...r, weightShare: round(r.weight / sum2, 4) }))
    .sort((a, b) => b.weight - a.weight);
}

export type HouseChip = {
  institute: string;
  share: number;
  quality: number;
};

export function housesInAverage(rows: WeightedPollRow[]): HouseChip[] {
  const by = new Map<string, number>();
  for (const r of rows) {
    const inst = resolveInstitute(r.poll.institute);
    by.set(inst, (by.get(inst) ?? 0) + r.weightShare);
  }
  return [...by.entries()]
    .map(([institute, share]) => ({
      institute,
      share: round(share, 4),
      quality: trackQuality(institute),
    }))
    .sort((a, b) => b.share - a.share);
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
  if (poll.date > cfg.asOf || poll.fieldEnd > cfg.asOf) return false;
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

function house(
  institute: string,
  cand: "lula" | "flavio",
  map: EngineConfig["houseEffects"],
): number {
  return map[institute]?.[cand] ?? 0;
}

export function buildWeightedRows(
  polls: ForecastPoll[],
  cfg: EngineConfig,
): WeightedPollRow[] {
  const houseMap = cfg.useTrackHouse ? cfg.houseEffects : {};
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
      row.adjLula2 = round((poll.secondRound.lula ?? 0) - houseLula, 2);
      row.adjFlavio2 = round((poll.secondRound.flavio ?? 0) - houseFlavio, 2);
    } else if (cfg.imputeSecond) {
      const tot = Math.max(l1 + f1, 1);
      row.adjLula2 = round((l1 / tot) * 90, 2);
      row.adjFlavio2 = round((f1 / tot) * 90, 2);
    }
    return row;
  });

  const sumW = raw.reduce((s, r) => s + r.weight, 0) || 1;
  const shared = raw
    .map((r) => ({
      ...r,
      weightShare: round(r.weight / sumW, 4),
    }))
    .sort((a, b) => b.weight - a.weight);
  return capHouseWeights(shared, cfg.houseCap ?? 0.22);
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
    Math.max(between + avgSamp * 0.5, values.length < 3 ? 2.25 : 0.25),
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

export type WinProbs = {
  lulaWinsElection: number;
  flavioWinsElection: number;
  caiadoWinsElection?: number;
  renanWinsElection?: number;
  zemaWinsElection?: number;
  lulaWinsFirstRound: number;
  flavioWinsFirstRound: number;
  lulaWinsSecond: number;
  flavioWinsSecond: number;
  lulaLeadsFirst: number;
  flavioLeadsFirst: number;
  goesToSecond: number;
  askedShare?: number;
};

export type ForecastSnapshot = {
  rows: WeightedPollRow[];
  first: {
    lula: AggregateResult;
    flavio: AggregateResult;
    renan: AggregateResult;
    caiado: AggregateResult;
    zema: AggregateResult;
    cury: AggregateResult;
    gap: number;
    seGap: number;
    technicalTie: boolean;
  };
  second: {
    lula: AggregateResult;
    flavio: AggregateResult;
    renan: AggregateResult;
    caiado: AggregateResult;
    zema: AggregateResult;
    cury: AggregateResult;
    gap: number;
    seGap: number;
    technicalTie: boolean;
  } | null;
  probs: WinProbs;
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

function emptyAgg(): AggregateResult {
  return {
    mean: 0,
    se: 5,
    low: 0,
    high: 0,
    nPolls: 0,
    effectiveN: 0,
  };
}

type ThirdKey = "renan" | "caiado" | "zema" | "cury";

/** Ausência de chave ≠ 0%. Só média quem perguntou o nome. */
function fieldMean(
  rows: WeightedPollRow[],
  key: ThirdKey,
  round: "first" | "second",
): AggregateResult {
  const subset = rows.filter((r) => {
    const src = round === "first" ? r.poll.firstRound : r.poll.secondRound;
    return src?.[key] != null;
  });
  if (!subset.length) return emptyAgg();
  return weightedMeanVar(
    subset.map((r) =>
      round === "first"
        ? r.poll.firstRound[key]!
        : r.poll.secondRound![key]!,
    ),
    subset.map((r) => r.weight),
    subset.map((r) => r.poll.moe),
  );
}

function emptyProbs(): WinProbs {
  return {
    lulaWinsElection: 0.5,
    flavioWinsElection: 0.5,
    lulaWinsFirstRound: 0,
    flavioWinsFirstRound: 0,
    lulaWinsSecond: 0.5,
    flavioWinsSecond: 0.5,
    lulaLeadsFirst: 0.5,
    flavioLeadsFirst: 0.5,
    goesToSecond: 0.99,
  };
}

/** SE do gap two-way (L−F), com erro extra de desenho. */
export function gapSe(
  seL: number,
  seF: number,
  extraVarPp: number,
  rho = -0.65,
): number {
  const cov = 2 * rho * seL * seF;
  return Math.sqrt(Math.max(seL * seL + seF * seF - cov, 0.04) + extraVarPp ** 2);
}

export function runForecast(
  polls: ForecastPoll[],
  cfg: EngineConfig = DEFAULT_CONFIG,
): ForecastSnapshot {
  const rows = buildWeightedRows(dedupePolls(polls), cfg);

  if (rows.length === 0) {
    return {
      rows,
      first: {
        lula: emptyAgg(),
        flavio: emptyAgg(),
        renan: emptyAgg(),
        caiado: emptyAgg(),
        zema: emptyAgg(),
        cury: emptyAgg(),
        gap: 0,
        seGap: 5,
        technicalTie: true,
      },
      second: {
        lula: emptyAgg(),
        flavio: emptyAgg(),
        renan: emptyAgg(),
        caiado: emptyAgg(),
        zema: emptyAgg(),
        cury: emptyAgg(),
        gap: 0,
        seGap: 5,
        technicalTie: true,
      },
      probs: emptyProbs(),
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
  const renan = fieldMean(rows, "renan", "first");
  const caiado = fieldMean(rows, "caiado", "first");
  const zema = fieldMean(rows, "zema", "first");
  const cury = fieldMean(rows, "cury", "first");

  const seGap1 = gapSe(lula1.se, flavio1.se, cfg.extraVarPp);
  const gap1 = round(lula1.mean - flavio1.mean, 2);
  const technicalTie1 = isShownTie(lula1.mean, flavio1.mean, seGap1);

  const with2 = rows.filter(
    (r) =>
      r.poll.secondRound &&
      r.adjLula2 !== undefined &&
      r.adjFlavio2 !== undefined,
  );
  const with2orImputed = rows.filter(
    (r) => r.adjLula2 !== undefined && r.adjFlavio2 !== undefined,
  );
  const secondRows = with2.length
    ? with2
    : cfg.imputeSecond
      ? with2orImputed
      : [];
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
    const seGap2 = gapSe(l2.se, f2.se, cfg.extraVarPp, -0.85);
    const field2 = (key: ThirdKey) => fieldMean(secondRows, key, "second");
    second = {
      lula: l2,
      flavio: f2,
      renan: field2("renan"),
      caiado: field2("caiado"),
      zema: field2("zema"),
      cury: field2("cury"),
      gap: gap2,
      seGap: round(seGap2, 3),
      technicalTie: isShownTie(l2.mean, f2.mean, seGap2),
    };
  }

  const n = cfg.simulations;
  const rng = mulberry32(20260811);
  let l1lead = 0;
  let f1lead = 0;
  let l1win = 0;
  let f1win = 0;
  let toSecond = 0;
  let l2w = 0;
  let f2w = 0;
  let lPres = 0;
  let fPres = 0;

  const l1m = lula1.mean;
  const f1m = flavio1.mean;
  const othersMean = Math.max(0, 100 - l1m - f1m);
  const l2m = second?.lula.mean ?? 50;
  const f2m = second?.flavio.mean ?? 50;
  const seG1 = seGap1;
  const seG2 = second?.seGap ?? 4;

  for (let i = 0; i < n; i++) {
    const g1 = gap1 + seG1 * randn(rng);
    const mid1 = (l1m + f1m) / 2;
    let L1 = mid1 + g1 / 2;
    let F1 = mid1 - g1 / 2;
    const tot1 = Math.max(L1 + F1 + othersMean, 1);
    L1 = (L1 / tot1) * 100;
    F1 = (F1 / tot1) * 100;
    if (L1 > F1) l1lead++;
    else f1lead++;

    const majorityL = L1 >= 50;
    const majorityF = F1 >= 50;
    if (majorityL) {
      l1win++;
      lPres++;
      continue;
    }
    if (majorityF) {
      f1win++;
      fPres++;
      continue;
    }

    toSecond++;
    const g2 = (l2m - f2m) + seG2 * randn(rng);
    if (g2 >= 0) {
      l2w++;
      lPres++;
    } else {
      f2w++;
      fPres++;
    }
  }

  const runoffN = Math.max(toSecond, 1);

  return {
    rows,
    first: {
      lula: lula1,
      flavio: flavio1,
      renan,
      caiado,
      zema,
      cury,
      gap: gap1,
      seGap: round(seGap1, 3),
      technicalTie: technicalTie1,
    },
    second,
    probs: (() => {
      const twoHorse = {
        lulaWinsElection: round(lPres / n, 4),
        flavioWinsElection: round(fPres / n, 4),
        lulaWinsFirstRound: round(l1win / n, 4),
        flavioWinsFirstRound: round(f1win / n, 4),
        lulaWinsSecond: round(l2w / runoffN, 4),
        flavioWinsSecond: round(f2w / runoffN, 4),
        lulaLeadsFirst: round(l1lead / n, 4),
        flavioLeadsFirst: round(f1lead / n, 4),
        goesToSecond: round(toSecond / n, 4),
      };
      const mix = mixElectionProbs({
        first: {
          lula: lula1,
          flavio: flavio1,
          renan,
          caiado,
          zema,
          cury,
        },
        second,
        polls: rows.map((r) => ({ ...r.poll, weight: r.weight })),
        pMajority: { lula: l1win / n, flavio: f1win / n },
        pGoesToSecond: toSecond / n,
        sePair: second?.seGap ?? 2.2,
      });
      if (mix.askedShare <= 0) return twoHorse;
      return {
        ...twoHorse,
        lulaWinsElection: round(mix.lula, 4),
        flavioWinsElection: round(mix.flavio, 4),
        caiadoWinsElection: round(mix.caiado, 4),
        renanWinsElection: round(mix.renan, 4),
        zemaWinsElection: round(mix.zema, 4),
        askedShare: round(mix.askedShare, 4),
      };
    })(),
    config: cfg,
  };
}

export { fmtPct, fmtProb, fmtDelta } from "../format.ts";
