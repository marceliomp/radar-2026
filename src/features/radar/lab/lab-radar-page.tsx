import { useMemo, useState } from "react";
import { CalendarDays, Radio } from "lucide-react";
import { useAsOf } from "@/lib/as-of";
import { useHalfLife } from "@/lib/half-life";
import { polls, CANDIDATE_META } from "@/data/polls";
import { type MapLayer } from "@/features/radar/map/brazil-map";
import {
  DEFAULT_CONFIG,
  housesInAverage,
  runForecast,
  type EngineConfig,
} from "@/lib/forecast/engine";
import { bottomUpNational } from "@/lib/forecast/states";
import {
  buildNationalTrend,
  rollingAverage,
  sameHouseDeltas,
  windowMomentum,
} from "@/lib/forecast/trends";
import { fmtDelta, fmtMult, fmtNum, fmtPct, fmtProb } from "@/lib/format";
import { trackQuality } from "@/lib/forecast/track-record";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBar } from "@/components/share-bar";
import { SiteNav } from "@/components/site-nav";
import {
  FIRST_KEYS,
  FirstRoundField,
  SecondRoundScenarios,
  fmtDateBr,
  gapPlain,
  nextUpcoming,
  pollAskedPairs,
  pollFirstRoundRows,
} from "./lab-shared";
import { MapTab } from "./tabs/map-tab";
import { AgendaTab } from "./tabs/agenda-tab";
import { TrackTab } from "./tabs/track-tab";
import { TrendsTab } from "./tabs/trends-tab";
import { RunoffTab } from "./tabs/runoff-tab";
import { HousesTab } from "./tabs/houses-tab";
import { MethodTab } from "./tabs/method-tab";
import { WeightsTab } from "./tabs/weights-tab";
import { ControlsTab } from "./tabs/controls-tab";

