import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Beaker,
  CalendarClock,
  CalendarDays,
  Info,
  MapPin,
  Medal,
  Radio,
  Scale,
  Settings2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { polls, CANDIDATE_META } from "@/data/polls";
import { CALENDAR, UF_META } from "@/data/calendar";
import { BrazilMap } from "@/components/brazil-map";
import {
  DEFAULT_CONFIG,
  runForecast,
  type EngineConfig,
} from "@/lib/forecast/engine";
import {
  buildNationalTrend,
  rollingAverage,
  sameHouseDeltas,
  windowMomentum,
} from "@/lib/forecast/trends";
import { fmtDelta, fmtMult, fmtNum, fmtPct, fmtProb } from "@/lib/format";
import {
  ELECTION_2022_2T,
  TRACK_2022,
  TRACK_RANKING_DISPLAY,
  trackQuality,
} from "@/lib/forecast/track-record";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CHART, tipStyle } from "@/lib/chart-theme";
import { ShareBar } from "@/components/share-bar";

function pollTipLabel(payload: unknown): string {
  const row = Array.isArray(payload)
    ? (payload[0] as { payload?: { institute?: string; published?: string; fieldEnd?: string } } | undefined)
        ?.payload
    : undefined;
  if (!row?.institute) return "";
  const pub = row.published?.slice(8) + "/" + row.published?.slice(5, 7);
  const field = row.fieldEnd?.slice(8) + "/" + row.fieldEnd?.slice(5, 7);
  return `${row.institute} · ${pub} (campo ${field})`;
}

const POLL_XAXIS = {
  dataKey: "label" as const,
  interval: 0 as const,
  angle: -40,
  textAnchor: "end" as const,
  height: 70,
  tick: { fill: CHART.axis, fontSize: 10, fontWeight: 500 },
  axisLine: false,
  tickLine: false,
};

function ProbBar({
  leftLabel,
  rightLabel,
  leftPct,
  leftColor,
  rightColor,
}: {
  leftLabel: string;
  rightLabel: string;
  leftPct: number;
  leftColor: string;
  rightColor: string;
}) {
  const l = Math.round(leftPct * 1000) / 10;
  const r = Math.round((1 - leftPct) * 1000) / 10;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-semibold">
        <span style={{ color: leftColor }}>
          {leftLabel} {fmtNum(l)}%
        </span>
        <span style={{ color: rightColor }}>
          {rightLabel} {fmtNum(r)}%
        </span>
      </div>
      <div className="prob-track flex h-3.5 overflow-hidden rounded-full sm:h-4">
        <div
          className="transition-all duration-500"
          style={{
            width: `${l}%`,
            background: `linear-gradient(90deg, ${leftColor}cc, ${leftColor})`,
            boxShadow: `0 0 16px ${leftColor}55`,
          }}
        />
        <div
          className="transition-all duration-500"
          style={{
            width: `${r}%`,
            background: `linear-gradient(90deg, ${rightColor}, ${rightColor}cc)`,
            boxShadow: `0 0 16px ${rightColor}55`,
          }}
        />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2/50 px-3 py-2 text-sm">
      <span className="text-fg">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-primary-fg shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}

function DeltaPill({
  value,
  invert = false,
}: {
  value: number;
  invert?: boolean;
}) {
  const good = invert ? value < -0.15 : value > 0.15;
  const bad = invert ? value > 0.15 : value < -0.15;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        good && "bg-accent/15 text-accent",
        bad && "bg-danger/15 text-danger",
        !good && !bad && "bg-surface-2 text-muted",
      )}
    >
      {good ? (
        <TrendingUp className="size-3" />
      ) : bad ? (
        <TrendingDown className="size-3" />
      ) : null}
      {fmtDelta(value)}
    </span>
  );
}

