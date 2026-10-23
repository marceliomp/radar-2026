import { polls } from "@/data/polls";
import { extraVarCached, publicEngineConfig } from "@/lib/forecast/extra-var";
import { runForecast, todayAsOf } from "@/lib/forecast/engine";
import { DEFAULT_HALF_LIFE } from "@/lib/half-life";
import type { RunoffPrior } from "@/lib/apuracao/projection";

/** A mesma previsão da home (meia-vida padrão), para a projeção começar na chance publicada. */
export function runoffPrior(): RunoffPrior {
  const base = publicEngineConfig(todayAsOf(), DEFAULT_HALF_LIFE);
  const forecast = runForecast(polls, publicEngineConfig(todayAsOf(), DEFAULT_HALF_LIFE, extraVarCached(base)));
  const f = forecast.second?.flavio.mean ?? 50;
  const l = forecast.second?.lula.mean ?? 50;
  return { flavioShare: f / (f + l), flavioChance: forecast.probs.flavioWinsElection };
}