export function LabRadarPage() {
  const [asOf] = useAsOf();
  const [halfLife, setHalfLife] = useHalfLife();
  const [includeOnline, setIncludeOnline] = useState(true);
  const [includeRemoto, setIncludeRemoto] = useState(true);
  const [includeModelo, setIncludeModelo] = useState(false);
  const [houseOn, setHouseOn] = useState(false);
  const [useTrackRecord, setUseTrackRecord] = useState(true);
  const [useTrackHouse, setUseTrackHouse] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayer>("agg2026");

  const config: EngineConfig = useMemo(() => {
    const base: EngineConfig = {
      ...DEFAULT_CONFIG,
      asOf,
      extraVarPp: 1.15,
      halfLifeDays: halfLife,
      includeOnline,
      includeRemoto,
      includeModelo,
      houseEffects: houseOn ? DEFAULT_CONFIG.houseEffects : {},
      useTrackRecord,
      useTrackHouse: houseOn && useTrackHouse,
    };
    const draft = runForecast(polls, { ...base, simulations: 400 });
    const bu = bottomUpNational(base);
    const disagree =
      bu.weight1 > 0 && Math.abs(bu.lula1 - draft.first.lula.mean) > 2;
    return { ...base, extraVarPp: disagree ? 1.8 : 1.15 };
  }, [
    halfLife,
    includeOnline,
    includeRemoto,
    includeModelo,
    houseOn,
    asOf,
    useTrackRecord,
    useTrackHouse,
  ]);

  const forecast = useMemo(() => runForecast(polls, config), [config]);
  const { first, second, probs, rows } = forecast;

  const visiblePolls = useMemo(
    () => polls.filter((p) => p.date <= asOf && p.fieldEnd <= asOf),
    [asOf],
  );
  const trend = useMemo(() => buildNationalTrend(visiblePolls), [visiblePolls]);
  const smooth = useMemo(() => rollingAverage(trend, 3), [trend]);
  const deltas = useMemo(() => sameHouseDeltas(visiblePolls), [visiblePolls]);
  const mom = useMemo(() => windowMomentum(trend), [trend]);

  const qualityBars = useMemo(() => {
    const names = [
      ...new Set(visiblePolls.filter((p) => p.national).map((p) => p.institute)),
    ];
    return names
      .map((name) => ({
        name: name.length > 14 ? name.slice(0, 12) + "…" : name,
        full: name,
        quality: trackQuality(name),
      }))
      .sort((a, b) => b.quality - a.quality);
  }, [visiblePolls]);

  const barData = FIRST_KEYS.filter(
    (key) =>
      key === "lula" ||
      key === "flavio" ||
      (first[key].nPolls > 0 && first[key].mean > 0),
  ).map((key) => ({
    name: CANDIDATE_META[key].name,
    value: first[key].mean,
    fill: CANDIDATE_META[key].color,
  })).sort((a, b) => b.value - a.value);

  const gap1Chart = smooth.map((p) => ({
    label: p.label,
    institute: p.institute,
    published: p.published,
    fieldStart: p.fieldStart,
    fieldEnd: p.fieldEnd,
    gap: p.gap1,
    gapAvg: p.gap1Avg,
  }));

  const growth1Chart = smooth.map((p) => ({
    label: p.label,
    institute: p.institute,
    published: p.published,
    fieldStart: p.fieldStart,
    fieldEnd: p.fieldEnd,
    Lula: p.lula1,
    Flávio: p.flavio1,
    "Lula (média 3)": p.lula1Avg,
    "Flávio (média 3)": p.flavio1Avg,
  }));

  const round2Chart = trend
    .filter((p) => p.lula2 != null && p.flavio2 != null)
    .map((p) => ({
      label: p.label,
      institute: p.institute,
      published: p.published,
      fieldStart: p.fieldStart,
      fieldEnd: p.fieldEnd,
      Lula: p.lula2,
      Flávio: p.flavio2,
      gap: p.gap2,
    }));

  const gap2Chart = smooth
    .filter((p) => p.gap2 != null || p.gap2Avg != null)
    .map((p) => ({
      label: p.label,
      institute: p.institute,
      published: p.published,
      fieldStart: p.fieldStart,
      fieldEnd: p.fieldEnd,
      gap: p.gap2,
      gapAvg: p.gap2Avg,
    }));

  const melhoraBars = deltas.map((d) => ({
    name: `${d.institute.split("/")[0]} ${d.to.slice(5)}`,
    "Δ Flávio 1º": d.dFlavio1,
    "Δ Lula 1º": d.dLula1,
    "Δ gap (L−F)": d.dGap1,
  }));

  const statePolls = visiblePolls.filter((p) => !p.national);

  const latestNational = useMemo(
    () =>
      visiblePolls
        .filter((p) => p.national)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.fieldEnd.localeCompare(a.fieldEnd))[0],
    [visiblePolls],
  );

  const upcoming = nextUpcoming(config.asOf);
  const daysLeft = upcoming
    ? Math.max(
        0,
        Math.round(
          (Date.parse(`${upcoming.date}T12:00:00-03:00`) - Date.now()) /
            86_400_000,
        ),
      )
    : null;

  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
    <div className="page-body mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
      <SiteNav className="mb-5" />
      <header className="mb-6 space-y-4">
        <div className="board-split">
          <div className="board-card border-0 sm:border-r sm:border-border">
            <p className="kicker">1º turno</p>
            <FirstRoundField first={first} />
            <p className="mt-3 text-xs font-medium leading-relaxed text-cream/85">
              {gapPlain(first.technicalTie, first.lula.mean, first.flavio.mean, first.seGap)}
              {" · "}
              Lula à frente em {fmtProb(probs.lulaLeadsFirst)} das simulações
            </p>
            <p className="mt-3">
              <a href="#pares" className="hook-link">
                E no 2º turno?
              </a>
            </p>
          </div>
          <div className="board-card border-0 border-t border-border sm:border-t-0">
            <p className="kicker" id="pares">2º turno</p>
            <SecondRoundScenarios
              first={first}
              second={second}
              pollsForPairs={rows.map((r) => ({ ...r.poll, weight: r.weight }))}
            />
            <p className="mt-3">
              <a href="#mapa" className="hook-link">
                E no seu estado?
              </a>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-fg">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              Atualizado {fmtDateBr(config.asOf)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Radio className="size-4 shrink-0 text-primary" />
              {rows.length} pesquisas nacionais
            </span>
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
          {housesInAverage(rows).slice(0, 6).map((r, i) => (
            <span
              key={r.institute}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg"
            >
              <span className="text-gold">{i + 1}.</span>
              {r.institute}
              <span className="tabular-nums text-cream/80">
                {fmtPct(r.share * 100, 0)} do peso
              </span>
              <span className="tabular-nums text-primary">
                ×{fmtMult(r.quality)}
              </span>
            </span>
          ))}
        </div>
      </header>

      {latestNational && (
        <section id="novo" className="mb-6">
          <div className="board-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <p className="eyebrow">Nova pesquisa</p>
                <p className="font-display text-xl font-semibold">
                  {latestNational.institute}
                </p>
                <p className="text-sm font-medium text-gold">
                  {latestNational.date.slice(8)}/
                  {latestNational.date.slice(5, 7)} · {latestNational.mode} · n=
                  {latestNational.sample.toLocaleString("pt-BR")} · ±
                  {fmtNum(latestNational.moe)} pp
                </p>
                {latestNational.notes && (
                  <p className="max-w-xl text-xs font-medium leading-relaxed text-fg">
                    {latestNational.notes}
                  </p>
                )}
              </div>
              <div className="grid gap-6 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                <div>
                  <p className="text-xs font-medium text-gold">1º turno</p>
                  <ul className="mt-1 space-y-0.5 text-sm font-semibold tabular-nums">
                    {pollFirstRoundRows(latestNational)
                      .filter((r) => r.asked)
                      .map((r) => (
                      <li key={r.key} className="flex justify-between gap-3">
                        <span style={{ color: r.color }}>{r.name}</span>
                        <span style={{ color: r.color }}>{fmtPct(r.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-gold">2º turno</p>
                  {pollAskedPairs(latestNational).length ? (
                    <ul className="mt-1">
                      {pollAskedPairs(latestNational).map((pair) => {
                        const a = CANDIDATE_META[pair.a];
                        const b = CANDIDATE_META[pair.b];
                        return (
                          <li key={`${pair.a}|${pair.b}`} className="score-row py-1">
                            <span className="min-w-0 text-sm">
                              <span style={{ color: a.color }}>{a.name}</span>
                              <span className="text-cream/40"> × </span>
                              <span style={{ color: b.color }}>{b.name}</span>
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums">
                              <span style={{ color: a.color }}>{fmtPct(pair.aPct)}</span>
                              <span className="text-cream/40"> × </span>
                              <span style={{ color: b.color }}>{fmtPct(pair.bPct)}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-cream/70">sem 2º</p>
                  )}
                  <p className="mt-3">
                    <a href="#pares" className="hook-link">
                      E no agregado dos pares?
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="border-flavio/35 glow-flavio bg-gradient-to-br from-surface to-flavio/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-gold">
              Flávio no 1º, pesquisas antigas → recentes
            </p>
            <p className="num-flavio mt-1 font-display text-2xl font-semibold tabular-nums">
              {fmtDelta(mom.dFlavio1)} pp
            </p>
            <p className="text-xs font-medium text-fg">
              {fmtNum(mom.earlyFlavio1)}% → {fmtNum(mom.lateFlavio1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-lula/35 glow-lula bg-gradient-to-br from-surface to-lula/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-gold">
              Lula no 1º, pesquisas antigas → recentes
            </p>
            <p className="num-lula mt-1 font-display text-2xl font-semibold tabular-nums">
              {fmtDelta(mom.dLula1)} pp
            </p>
            <p className="text-xs font-medium text-fg">
              {fmtNum(mom.earlyLula1)}% → {fmtNum(mom.lateLula1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-accent/35 bg-gradient-to-br from-surface to-accent/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-gold">
              Diferença no 1º (caiu = mais colado)
            </p>
            <p className="num-accent mt-1 font-display text-2xl font-semibold tabular-nums">
              {fmtDelta(mom.dGap1)} pp
            </p>
            <p className="text-xs font-medium text-fg">
              {fmtNum(mom.earlyGap1)} → {fmtNum(mom.lateGap1)} pp
            </p>
          </CardContent>
        </Card>
      </section>
      <Tabs defaultValue="mapa" className="w-full">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto min-h-11 w-max min-w-0 flex-nowrap">
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="track">Acerto</TabsTrigger>
            <TabsTrigger value="crescimento">Curva</TabsTrigger>
            <TabsTrigger value="segundo">2º turno</TabsTrigger>
            <TabsTrigger value="melhora">Casas</TabsTrigger>
            <TabsTrigger value="modelo">Método</TabsTrigger>
            <TabsTrigger value="weights">Pesos</TabsTrigger>
            <TabsTrigger value="controls">Ajustes</TabsTrigger>
          </TabsList>
        </div>

                <MapTab mapLayer={mapLayer} setMapLayer={setMapLayer} config={config} />

        {/* AGENDA */}
                <AgendaTab upcoming={upcoming} daysLeft={daysLeft} />

        {/* TRACK 2022 */}
                <TrackTab qualityBars={qualityBars} />

        {/* CRESCIMENTO */}
                <TrendsTab growth1Chart={growth1Chart} gap1Chart={gap1Chart} />

        {/* 2º */}
                <RunoffTab mom={mom} probs={probs} round2Chart={round2Chart} gap2Chart={gap2Chart} />

        {/* MELHORA */}
                <HousesTab deltas={deltas} melhoraBars={melhoraBars} />

        {/* MODELO */}
                <MethodTab barData={barData} statePolls={statePolls} />

        {/* PESOS */}
                <WeightsTab rows={rows} />

        {/* CONTROLES */}
                <ControlsTab includeOnline={includeOnline} setIncludeOnline={setIncludeOnline} includeRemoto={includeRemoto} setIncludeRemoto={setIncludeRemoto} includeModelo={includeModelo} setIncludeModelo={setIncludeModelo} houseOn={houseOn} setHouseOn={setHouseOn} useTrackRecord={useTrackRecord} setUseTrackRecord={setUseTrackRecord} useTrackHouse={useTrackHouse} setUseTrackHouse={setUseTrackHouse} />
      </Tabs>


      <footer className="mt-10 border-t border-border pt-6 text-center text-xs font-medium text-muted">
        v3 · portal independente · peso 2014, 2018 e 2022 · não é instituto oficial
      </footer>
    </div>
    </div>
  );
}
