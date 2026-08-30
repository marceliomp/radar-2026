import type { CandidateKey, ForecastPoll } from "@/lib/forecast/engine";

export const RUNOFF_KEYS = [
  "lula",
  "flavio",
  "renan",
  "caiado",
  "zema",
  "cury",
] as const;

export type RunoffKey = (typeof RUNOFF_KEYS)[number];

export type FieldAgg = { mean: number; se: number; nPolls: number };

export type RunoffScenario = {
  a: RunoffKey;
  b: RunoffKey;
  pairKey: string;
  pPair: number;
  asked: boolean;
  nAsked: number;
  a1: number;
  b1: number;
  a2: number | null;
  b2: number | null;
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
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

const FIELD_KEYS: RunoffKey[] = [
  "lula",
  "flavio",
  "renan",
  "caiado",
  "zema",
  "cury",
];

export type PairObs = {
  key: string;
  a: RunoffKey;
  b: RunoffKey;
  aPct: number;
  bPct: number;
  weight: number;
};

/** Cada confronto com numero. secondRound = Lula×Flavio; secondPairs = os outros. */
export function pairObservations(
  poll: Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number },
): PairObs[] {
  const w = poll.weight ?? 1;
  const out: PairObs[] = [];
  const seen = new Set<string>();
  const add = (a: string, b: string, aPct: number, bPct: number) => {
    if (!FIELD_KEYS.includes(a as RunoffKey) || !FIELD_KEYS.includes(b as RunoffKey)) return;
    if (!Number.isFinite(aPct) || !Number.isFinite(bPct)) return;
    const key = pairKey(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, a: a as RunoffKey, b: b as RunoffKey, aPct, bPct, weight: w });
  };
  const sr = poll.secondRound;
  if (sr?.lula != null && sr.flavio != null) add("lula", "flavio", sr.lula, sr.flavio);
  for (const row of poll.secondPairs ?? []) {
    add(row.a, row.b, row.aPct, row.bPct);
  }
  return out;
}

export function askedPairCounts(
  polls: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number })[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of polls) {
    for (const obs of pairObservations(p)) {
      m.set(obs.key, (m.get(obs.key) ?? 0) + 1);
    }
  }
  return m;
}

export function aggregatePairMeans(
  polls: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number })[],
): Map<string, { aMean: number; bMean: number; n: number; a: RunoffKey; b: RunoffKey }> {
  const bucket = new Map<string, { aSum: number; bSum: number; w: number; n: number; a: RunoffKey; b: RunoffKey }>();
  for (const p of polls) {
    for (const obs of pairObservations(p)) {
      const cur = bucket.get(obs.key) ?? { aSum: 0, bSum: 0, w: 0, n: 0, a: obs.a, b: obs.b };
      cur.aSum += obs.aPct * obs.weight;
      cur.bSum += obs.bPct * obs.weight;
      cur.w += obs.weight;
      cur.n += 1;
      bucket.set(obs.key, cur);
    }
  }
  const out = new Map<string, { aMean: number; bMean: number; n: number; a: RunoffKey; b: RunoffKey }>();
  for (const [key, v] of bucket) {
    if (v.w <= 0) continue;
    out.set(key, { a: v.a, b: v.b, aMean: v.aSum / v.w, bMean: v.bSum / v.w, n: v.n });
  }
  return out;
}

function pairFromTop2(draw: { key: RunoffKey; v: number }[]): string | null {
  const ranked = [...draw].sort((x, y) => y.v - x.v);
  if (ranked.length < 2) return null;
  return pairKey(ranked[0]!.key, ranked[1]!.key);
}

/**
 * Cenarios de 2º: o que as casas perguntaram + pares possiveis a partir do 1º.
 * Nao inventa intencao de 2º. a2/b2 so quando asked.
 */
