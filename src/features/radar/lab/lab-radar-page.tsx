import { useMemo, useState } from "react";
import { useAsOf } from "@/lib/as-of";
import { useHalfLife } from "@/lib/half-life";
import { polls, CANDIDATE_META } from "@/data/polls";
import { type MapLayer } from "@/features/radar/map/brazil-map";
import {
  DEFAULT_CONFIG,
  runForecast,
  type EngineConfig,
} from "@/lib/forecast/engine";
import { extraVarCached } from "@/lib/forecast/extra-var";
import {
  buildNationalTrend,
  rollingAverage,
  sameHouseDeltas,
  windowMomentum,
} from "@/lib/forecast/trends";
import { trackQuality } from "@/lib/forecast/track-record";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HalfLifeControl } from "@/components/half-life-control";
import { MastBar } from "@/components/site-nav";
import { useI18n } from "@/lib/i18n";
import {
  FIRST_KEYS,
  nextUpcoming,
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
  const { locale, m, fmt } = useI18n();

  const [asOf] = useAsOf();
  const [halfLife] = useHalfLife();
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
    return { ...base, extraVarPp: extraVarCached(base) };
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
  const { first, probs, rows } = forecast;

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
      <MastBar className="mb-5" />
      <header className="mb-6 max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{locale === "en" ? "How the model works" : "Como funciona o modelo"}</h1>
        <p className="text-sm leading-relaxed text-muted">{locale === "en" ? "We combine polls, weight their recency and sample size, and estimate uncertainty. Vote intention and election probability are different measures." : "Combinamos pesquisas, ponderamos a recência e o tamanho da amostra e estimamos a incerteza. Intenção de voto e chance de eleição são medidas diferentes."}</p>
        <p className="text-sm text-muted">{m.lab.updated(fmt.date(config.asOf))} · {m.lab.nationalPolls(rows.length)}</p>
      </header>
      <details className="mb-6 rounded-lg border border-border bg-surface p-4">
        <summary className="cursor-pointer font-semibold">{locale === "en" ? "Adjust the model" : "Ajustar modelo"}</summary>
        <div className="mt-4"><HalfLifeControl /></div>
      </details>

      <Tabs defaultValue="modelo" className="w-full">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto min-h-11 w-max min-w-0 flex-nowrap">
            <TabsTrigger value="modelo">{m.lab.tabMethod}</TabsTrigger>
            <TabsTrigger value="weights">{m.lab.tabWeights}</TabsTrigger>
            <TabsTrigger value="mapa">{m.lab.tabMap}</TabsTrigger>
            <TabsTrigger value="agenda">{m.lab.tabAgenda}</TabsTrigger>
            <TabsTrigger value="track">{m.lab.tabTrack}</TabsTrigger>
            <TabsTrigger value="crescimento">{m.lab.tabCurve}</TabsTrigger>
            <TabsTrigger value="segundo">{m.lab.tabSecond}</TabsTrigger>
            <TabsTrigger value="melhora">{m.lab.tabHouses}</TabsTrigger>
            <TabsTrigger value="controls">{m.lab.tabControls}</TabsTrigger>
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
        {m.lab.footer}
      </footer>
    </div>
    </div>
  );
}
