import { polls } from "@/data/polls";
import {
  DEFAULT_CONFIG,
  runForecast,
  type EngineConfig,
} from "@/lib/forecast/engine";
import { bottomUpNational } from "@/lib/forecast/states";

export const EXTRA_VAR_TIGHT = 1.15;
export const EXTRA_VAR_WIDE = 1.8;
const GAP_PP = 2;

const cache = new Map<string, number>();

function keyWithoutHalfLife(cfg: EngineConfig): string {
  return [
    cfg.asOf,
    cfg.useTrackRecord ? "1" : "0",
    cfg.useTrackHouse ? "1" : "0",
    cfg.includeOnline ? "1" : "0",
    cfg.includeRemoto ? "1" : "0",
    cfg.includeModelo ? "1" : "0",
  ].join("|");
}

export function extraVarFromMapGap(base: EngineConfig): number {
  const cfg = { ...base, extraVarPp: EXTRA_VAR_TIGHT };
  const draft = runForecast(polls, { ...cfg, simulations: 400 });
  const bottomUp = bottomUpNational(cfg);
  if (
    bottomUp.weight1 > 0 &&
    Math.abs(bottomUp.lula1 - draft.first.lula.mean) > GAP_PP
  ) {
    return EXTRA_VAR_WIDE;
  }
  return EXTRA_VAR_TIGHT;
}

/** Map-vs-national extra variance. Cached without half-life so the period slider stays cheap. */
export function extraVarCached(base: EngineConfig): number {
  const key = keyWithoutHalfLife(base);
  const hit = cache.get(key);
  if (hit != null) return hit;
  const value = extraVarFromMapGap(base);
  cache.set(key, value);
  return value;
}

export function publicEngineConfig(
  asOf: string,
  halfLifeDays: number,
  extraVarPp = EXTRA_VAR_TIGHT,
): EngineConfig {
  return {
    ...DEFAULT_CONFIG,
    asOf,
    halfLifeDays,
    extraVarPp,
    useTrackRecord: true,
  };
}