export function buildRunoffScenarios(input: {
  first: Record<RunoffKey, FieldAgg>;
  second: Record<RunoffKey, FieldAgg> | null;
  polls: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number })[],
  simulations?: number;
}): RunoffScenario[] {
  const sims = input.simulations ?? 4000;
  const asked = askedPairCounts(input.polls);
  const pairMeans = aggregatePairMeans(input.polls);
  const ranked = RUNOFF_KEYS
    .map((k) => ({ k, mean: input.first[k].mean }))
    .filter((r) => r.mean >= 1.5)
    .sort((a, b) => b.mean - a.mean);
  const contenders = ranked.map((r) => r.k);
  const openKeys = new Set<string>(asked.keys());
  if (ranked.length >= 2) {
    const leader = ranked[0]!.k;
    for (const other of ranked.slice(1)) {
      openKeys.add(pairKey(leader, other.k));
    }
  }

  const counts = new Map<string, number>();
  if (contenders.length >= 2) {
    const rng = mulberry32(20260829);
    for (let i = 0; i < sims; i++) {
      const draw = contenders.map((key) => {
        const row = input.first[key];
        const se = Math.max(row.se, 1.2);
        return { key, v: row.mean + se * randn(rng) };
      });
      const pk = pairFromTop2(draw);
      if (!pk) continue;
      counts.set(pk, (counts.get(pk) ?? 0) + 1);
    }
  }

  const keys = openKeys;
  const out: RunoffScenario[] = [];
  for (const pk of keys) {
    const [x, y] = pk.split("|") as [RunoffKey, RunoffKey];
    const pairAgg = pairMeans.get(pk);
    const nAsk = pairAgg?.n ?? asked.get(pk) ?? 0;
    const pPair = sims > 0 ? (counts.get(pk) ?? 0) / sims : 0;
    let a = x;
    let b = y;
    let a2: number | null = null;
    let b2: number | null = null;
    if (pk === "flavio|lula" && input.second) {
      a2 = input.second[x].mean;
      b2 = input.second[y].mean;
    } else if (pairAgg) {
      if (pairAgg.a === x && pairAgg.b === y) {
        a2 = pairAgg.aMean;
        b2 = pairAgg.bMean;
      } else if (pairAgg.a === y && pairAgg.b === x) {
        a2 = pairAgg.bMean;
        b2 = pairAgg.aMean;
      }
    }
    const aScore = a2 ?? input.first[x].mean;
    const bScore = b2 ?? input.first[y].mean;
    if (bScore > aScore) {
      a = y;
      b = x;
      const tmp = a2;
      a2 = b2;
      b2 = tmp;
    }
    out.push({
      a,
      b,
      pairKey: pk,
      pPair,
      asked: nAsk > 0,
      nAsked: nAsk,
      a1: input.first[a].mean,
      b1: input.first[b].mean,
      a2,
      b2,
    });
  }

  out.sort((p, q) => {
    if (p.asked !== q.asked) return p.asked ? -1 : 1;
    return q.pPair - p.pPair || q.nAsked - p.nAsked;
  });
  return out;
}

/** CDF normal padrão (Abramowitz 26.2.17). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function pairWinProb(a2: number, b2: number, se: number): number {
  return normalCdf((a2 - b2) / Math.max(se, 0.4));
}

export type ElectionMix = Record<RunoffKey, number> & { askedShare: number };

/**
 * P(presidente) = P(maioria no 1º) + P(2º) × soma dos pares perguntados.
 * Par sem 2T medido não inventa voto: a massa do 2º renormaliza nos pares asked.
 */
export function mixElectionProbs(input: {
  first: Record<RunoffKey, FieldAgg>;
  second: Record<RunoffKey, FieldAgg> | null;
  polls: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & {
    weight?: number;
  })[];
  pMajority: Partial<Record<RunoffKey, number>>;
  pGoesToSecond: number;
  sePair?: number;
}): ElectionMix {
  const scenarios = buildRunoffScenarios(input);
  const asked = scenarios.filter(
    (s) => s.asked && s.a2 != null && s.b2 != null,
  );
  const askedMass = asked.reduce((s, r) => s + r.pPair, 0);
  const wins = {
    lula: input.pMajority.lula ?? 0,
    flavio: input.pMajority.flavio ?? 0,
    renan: input.pMajority.renan ?? 0,
    caiado: input.pMajority.caiado ?? 0,
    zema: input.pMajority.zema ?? 0,
    cury: input.pMajority.cury ?? 0,
    askedShare: askedMass,
  };
  if (askedMass <= 0 || input.pGoesToSecond <= 0) return wins;
  const se = input.sePair ?? 2.2;
  for (const s of asked) {
    const w = (s.pPair / askedMass) * input.pGoesToSecond;
    const pA = pairWinProb(s.a2!, s.b2!, se);
    wins[s.a] += w * pA;
    wins[s.b] += w * (1 - pA);
  }
  return wins;
}