export function ForecastDashboard() {
  const [halfLife, setHalfLife] = useState(14);
  const [includeOnline, setIncludeOnline] = useState(true);
  const [includeRemoto, setIncludeRemoto] = useState(true);
  const [includeModelo, setIncludeModelo] = useState(false);
  const [houseOn, setHouseOn] = useState(true);
  const [useTrackRecord, setUseTrackRecord] = useState(true);
  const [useTrackHouse, setUseTrackHouse] = useState(true);

  const config: EngineConfig = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      halfLifeDays: halfLife,
      includeOnline,
      includeRemoto,
      includeModelo,
      houseEffects: houseOn ? DEFAULT_CONFIG.houseEffects : {},
      useTrackRecord,
      useTrackHouse: houseOn && useTrackHouse,
    }),
    [
      halfLife,
      includeOnline,
      includeRemoto,
      includeModelo,
      houseOn,
      useTrackRecord,
      useTrackHouse,
    ],
  );

  const forecast = useMemo(() => runForecast(polls, config), [config]);
  const baseline = useMemo(
    () =>
      runForecast(polls, {
        ...config,
        useTrackRecord: false,
        useTrackHouse: false,
        houseEffects: houseOn ? DEFAULT_CONFIG.houseEffects : {},
      }),
    [config, houseOn],
  );
  const { first, second, probs, rows } = forecast;

  const trend = useMemo(() => buildNationalTrend(polls), []);
  const smooth = useMemo(() => rollingAverage(trend, 3), [trend]);
  const deltas = useMemo(() => sameHouseDeltas(polls), []);
  const mom = useMemo(() => windowMomentum(trend), [trend]);

  const qualityBars = useMemo(() => {
    const names = [
      ...new Set(polls.filter((p) => p.national).map((p) => p.institute)),
    ];
    return names
      .map((name) => ({
        name: name.length > 14 ? name.slice(0, 12) + "…" : name,
        full: name,
        quality: trackQuality(name),
      }))
      .sort((a, b) => b.quality - a.quality);
  }, []);

  const barData = [
    {
      name: "Lula",
      value: first.lula.mean,
      fill: CANDIDATE_META.lula.color,
    },
    {
      name: "Flávio",
      value: first.flavio.mean,
      fill: CANDIDATE_META.flavio.color,
    },
    {
      name: "Renan",
      value: first.renan.mean,
      fill: CANDIDATE_META.renan.color,
    },
  ];

  const gap1Chart = smooth.map((p) => ({
    label: p.label,
    institute: p.institute,
    published: p.published,
    fieldEnd: p.fieldEnd,
    gap: p.gap1,
    gapAvg: p.gap1Avg,
  }));

  const growth1Chart = smooth.map((p) => ({
    label: p.label,
    institute: p.institute,
    published: p.published,
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

  const statePolls = polls.filter((p) => !p.national);

  const latestNational = useMemo(
    () =>
      polls
        .filter((p) => p.national)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.fieldEnd.localeCompare(a.fieldEnd))[0],
    [],
  );

  const dLula1 =
    first.lula.mean - baseline.first.lula.mean;
  const dFlavio1 =
    first.flavio.mean - baseline.first.flavio.mean;
  const dP2 =
    probs.lulaWinsSecond - baseline.probs.lulaWinsSecond;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-[calc(var(--grok-banner-h,0px)+1.25rem)] sm:px-6">
      <header className="mb-8 space-y-5">
        <p className="eyebrow">Alvo BR · eleição 2026</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Radar 2026
        </h1>
        <p className="max-w-2xl text-base font-medium leading-relaxed text-muted">
          Não é uma pesquisa. É o agregador: recência, amostra, presencial vs
          telefone, house effect e Monte Carlo. Feito pra ser compartilhado —
          não pra virar print de uma casa só.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              1º turno
            </p>
            <p className="mt-2 flex items-baseline justify-between gap-3 font-display text-3xl font-semibold tabular-nums">
              <span className="num-lula">{fmtPct(first.lula.mean)}</span>
              <span className="text-sm font-medium text-muted">Lula × Flávio</span>
              <span className="num-flavio">{fmtPct(first.flavio.mean)}</span>
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              2º turno · {second?.technicalTie ? "empate técnico" : "liderança"}
            </p>
            <p className="mt-2 flex items-baseline justify-between gap-3 font-display text-3xl font-semibold tabular-nums">
              <span className="num-lula">{fmtPct(second?.lula.mean ?? 0)}</span>
              <span className="text-sm font-medium text-muted">Lula × Flávio</span>
              <span className="num-flavio">{fmtPct(second?.flavio.mean ?? 0)}</span>
            </p>
          </div>
        </div>
        <ShareBar
          lula1={first.lula.mean}
          flavio1={first.flavio.mean}
          lula2={second?.lula.mean ?? 0}
          flavio2={second?.flavio.mean ?? 0}
        />
        <div className="flex flex-wrap gap-3 text-xs text-muted sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" />
            as-of 28 ago 2026
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Radio className="size-4 text-primary" />
            varredura 9h e 18h BRT
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Beaker className="size-4 text-primary" />
            {rows.length} polls nacionais
          </span>
        </div>
      </header>

      {latestNational && (
        <section className="mb-6">
          <Card className="border-primary/40 bg-gradient-to-br from-surface via-surface to-primary/10">
            <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <p className="eyebrow">Nova pesquisa</p>
                <p className="font-display text-xl font-semibold">
                  {latestNational.institute}
                </p>
                <p className="text-sm font-medium text-muted">
                  {latestNational.date.slice(8)}/
                  {latestNational.date.slice(5, 7)} · {latestNational.mode} · n=
                  {latestNational.sample.toLocaleString("pt-BR")} · ±
                  {fmtNum(latestNational.moe)} pp
                </p>
                {latestNational.notes && (
                  <p className="max-w-xl text-xs font-medium leading-relaxed text-muted">
                    {latestNational.notes}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted">1º turno</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    <span className="num-lula">
                      {fmtPct(latestNational.firstRound.lula ?? 0)}
                    </span>
                    <span className="text-muted"> × </span>
                    <span className="num-flavio">
                      {fmtPct(latestNational.firstRound.flavio ?? 0)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">2º turno</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {latestNational.secondRound ? (
                      <>
                        <span className="num-lula">
                          {fmtPct(latestNational.secondRound.lula)}
                        </span>
                        <span className="text-muted"> × </span>
                        <span className="num-flavio">
                          {fmtPct(latestNational.secondRound.flavio)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="border-flavio/35 glow-flavio bg-gradient-to-br from-surface to-flavio/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted">Flávio 1º (cedo → tarde)</p>
            <p className="num-flavio mt-1 font-display text-2xl font-semibold tabular-nums">
              {fmtDelta(mom.dFlavio1)} pp
            </p>
            <p className="text-xs font-medium text-muted">
              {fmtNum(mom.earlyFlavio1)}% → {fmtNum(mom.lateFlavio1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-lula/35 glow-lula bg-gradient-to-br from-surface to-lula/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted">Lula 1º (cedo → tarde)</p>
            <p className="num-lula mt-1 font-display text-2xl font-semibold tabular-nums">
              {fmtDelta(mom.dLula1)} pp
            </p>
            <p className="text-xs font-medium text-muted">
              {fmtNum(mom.earlyLula1)}% → {fmtNum(mom.lateLula1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-accent/35 bg-gradient-to-br from-surface to-accent/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted">Gap 1º (↓ = mais colado)</p>
            <p className="num-accent mt-1 font-display text-2xl font-semibold tabular-nums">
              {fmtDelta(mom.dGap1)} pp
            </p>
            <p className="text-xs font-medium text-muted">
              {fmtNum(mom.earlyGap1)} → {fmtNum(mom.lateGap1)} pp
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="glow-primary border-primary/35 bg-gradient-to-br from-surface via-surface to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              P(vitória no 2º turno)
            </CardTitle>
            <CardDescription>
              Com track 2022: {fmtProb(probs.lulaWinsSecond)} Lula · sem track:{" "}
              {fmtProb(baseline.probs.lulaWinsSecond)}
              {useTrackRecord && Math.abs(dP2) >= 0.005
                ? ` · efeito track ${fmtDelta(dP2 * 100, 1)} pp na prob`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProbBar
              leftLabel="Lula"
              rightLabel="Flávio"
              leftPct={probs.lulaWinsSecond}
              leftColor={CANDIDATE_META.lula.color}
              rightColor={CANDIDATE_META.flavio.color}
            />
            <p className="text-xs font-medium text-muted">
              {second
                ? `2º: Lula ${fmtPct(second.lula.mean)} · Flávio ${fmtPct(second.flavio.mean)}${second.technicalTie ? " · empate técnico" : ""}`
                : "Sem 2º elegível."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agregado 1º (ajustado)</CardTitle>
            <CardDescription>
              Gap {first.gap >= 0 ? "+" : ""}
              {fmtNum(first.gap)} pp
              {useTrackRecord
                ? ` · vs sem-track L ${fmtDelta(dLula1)} / F ${fmtDelta(dFlavio1)}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted">Lula</p>
                <p className="num-lula font-display text-3xl font-semibold tabular-nums">
                  {fmtPct(first.lula.mean)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted">Flávio</p>
                <p className="num-flavio font-display text-3xl font-semibold tabular-nums">
                  {fmtPct(first.flavio.mean)}
                </p>
              </div>
            </div>
            <ProbBar
              leftLabel="P(Lula lidera 1º)"
              rightLabel="P(Flávio lidera)"
              leftPct={probs.lulaLeadsFirst}
              leftColor={CANDIDATE_META.lula.color}
              rightColor={CANDIDATE_META.flavio.color}
            />
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="mapa" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto min-h-11 w-max min-w-full flex-wrap sm:min-w-0">
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="track">Track 2022</TabsTrigger>
            <TabsTrigger value="crescimento">Crescimento</TabsTrigger>
            <TabsTrigger value="segundo">2º turno</TabsTrigger>
            <TabsTrigger value="melhora">Melhora</TabsTrigger>
            <TabsTrigger value="modelo">Modelo</TabsTrigger>
            <TabsTrigger value="weights">Pesos</TabsTrigger>
            <TabsTrigger value="controls">Controles</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mapa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Mapa agregador
              </CardTitle>
              <CardDescription>
                Mesmo motor do nacional, UF a UF: recência, √n, house, track
                2022, Monte Carlo. 2º imputado em válidos se o instituto não
                perguntou.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrazilMap config={config} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENDA */}
        <TabsContent value="agenda" className="mt-4 space-y-4">
          <Card className="border-primary/40 bg-gradient-to-br from-surface via-surface to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                Próximo marco
              </CardTitle>
              <CardDescription>
                Datafolha em campo 18–20/08 · divulgação prevista sexta 21
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted">Faltam</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-primary">
                  {Math.max(
                    0,
                    Math.round(
                      (Date.parse("2026-08-21T12:00:00-03:00") - Date.now()) /
                        86_400_000,
                    ),
                  )}{" "}
                  <span className="text-lg font-medium text-muted">dias</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Por que pesa</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">
                  Única presencial de grande mídia depois da propaganda. Track
                  2022 alto. Mexe o agregador de verdade.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">O que olhar</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">
                  Gap 2º vs 48×43 de julho. Se cair p/ 3 pp, confirma Quaest.
                  Se abrir, o empate técnico esfria.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="size-4 text-primary" />
                Linha do tempo
              </CardTitle>
              <CardDescription>
                O que saiu e o que ainda vem — sem misturar estadual com nacional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {CALENDAR.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2/40 p-3"
                >
                  <div className="w-16 shrink-0 text-xs font-semibold tabular-nums text-primary">
                    {item.date.slice(8)}/{item.date.slice(5, 7)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <Badge
                        variant={
                          item.kind === "previsto"
                            ? "default"
                            : item.kind === "saiu"
                              ? "muted"
                              : "outline"
                        }
                      >
                        {item.kind === "previsto"
                          ? "previsto"
                          : item.kind === "saiu"
                            ? "saiu"
                            : item.kind === "campo"
                              ? "campo"
                              : "fato"}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-muted">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRACK 2022 */}
        <TabsContent value="track" className="mt-4 space-y-4">
          <Card className="border-primary/30 glow-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="size-4 text-primary" />
                Ranking 2º turno 2022 (priors do motor)
              </CardTitle>
              <CardDescription>
                Urna: Lula {fmtPct(ELECTION_2022_2T.lula)} × Bolsonaro{" "}
                {fmtPct(ELECTION_2022_2T.bolsonaro)} · erro ≈ |poll − urna| na última
                rodada. Fonte do ranking viral (Paraná / Gerp / Datafolha /
                Veritá) + priors extras.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {TRACK_RANKING_DISPLAY.map((r) => (
                  <div
                    key={r.institute + r.rank}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface-2/50 px-3 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {r.medal} {r.institute}
                      </p>
                      <p className="text-xs font-medium text-muted">
                        erro ~{r.mae} · quality{" "}
                        ×{fmtMult(trackQuality(r.institute))}
                      </p>
                    </div>
                    <Badge variant="default">peso ↑</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-muted">
                Fórmula do peso:{" "}
                <code className="text-fg">
                  recência × √n × modo × quality_2022
                </code>
                . House effects: blend 60% tilt histórico + 40% prior manual.
                Uma eleição ≠ destino — desligue nos Controles se quiser.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality score por instituto (2026 no modelo)</CardTitle>
              <CardDescription>
                Multiplicador no agregador (Palver ↓ online; Gerp/Datafolha ↑)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={qualityBars}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART.grid}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 1.5]}
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      tick={{ fill: CHART.fg, fontSize: 12, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                    />
                    <Bar dataKey="quality" name="quality" radius={[0, 6, 6, 0]}>
                      {qualityBars.map((e) => (
                        <Cell
                          key={e.full}
                          fill={
                            e.quality >= 1.2
                              ? CHART.accent
                              : e.quality < 0.85
                                ? CHART.renan
                                : CHART.flavio
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas por casa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.values(TRACK_2022)
                .filter((t) =>
                  polls.some((p) => p.institute === t.institute && p.national),
                )
                .map((t) => (
                  <div
                    key={t.institute}
                    className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{t.institute}</span>
                      <span className="tabular-nums text-primary">
                        ×{fmtMult(t.quality)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-muted">{t.note}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRESCIMENTO */}
        <TabsContent value="crescimento" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Curva 1º turno — Lula × Flávio</CardTitle>
              <CardDescription>
                Eixo = divulgação · ordem = fim de campo · linhas = média 3
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full min-w-0 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={growth1Chart}
                    margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis {...POLL_XAXIS} />
                    <YAxis
                      domain={[26, 48]}
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      unit="%"
                      width={36}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                      labelFormatter={(_, payload) => pollTipLabel(payload)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Lula"
                      stroke={CHART.lula}
                      strokeWidth={1.5}
                      strokeOpacity={0.55}
                      dot={{ r: 3, fill: CHART.lula }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Flávio"
                      stroke={CHART.flavio}
                      strokeWidth={1.5}
                      strokeOpacity={0.55}
                      dot={{ r: 3, fill: CHART.flavio }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Lula (média 3)"
                      stroke={CHART.lula}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Flávio (média 3)"
                      stroke={CHART.flavio}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gap 1º (Lula − Flávio)</CardTitle>
              <CardDescription>Queda do gap = corrida mais apertada</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gap1Chart} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={CHART.accent}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART.accent}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis {...POLL_XAXIS} />
                    <YAxis
                      domain={[-2, 14]}
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      unit=" pp"
                      width={42}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                      labelFormatter={(_, payload) => pollTipLabel(payload)}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={CHART.muted}
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="gapAvg"
                      name="Gap médio 3"
                      stroke={CHART.accent}
                      fill="url(#gapFill)"
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="gap"
                      name="Gap poll"
                      stroke={CHART.purple}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2º */}
        <TabsContent value="segundo" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted">Δ Flávio 2º (janela)</p>
                <p className="num-flavio mt-1 font-display text-2xl font-semibold tabular-nums">
                  {fmtDelta(mom.dFlavio2)} pp
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted">Δ gap 2º</p>
                <p className="num-accent mt-1 font-display text-2xl font-semibold tabular-nums">
                  {fmtDelta(mom.dGap2)} pp
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted">P(Lula 2º) c/ track</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {fmtProb(probs.lulaWinsSecond)}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Curva 2º turno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={round2Chart} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis {...POLL_XAXIS} />
                    <YAxis
                      domain={[35, 52]}
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      unit="%"
                      width={36}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                      labelFormatter={(_, payload) => pollTipLabel(payload)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Lula"
                      stroke={CHART.lula}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Flávio"
                      stroke={CHART.flavio}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gap 2º turno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={gap2Chart} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis {...POLL_XAXIS} />
                    <YAxis
                      domain={[-4, 10]}
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      unit=" pp"
                      width={42}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                      labelFormatter={(_, payload) => pollTipLabel(payload)}
                    />
                    <ReferenceLine y={0} stroke={CHART.muted} strokeDasharray="4 4" />
                    <Bar dataKey="gap" name="Gap poll" fill={CHART.flavio} opacity={0.55} />
                    <Line
                      type="monotone"
                      dataKey="gapAvg"
                      name="Gap médio 3"
                      stroke={CHART.accent}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MELHORA */}
        <TabsContent value="melhora" className="mt-4 space-y-4">
          <Card className="border-accent/25">
            <CardHeader>
              <CardTitle>Same-house: quem melhorou?</CardTitle>
              <CardDescription>
                Δ gap negativo = Flávio encurtou
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deltas.map((d) => (
                <div
                  key={`${d.institute}-${d.from}-${d.to}`}
                  className="rounded-[var(--radius-md)] border border-border bg-surface-2/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-fg">{d.institute}</p>
                      <p className="text-xs font-medium text-muted">
                        {d.from} → {d.to} · quality ×
                        {fmtMult(trackQuality(d.institute))}
                      </p>
                    </div>
                    <Badge
                      variant={
                        d.whoImproved1 === "flavio" ? "default" : "muted"
                      }
                    >
                      1º:{" "}
                      {d.whoImproved1 === "flavio"
                        ? "Flávio melhor"
                        : d.whoImproved1 === "lula"
                          ? "Lula melhor"
                          : "estável"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-muted">Δ Flávio 1º</p>
                      <DeltaPill value={d.dFlavio1} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted">Δ Lula 1º</p>
                      <DeltaPill value={d.dLula1} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted">Δ gap 1º</p>
                      <DeltaPill value={d.dGap1} invert />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted">Δ gap 2º</p>
                      {d.dGap2 != null ? (
                        <DeltaPill value={d.dGap2} invert />
                      ) : (
                        <span className="text-xs font-medium text-muted">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Barras de melhora</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={melhoraBars}
                    margin={{ bottom: 28, left: 0, right: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={48}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      unit=" pp"
                      width={36}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke={CHART.muted} />
                    <Bar dataKey="Δ Flávio 1º" fill={CHART.flavio} />
                    <Bar dataKey="Δ Lula 1º" fill={CHART.lula} />
                    <Bar dataKey="Δ gap (L−F)" fill={CHART.accent} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODELO */}
        <TabsContent value="modelo" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>1º turno — ponto central</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART.grid}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 50]}
                        tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                        unit="%"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={56}
                        tick={{ fill: CHART.fg, fontSize: 12, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => fmtNum(Number(v))}
                    />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                        {barData.map((e) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Radar estadual
                </CardTitle>
                <CardDescription>
                  Fora do agregador nacional. Peso = eleitorado aproximado.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {statePolls
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((p) => {
                    const uf = p.uf ? UF_META[p.uf] : undefined;
                    const l1 = p.firstRound.lula ?? 0;
                    const f1 = p.firstRound.flavio ?? 0;
                    const leader = f1 > l1 ? "Flávio" : "Lula";
                    return (
                      <div
                        key={p.id}
                        className="rounded-[var(--radius-md)] border border-border bg-surface-2/40 p-3 text-sm"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="font-semibold">{p.institute}</p>
                          <Badge variant="outline">{p.uf ?? "UF"}</Badge>
                        </div>
                        <p className="text-xs font-medium text-muted">
                          {uf?.name ?? p.uf} · {p.date.slice(8)}/
                          {p.date.slice(5, 7)}
                          {uf
                            ? ` · ~${fmtNum(uf.electorateM, 1)} mi eleitores`
                            : ""}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          1º ·{" "}
                          <span className="num-lula">{fmtPct(l1)}</span>
                          <span className="text-muted"> × </span>
                          <span className="num-flavio">{fmtPct(f1)}</span>
                          <span className="ml-2 text-xs font-medium text-muted">
                            {leader} +{fmtNum(Math.abs(f1 - l1))}
                          </span>
                        </p>
                        {p.secondRound && (
                          <p className="text-xs font-medium text-muted">
                            2º · L {fmtPct(p.secondRound.lula)} × F{" "}
                            {fmtPct(p.secondRound.flavio)}
                          </p>
                        )}
                        {p.notes && (
                          <p className="mt-1 text-xs font-medium leading-relaxed text-muted">
                            {p.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PESOS */}
        <TabsContent value="weights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Decomposição de pesos</CardTitle>
              <CardDescription>
                recência × √n × modo × track_2022
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wider text-fg/75">
                    <tr>
                      <th className="px-3 py-2.5">Instituto</th>
                      <th className="px-3 py-2.5">Campo</th>
                      <th className="px-3 py-2.5">Modo</th>
                      <th className="px-3 py-2.5 tabular-nums">Track</th>
                      <th className="px-3 py-2.5 tabular-nums">Rec.</th>
                      <th className="px-3 py-2.5 tabular-nums">Peso %</th>
                      <th className="px-3 py-2.5 tabular-nums">L adj</th>
                      <th className="px-3 py-2.5 tabular-nums">F adj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.poll.id}
                        className="border-t border-border hover:bg-surface-2/50"
                      >
                        <td className="px-3 py-2.5 font-medium">
                          {r.poll.institute}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-muted">
                          {r.poll.fieldEnd}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={
                              r.poll.mode === "presencial" ? "muted" : "online"
                            }
                          >
                            {r.poll.mode}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-accent">
                          ×{fmtMult(r.wTrack)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {fmtMult(r.wRecency)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-primary">
                          {fmtNum(r.weightShare * 100)}%
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-lula">
                          {fmtNum(r.adjLula1)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-flavio">
                          {fmtNum(r.adjFlavio1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex gap-2 text-xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Gerp/Datafolha sobem no ranking de peso quando track está ON;
                Palver online cai.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTROLES */}
        <TabsContent value="controls" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-4 text-primary" />
                Controles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Half-life</span>
                  <span className="tabular-nums text-primary">
                    {halfLife} dias
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={halfLife}
                  onChange={(e) => setHalfLife(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-primary"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  checked={includeOnline}
                  onChange={setIncludeOnline}
                  label="Incluir online"
                />
                <Toggle
                  checked={includeRemoto}
                  onChange={setIncludeRemoto}
                  label="Incluir remoto"
                />
                <Toggle
                  checked={includeModelo}
                  onChange={setIncludeModelo}
                  label="Modelos pessoais"
                />
                <Toggle
                  checked={houseOn}
                  onChange={setHouseOn}
                  label="House effects"
                />
                <Toggle
                  checked={useTrackRecord}
                  onChange={setUseTrackRecord}
                  label="Peso track record 2022"
                />
                <Toggle
                  checked={useTrackHouse}
                  onChange={setUseTrackHouse}
                  label="Blend house × 2022"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <footer className="mt-10 border-t border-border pt-6 text-center text-xs font-medium text-muted">
        v2 · track 2022 no peso · demo educativa · não é instituto oficial
      </footer>
    </div>
  );
}
