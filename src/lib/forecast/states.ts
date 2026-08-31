import { polls } from "@/data/polls";
import { UF_META } from "@/data/calendar";
import { STATE_SNAPSHOTS } from "@/data/state-polls";
import {
  DEFAULT_CONFIG,
  runForecast,
  type EngineConfig,
  type ForecastPoll,
  type ForecastSnapshot,
} from "@/lib/forecast/engine";

function snapshotToPoll(s: (typeof STATE_SNAPSHOTS)[number]): ForecastPoll {
  return {
    id: `snap-${s.uf}-${s.date}-${s.institute}`,
    institute: s.institute,
    date: s.date,
    fieldEnd: s.date,
    sample: 1,
    moe: s.moe,
    mode: "telefone",
    national: false,
    uf: s.uf,
    firstRound: { lula: s.lula1, flavio: s.flavio1 },
    secondRound:
      s.lula2 != null && s.flavio2 != null
        ? { lula: s.lula2, flavio: s.flavio2 }
        : undefined,
    source: {
      tseProtocol: null,
      url: null,
      publisher: s.institute,
      publishedAt: s.date,
      capturedAt: `${s.date}T12:00:00-03:00`,
    },
    notes: s.note,
  };
}

function pollKey(p: ForecastPoll) {
  return `${p.uf ?? "BR"}|${p.institute.split("/")[0]}|${p.date}|${p.firstRound.lula}|${p.firstRound.flavio}`;
}

export function allStatePolls(): ForecastPoll[] {
  const fromFile = polls.filter((p) => !p.national && p.uf);
  const seen = new Set(fromFile.map(pollKey));
  const extra = STATE_SNAPSHOTS.map(snapshotToPoll).filter((p) => {
    const k = pollKey(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return [...fromFile, ...extra];
}

export type StateForecast = {
  uf: string;
  n: number;
  n2: number;
  first: { lula: number; flavio: number; se: number; tie: boolean };
  second: { lula: number; flavio: number; se: number; tie: boolean } | null;
  pFlavio1: number;
  pLula1: number;
  pFlavio2: number;
  pLula2: number;
  snapshot: ForecastSnapshot;
};

export function runStateForecast(
  uf: string,
  cfg: EngineConfig = DEFAULT_CONFIG,
): StateForecast | null {
  const pool = allStatePolls().filter((p) => p.uf === uf);
  if (!pool.length) return null;
  const snap = runForecast(pool, {
    ...cfg,
    uf,
    imputeSecond: false,
    simulations: Math.min(cfg.simulations, 2500),
  });
  return {
    uf,
    n: snap.rows.length,
    n2: snap.rows.filter((r) => r.poll.secondRound).length,
    first: {
      lula: snap.first.lula.mean,
      flavio: snap.first.flavio.mean,
      se: snap.first.lula.se,
      tie: snap.first.technicalTie,
    },
    second: snap.second
      ? {
          lula: snap.second.lula.mean,
          flavio: snap.second.flavio.mean,
          se: snap.second.lula.se,
          tie: snap.second.technicalTie,
        }
      : null,
    pFlavio1: snap.probs.flavioLeadsFirst,
    pLula1: snap.probs.lulaLeadsFirst,
    pFlavio2: snap.probs.flavioWinsSecond,
    pLula2: snap.probs.lulaWinsSecond,
    snapshot: snap,
  };
}

const cache = new Map<string, Record<string, StateForecast>>();

export function runAllStateForecasts(
  cfg: EngineConfig = DEFAULT_CONFIG,
): Record<string, StateForecast> {
  const key = `${cfg.asOf}|${cfg.halfLifeDays}|${cfg.useTrackRecord}|${cfg.includeOnline}|${cfg.includeRemoto}|${cfg.extraVarPp}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: Record<string, StateForecast> = {};
  const ufs = new Set<string>();
  for (const s of STATE_SNAPSHOTS) ufs.add(s.uf);
  for (const p of allStatePolls()) {
    if (p.uf) ufs.add(p.uf);
  }
  for (const uf of ufs) {
    const f = runStateForecast(uf, cfg);
    if (f) out[uf] = f;
  }
  cache.set(key, out);
  return out;
}

export type BottomUpNational = {
  lula1: number;
  flavio1: number;
  lula2: number | null;
  flavio2: number | null;
  weight1: number;
  weight2: number;
};

/** Média das UFs com pesquisa, ponderada por eleitorado. Sem imputar 2º. */
export function bottomUpNational(
  cfg: EngineConfig = DEFAULT_CONFIG,
): BottomUpNational {
  const all = runAllStateForecasts(cfg);
  let w1 = 0;
  let l1 = 0;
  let f1 = 0;
  let w2 = 0;
  let l2 = 0;
  let f2 = 0;
  for (const [uf, snap] of Object.entries(all)) {
    const elec = UF_META[uf]?.electorateM ?? 0;
    if (elec <= 0) continue;
    w1 += elec;
    l1 += snap.first.lula * elec;
    f1 += snap.first.flavio * elec;
    if (snap.second) {
      w2 += elec;
      l2 += snap.second.lula * elec;
      f2 += snap.second.flavio * elec;
    }
  }
  return {
    lula1: w1 ? l1 / w1 : 0,
    flavio1: w1 ? f1 / w1 : 0,
    lula2: w2 ? l2 / w2 : null,
    flavio2: w2 ? f2 / w2 : null,
    weight1: w1,
    weight2: w2,
  };
}
