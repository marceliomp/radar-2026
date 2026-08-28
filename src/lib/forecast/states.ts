import { polls } from "@/data/polls";
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
    sample: 800,
    moe: s.moe,
    mode: "presencial",
    national: false,
    uf: s.uf,
    firstRound: { lula: s.lula1, flavio: s.flavio1 },
    secondRound:
      s.lula2 != null && s.flavio2 != null
        ? { lula: s.lula2, flavio: s.flavio2 }
        : undefined,
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
    imputeSecond: true,
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
    pFlavio2: snap.probs.flavioWinsSecond,
    pLula2: snap.probs.lulaWinsSecond,
    snapshot: snap,
  };
}

const cache = new Map<string, Record<string, StateForecast>>();

export function runAllStateForecasts(
  cfg: EngineConfig = DEFAULT_CONFIG,
): Record<string, StateForecast> {
  const key = `${cfg.asOf}|${cfg.halfLifeDays}|${cfg.useTrackRecord}|${cfg.includeOnline}|${cfg.includeRemoto}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: Record<string, StateForecast> = {};
  for (const s of STATE_SNAPSHOTS) {
    const f = runStateForecast(s.uf, cfg);
    if (f) out[s.uf] = f;
  }
  cache.set(key, out);
  return out;
}
