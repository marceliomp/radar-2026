import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Radio } from "lucide-react";
import { BrazilMap, MapLayerToggle, type MapLayer } from "@/features/radar/map/brazil-map";
import { HalfLifeControl } from "@/components/half-life-control";
import { ShareBar } from "@/components/share-bar";
import { SiteNav } from "@/components/site-nav";
import { TightRaces } from "@/components/tight-races";
import { VisitHook } from "@/components/visit-hook";
import { CANDIDATE_META, polls } from "@/data/polls";
import { useAsOf } from "@/lib/as-of";
import {
  DEFAULT_CONFIG,
  housesInAverage,
  runForecast,
  type EngineConfig,
  type ForecastPoll,
} from "@/lib/forecast/engine";
import {
  buildRunoffScenarios,
  type RunoffKey,
} from "@/lib/forecast/runoff-scenarios";
import { bottomUpNational } from "@/lib/forecast/states";
import { fmtMult, fmtNum, fmtPct, fmtProb, isShownTie, shownGap } from "@/lib/format";
import { useHalfLife } from "@/lib/half-life";
import { fileStamp } from "@/lib/visit-delta";
import { CHART } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

const FIELD_KEYS = ["lula", "flavio", "renan", "caiado", "zema", "cury"] as const;

function fmtDateBr(iso: string) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function gapPlain(a: number | undefined, b: number | undefined, se?: number) {
  if (a == null || b == null) return "Ainda poucas pesquisas perguntaram o 2º.";
  const gap = shownGap(a, b);
  const pts = fmtNum(Math.abs(gap));
  if (se != null && isShownTie(a, b, se)) {
    return `Empate técnico: ${pts} pontos de diferença, cabe na margem.`;
  }
  return `${gap > 0 ? "Lula" : "Flávio"} à frente por ${pts} pontos de intenção.`;
}

function FirstRoundField({
  first,
}: {
  first: Record<(typeof FIELD_KEYS)[number], { mean: number; nPolls?: number }>;
}) {
  const rows = FIELD_KEYS.map((key) => ({
    key,
    ...CANDIDATE_META[key],
    value: first[key].mean,
    nPolls: first[key].nPolls ?? 0,
  }))
    .filter((row) => row.key === "lula" || row.key === "flavio" || (row.nPolls > 0 && row.value > 0))
    .sort((a, b) => b.value - a.value);

  return (
    <ol className="mt-2">
      {rows.map((row, index) => (
        <li key={row.key} className="score-row">
          <span className="min-w-0 truncate">
            <span className="mr-2 font-mono text-xs text-cream/55">{index + 1}</span>
            <span className="font-semibold" style={{ color: row.color }}>{row.name}</span>
            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-cream">
              {row.party}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 font-mono tabular-nums",
              index === 0 ? "text-xl font-semibold sm:text-2xl" : "text-sm font-semibold",
            )}
            style={{ color: row.color }}
          >
            {fmtPct(row.value)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function pairChance(probability: number) {
  if (probability >= 0.995) return ">99%";
  if (probability < 0.005) return "<1%";
  return fmtProb(probability);
}

function SecondRoundScenarios({
  first,
  second,
  pollsForPairs,
}: {
  first: Record<RunoffKey, { mean: number; se: number; nPolls: number }>;
  second: Record<RunoffKey, { mean: number; se: number; nPolls: number }> | null;
  pollsForPairs: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number })[];
}) {
  const scenarios = useMemo(
    () => buildRunoffScenarios({ first, second, polls: pollsForPairs }),
    [first, second, pollsForPairs],
  );
  const hero =
    scenarios.find((scenario) => scenario.pairKey === "flavio|lula" && scenario.asked) ??
    scenarios.find((scenario) => scenario.asked) ??
    null;
  const rest = scenarios.filter(
    (scenario) => scenario.pairKey !== hero?.pairKey && scenario.asked,
  );

  if (!hero) {
    return <p className="mt-2 text-sm font-medium text-fg">Ainda poucas pesquisas perguntaram o 2º.</p>;
  }

  const left = CANDIDATE_META[hero.a];
  const right = CANDIDATE_META[hero.b];
  return (
    <div className="mt-2">
      {hero.a2 != null && hero.b2 != null ? (
        <div className="matchup">
          <div>
            <p className="text-sm font-semibold" style={{ color: left.color }}>{left.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream">{left.party}</p>
            <p className="matchup-num mt-1" style={{ color: left.color }}>{fmtPct(hero.a2)}</p>
          </div>
          <p className="pb-3 font-mono text-xs text-cream/40">×</p>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: right.color }}>{right.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream">{right.party}</p>
            <p className="matchup-num mt-1" style={{ color: right.color }}>{fmtPct(hero.b2)}</p>
          </div>
        </div>
      ) : null}
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/85">
        {hero.nAsked} pesquisas · par {pairChance(hero.pPair)} no 1º
      </p>
      {rest.length > 0 ? (
        <ol className="mt-3">
          {rest.map((scenario) => {
            const a = CANDIDATE_META[scenario.a];
            const b = CANDIDATE_META[scenario.b];
            return (
              <li key={scenario.pairKey} className="score-row">
                <span className="min-w-0 text-sm">
                  <span style={{ color: a.color }}>{a.name}</span>
                  <span className="text-cream/40"> × </span>
                  <span style={{ color: b.color }}>{b.name}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                  {scenario.a2 != null && scenario.b2 != null ? (
                    <>
                      <span style={{ color: a.color }}>{fmtPct(scenario.a2)}</span>
                      <span className="text-cream/40"> × </span>
                      <span style={{ color: b.color }}>{fmtPct(scenario.b2)}</span>
                      <span className="ml-2 text-cream/50">
                        {scenario.nAsked} · par {pairChance(scenario.pPair)}
                      </span>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

function latestPairRows(poll: ForecastPoll) {
  const rows: { a: RunoffKey; b: RunoffKey; aPct: number; bPct: number }[] = [];
  if (poll.secondRound?.lula != null && poll.secondRound.flavio != null) {
    rows.push({ a: "lula", b: "flavio", aPct: poll.secondRound.lula, bPct: poll.secondRound.flavio });
  }
  for (const pair of poll.secondPairs ?? []) {
    if (!FIELD_KEYS.includes(pair.a as RunoffKey) || !FIELD_KEYS.includes(pair.b as RunoffKey)) continue;
    rows.push({ a: pair.a as RunoffKey, b: pair.b as RunoffKey, aPct: pair.aPct, bPct: pair.bPct });
  }
  return rows;
}

export function PublicRadarPage() {
  const [asOf] = useAsOf();
  const [halfLife, setHalfLife] = useHalfLife();
  const [mapLayer, setMapLayer] = useState<MapLayer>("agg2026");

  const config = useMemo<EngineConfig>(() => {
    const base: EngineConfig = {
      ...DEFAULT_CONFIG,
      asOf,
      halfLifeDays: halfLife,
      extraVarPp: 1.15,
      useTrackRecord: true,
    };
    const draft = runForecast(polls, { ...base, simulations: 400 });
    const bottomUp = bottomUpNational(base);
    const disagree = bottomUp.weight1 > 0 && Math.abs(bottomUp.lula1 - draft.first.lula.mean) > 2;
    return { ...base, extraVarPp: disagree ? 1.8 : 1.15 };
  }, [asOf, halfLife]);

  const forecast = useMemo(() => runForecast(polls, config), [config]);
  const { first, second, probs, rows } = forecast;
  const latestNational = useMemo(
    () => polls
      .filter((poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.fieldEnd.localeCompare(a.fieldEnd))[0] ?? null,
    [asOf],
  );
  const pLula = Math.round(probs.lulaWinsElection * 1000) / 10;
  const pFlavio = Math.round(probs.flavioWinsElection * 1000) / 10;

  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
      <section className="hero-mast">
        <div className="hero-chrome">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <SiteNav className="min-w-0 flex-1" />
            <span className="hero-badge">Não é pesquisa</span>
          </div>
          <div className="hl-strip"><HalfLifeControl /></div>
        </div>
        <div className="hero-score">
          <div className="hero-col hero-col-l">
            <p className="hero-kicker" style={{ color: CHART.lula }}>Lula</p>
            <p className="hero-num" style={{ color: CHART.lula }}>{fmtProb(probs.lulaWinsElection).replace("%", "")}</p>
          </div>
          <div className="hero-col hero-col-f">
            <p className="hero-kicker" style={{ color: CHART.flavio }}>Flávio</p>
            <p className="hero-num" style={{ color: CHART.flavio }}>{fmtProb(probs.flavioWinsElection).replace("%", "")}</p>
          </div>
        </div>
        <p className="hero-method">1º + 2º nos pares que as casas perguntaram</p>
        <p className="hero-fresh">{fileStamp(latestNational)}</p>
        <VisitHook
          pLula={pLula}
          pFlavio={pFlavio}
          hl={halfLife}
          newestId={latestNational?.id ?? ""}
        />
        <div className="hook-rail">
          <a href="#novo" className="hook-link">O que entrou</a>
          <a href="#mapa" className="hook-link">E no seu estado?</a>
          <a href="#pares" className="hook-link">Os pares do 2º</a>
          <button type="button" className="hook-link" onClick={() => setHalfLife(halfLife <= 5 ? 40 : 5)}>
            {halfLife <= 5 ? "Período longo" : "Só o recente"}
          </button>
        </div>
      </section>

      <div className="page-body mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
        <header className="mb-6 space-y-4">
          <div className="board-split">
            <div className="board-card border-0 sm:border-r sm:border-border">
              <p className="kicker">1º turno</p>
              <FirstRoundField first={first} />
              <p className="mt-3 text-xs font-medium leading-relaxed text-cream/85">
                {gapPlain(first.lula.mean, first.flavio.mean, first.seGap)} · Lula à frente em {fmtProb(probs.lulaLeadsFirst)} das simulações
              </p>
              <p className="mt-3"><a href="#pares" className="hook-link">E no 2º turno?</a></p>
            </div>
            <div className="board-card border-0 border-t border-border sm:border-t-0">
              <p className="kicker" id="pares">2º turno</p>
              <SecondRoundScenarios
                first={first}
                second={second}
                pollsForPairs={rows.map((row) => ({ ...row.poll, weight: row.weight }))}
              />
              <p className="mt-3"><a href="#mapa" className="hook-link">E no seu estado?</a></p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-fg">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0 text-primary" />Atualizado {fmtDateBr(config.asOf)}</span>
              <span className="inline-flex items-center gap-1.5"><Radio className="size-4 shrink-0 text-primary" />{rows.length} pesquisas nacionais</span>
            </div>
            <ShareBar
              asOf={fmtDateBr(config.asOf)}
              lula1={first.lula.mean}
              flavio1={first.flavio.mean}
              lula2={second?.lula.mean ?? 0}
              flavio2={second?.flavio.mean ?? 0}
              pLula={probs.lulaWinsElection}
              pFlavio={probs.flavioWinsElection}
            />
          </div>
          <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {housesInAverage(rows).slice(0, 6).map((house, index) => (
              <span key={house.institute} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg">
                <span className="text-gold">{index + 1}.</span>{house.institute}
                <span className="tabular-nums text-cream/80">{fmtPct(house.share * 100, 0)} do peso</span>
                <span className="tabular-nums text-primary">×{fmtMult(house.quality)}</span>
              </span>
            ))}
          </div>
        </header>

        {latestNational ? (
          <section id="novo" className="mb-6">
            <div className="board-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1.5">
                  <p className="eyebrow">Nova pesquisa</p>
                  <p className="font-display text-xl font-semibold">{latestNational.institute}</p>
                  <p className="text-sm font-medium text-gold">
                    {latestNational.date.slice(8)}/{latestNational.date.slice(5, 7)} · {latestNational.mode} · n={latestNational.sample.toLocaleString("pt-BR")} · ±{fmtNum(latestNational.moe)} pp
                  </p>
                  {latestNational.notes ? <p className="max-w-xl text-xs font-medium leading-relaxed text-fg">{latestNational.notes}</p> : null}
                </div>
                <div className="grid gap-6 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                  <div>
                    <p className="text-xs font-medium text-gold">1º turno</p>
                    <ul className="mt-1 space-y-0.5 text-sm font-semibold tabular-nums">
                      {FIELD_KEYS
                        .filter((key) => latestNational.firstRound[key] != null)
                        .sort((a, b) => (latestNational.firstRound[b] ?? 0) - (latestNational.firstRound[a] ?? 0))
                        .map((key) => (
                          <li key={key} className="flex justify-between gap-3">
                            <span style={{ color: CANDIDATE_META[key].color }}>{CANDIDATE_META[key].name}</span>
                            <span style={{ color: CANDIDATE_META[key].color }}>{fmtPct(latestNational.firstRound[key] ?? 0)}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gold">2º turno</p>
                    <ul className="mt-1">
                      {latestPairRows(latestNational).map((pair) => (
                        <li key={`${pair.a}|${pair.b}`} className="score-row py-1">
                          <span className="min-w-0 text-sm">
                            <span style={{ color: CANDIDATE_META[pair.a].color }}>{CANDIDATE_META[pair.a].name}</span>
                            <span className="text-cream/40"> × </span>
                            <span style={{ color: CANDIDATE_META[pair.b].color }}>{CANDIDATE_META[pair.b].name}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums">{fmtPct(pair.aPct)} × {fmtPct(pair.bPct)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <TightRaces />
        <section id="mapa" className="space-y-3 scroll-mt-24">
          <p className="kicker">Mapa</p>
          <p className="text-sm font-medium text-cream/85">Clique no estado. Abre governadores.</p>
          <MapLayerToggle layer={mapLayer} onChange={setMapLayer} />
          <BrazilMap config={config} layer={mapLayer} />
          <p className="tight-next">
            <Link to="/lab" className="hook-link">Metodo, pesos e acerto historico</Link>
            <span className="text-cream/35"> · </span>
            <Link to="/candidatos" search={{ uf: "SP", cargo: "governador", asOf, hl: halfLife }} className="hook-link">
              SP tem 2 casas. Compara.
            </Link>
          </p>
        </section>
        <footer className="mt-10 border-t border-border pt-6 text-center text-xs font-medium text-muted">
          v3 · portal independente · peso 2014, 2018 e 2022 · não é instituto oficial
        </footer>
      </div>
    </div>
  );
}
