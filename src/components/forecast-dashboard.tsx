import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
  CalendarClock,
  CalendarDays,
  Info,
  MapPin,
  Medal,
  Radio,
  Settings2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAsOf } from "@/lib/as-of";
import { useHalfLife } from "@/lib/half-life";
import { HalfLifeControl, HalfLifeSlider } from "@/components/half-life-control";
import { polls, CANDIDATE_META } from "@/data/polls";
import { CALENDAR, UF_META } from "@/data/calendar";
import {
  BrazilMap,
  MapLayerToggle,
  type MapLayer,
} from "@/components/brazil-map";
import {
  DEFAULT_CONFIG,
  housesInAverage,
  runForecast,
  type CandidateKey,
  type EngineConfig,
  type ForecastPoll,
} from "@/lib/forecast/engine";
import { buildRunoffScenarios } from "@/lib/forecast/runoff-scenarios";
import { bottomUpNational } from "@/lib/forecast/states";
import {
  buildNationalTrend,
  rollingAverage,
  sameHouseDeltas,
  windowMomentum,
} from "@/lib/forecast/trends";
import { fmtDelta, fmtMult, fmtNum, fmtPct, fmtProb, isShownTie, shownGap } from "@/lib/format";
import {
  ELECTION_2022_2T,
  TRACK_2022,
  TRACK_RANKING_DISPLAY,
  resolveInstitute,
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
import { ChartTip } from "@/components/chart-tooltip";
import { CHART } from "@/lib/chart-theme";
import { ShareBar } from "@/components/share-bar";
import { SiteNav } from "@/components/site-nav";
import { TightRaces } from "@/components/tight-races";
import { VisitHook } from "@/components/visit-hook";
import { fileStamp } from "@/lib/visit-delta";

function fmtDateBr(iso: string) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function gapPlain(
  tie: boolean | undefined,
  a: number | undefined,
  b: number | undefined,
  se?: number,
) {
  if (a == null || b == null) return "Ainda poucas pesquisas perguntaram o 2º.";
  const gap = shownGap(a, b);
  const pts = fmtNum(Math.abs(gap));
  const honest = se != null ? isShownTie(a, b, se) : Boolean(tie) && Math.abs(gap) <= 3;
  if (honest) {
    return `Empate técnico: ${pts} pontos de diferença, cabe na margem.`;
  }
  const who = gap > 0 ? "Lula" : "Flávio";
  return `${who} à frente por ${pts} pontos de intenção.`;
}

function nextUpcoming(asOf: string) {
  const future = CALENDAR.filter(
    (i) =>
      (i.kind === "previsto" || i.kind === "campo") && i.date >= asOf,
  ).sort((a, b) => a.date.localeCompare(b.date));
  return future[0] ?? null;
}


const POLL_XAXIS = {
  dataKey: "label" as const,
  interval: 0 as const,
  angle: -40,
  textAnchor: "end" as const,
  height: 70,
  tick: { fill: CHART.axis, fontSize: 11, fontWeight: 500 },
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

const FIRST_KEYS = ["lula", "flavio", "renan", "caiado", "zema", "cury"] as const;

function FirstRoundField({
  first,
  zeroLabel,
}: {
  first: {
    lula: { mean: number; nPolls?: number };
    flavio: { mean: number; nPolls?: number };
    renan: { mean: number; nPolls?: number };
    caiado: { mean: number; nPolls?: number };
    zema: { mean: number; nPolls?: number };
    cury: { mean: number; nPolls?: number };
  };
  zeroLabel?: string;
}) {
  const rows = FIRST_KEYS.map((key) => ({
    key,
    name: CANDIDATE_META[key].name,
    party: CANDIDATE_META[key].party,
    color: CANDIDATE_META[key].color,
    value: first[key].mean,
    nPolls: first[key].nPolls ?? 0,
  }))
    .filter((r) => r.key === "lula" || r.key === "flavio" || (r.nPolls > 0 && r.value > 0))
    .sort((a, b) => b.value - a.value);
  return (
    <ol className="mt-2">
      {rows.map((r, i) => (
        <li key={r.key} className="score-row">
          <span className="min-w-0 truncate">
            <span className="mr-2 font-mono text-xs text-cream/55">
              {i + 1}
            </span>
            <span className="font-semibold" style={{ color: r.color }}>
              {r.name}
            </span>
            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-cream">
              {r.party}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 font-mono tabular-nums",
              i === 0 ? "text-xl font-semibold sm:text-2xl" : "text-sm font-semibold",
            )}
            style={{ color: r.color }}
          >
            {zeroLabel && r.value === 0 ? zeroLabel : fmtPct(r.value)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function pollFirstRoundRows(poll: {
  firstRound: Partial<Record<(typeof FIRST_KEYS)[number], number>>;
}) {
  return pollFieldRows(poll.firstRound);
}

function pollFieldRows(
  round: Partial<Record<(typeof FIRST_KEYS)[number], number>> | undefined,
) {
  return FIRST_KEYS.map((key) => ({
    key,
    name: CANDIDATE_META[key].name,
    color: CANDIDATE_META[key].color,
    value: round?.[key] ?? 0,
    asked: round?.[key] != null,
  })).sort((a, b) => {
    if (a.asked !== b.asked) return a.asked ? -1 : 1;
    return b.value - a.value;
  });
}


type FieldKey = (typeof FIRST_KEYS)[number];

function isFieldKey(k: CandidateKey): k is FieldKey {
  return (FIRST_KEYS as readonly string[]).includes(k);
}

function pollAskedPairs(poll: Pick<ForecastPoll, "secondRound" | "secondPairs">) {
  const pairs: { a: FieldKey; b: FieldKey; aPct: number; bPct: number }[] = [];
  const sr = poll.secondRound;
  if (sr?.lula != null && sr?.flavio != null) {
    pairs.push({ a: "lula", b: "flavio", aPct: sr.lula, bPct: sr.flavio });
  }
  for (const row of poll.secondPairs ?? []) {
    if (!isFieldKey(row.a) || !isFieldKey(row.b)) continue;
    pairs.push({ a: row.a, b: row.b, aPct: row.aPct, bPct: row.bPct });
  }
  return pairs;
}

function pairChance(p: number) {
  if (p >= 0.995) return ">99%";
  if (p < 0.005) return "<1%";
  return fmtProb(p);
}

function SecondRoundScenarios({
  first,
  second,
  pollsForPairs,
}: {
  first: {
    lula: { mean: number; se: number; nPolls: number };
    flavio: { mean: number; se: number; nPolls: number };
    renan: { mean: number; se: number; nPolls: number };
    caiado: { mean: number; se: number; nPolls: number };
    zema: { mean: number; se: number; nPolls: number };
    cury: { mean: number; se: number; nPolls: number };
  };
  second: {
    lula: { mean: number; se: number; nPolls: number };
    flavio: { mean: number; se: number; nPolls: number };
    renan: { mean: number; se: number; nPolls: number };
    caiado: { mean: number; se: number; nPolls: number };
    zema: { mean: number; se: number; nPolls: number };
    cury: { mean: number; se: number; nPolls: number };
  } | null;
  pollsForPairs: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number })[];
}) {
  const scenarios = useMemo(
    () =>
      buildRunoffScenarios({
        first,
        second,
        polls: pollsForPairs,
      }),
    [first, second, pollsForPairs],
  );
  const hero =
    scenarios.find((s) => s.pairKey === "flavio|lula" && s.asked) ??
    scenarios.find((s) => s.asked) ??
    null;
  const rest = scenarios.filter((s) => s.pairKey !== hero?.pairKey && s.asked);
  if (!hero && rest.length === 0) {
    return (
      <p className="mt-2 text-sm font-medium text-fg">
        Ainda poucas pesquisas perguntaram o 2º.
      </p>
    );
  }
  const left = hero ? CANDIDATE_META[hero.a] : null;
  const right = hero ? CANDIDATE_META[hero.b] : null;
  return (
    <div className="mt-2">
      {hero && left && right && hero.a2 != null && hero.b2 != null ? (
        <div className="matchup">
          <div>
            <p className="text-sm font-semibold" style={{ color: left.color }}>
              {left.name}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream">
              {left.party}
            </p>
            <p className="matchup-num mt-1" style={{ color: left.color }}>
              {fmtPct(hero.a2)}
            </p>
          </div>
          <p className="pb-3 font-mono text-xs text-cream/40">×</p>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: right.color }}>
              {right.name}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream">
              {right.party}
            </p>
            <p className="matchup-num mt-1" style={{ color: right.color }}>
              {fmtPct(hero.b2)}
            </p>
          </div>
        </div>
      ) : null}
      {hero ? (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/85">
          {hero.nAsked} pesquisas · par {pairChance(hero.pPair)} no 1º
        </p>
      ) : null}
      {rest.length > 0 ? (
        <ol className="mt-3">
          {rest.map((s) => {
            const a = CANDIDATE_META[s.a];
            const b = CANDIDATE_META[s.b];
            const measured = s.asked && s.a2 != null && s.b2 != null;
            return (
              <li key={s.pairKey} className="score-row">
                <span className="min-w-0 text-sm">
                  <span style={{ color: a.color }}>{a.name}</span>
                  <span className="text-cream/40"> × </span>
                  <span style={{ color: b.color }}>{b.name}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                  {measured ? (
                    <span>
                      <span style={{ color: a.color }}>{fmtPct(s.a2!)}</span>
                      <span className="text-cream/40"> × </span>
                      <span style={{ color: b.color }}>{fmtPct(s.b2!)}</span>
                      <span className="ml-2 text-cream/50">
                        {s.nAsked} · par {pairChance(s.pPair)}
                      </span>
                    </span>
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

const EMPTY_FIELD = {
  lula: { mean: 0 },
  flavio: { mean: 0 },
  renan: { mean: 0 },
  caiado: { mean: 0 },
  zema: { mean: 0 },
  cury: { mean: 0 },
};

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
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-cream shadow transition-transform",
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

export function ForecastDashboard({ variant = "public" }: { variant?: "public" | "lab" }) {
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

  const pL = fmtProb(probs.lulaWinsElection).replace("%", "");
  const pF = fmtProb(probs.flavioWinsElection).replace("%", "");
  const pLulaPts = Math.round(probs.lulaWinsElection * 1000) / 10;
  const pFlavioPts = Math.round(probs.flavioWinsElection * 1000) / 10;

  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
      {variant === "public" && (
      <section className="hero-mast">
        <div className="hero-chrome">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <SiteNav className="min-w-0 flex-1" />
            <span className="hero-badge">
              Não é pesquisa
            </span>
          </div>
          <div className="hl-strip">
            <HalfLifeControl />
          </div>
        </div>
        <div className="hero-score">
          <div className="hero-col hero-col-l">
            <p className="hero-kicker" style={{ color: CHART.lula }}>
              Lula
            </p>
            <p className="hero-num" style={{ color: CHART.lula }}>
              {pL}
            </p>
          </div>
          <div className="hero-col hero-col-f">
            <p className="hero-kicker" style={{ color: CHART.flavio }}>
              Flávio
            </p>
            <p className="hero-num" style={{ color: CHART.flavio }}>
              {pF}
            </p>
          </div>
        </div>
        <p className="hero-method">
          1º + 2º nos pares que as casas perguntaram
        </p>
        <p className="hero-fresh">{fileStamp(latestNational ?? null)}</p>
        {variant === "public" ? (
          <VisitHook
            pLula={pLulaPts}
            pFlavio={pFlavioPts}
            hl={halfLife}
            newestId={latestNational?.id ?? ""}
          />
        ) : null}
        <div className="hook-rail">
          <a href="#novo" className="hook-link">
            O que entrou
          </a>
          <a href="#mapa" className="hook-link">
            E no seu estado?
          </a>
          <a href="#pares" className="hook-link">
            Os pares do 2º
          </a>
          <button
            type="button"
            className="hook-link"
            onClick={() => setHalfLife(halfLife <= 5 ? 40 : 5)}
          >
            {halfLife <= 5 ? "Memória longa" : "Half-life 5 dias"}
          </button>
        </div>
      </section>
      )}

    <div className="page-body mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
      {variant === "lab" && (
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
          Laboratorio · <a href="/" className="underline">voltar ao Radar</a>
        </p>
      )}
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

      {variant === "lab" && (
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
      )}

      {variant === "public" && (
        <>
        <TightRaces />
        <section id="mapa" className="space-y-3 scroll-mt-24">
          <p className="kicker">Mapa</p>
          <p className="text-sm font-medium text-cream/85">
            Clique no estado. Abre governadores.
          </p>
          <MapLayerToggle layer={mapLayer} onChange={setMapLayer} />
          <BrazilMap config={config} layer={mapLayer} />
          <p className="tight-next">
            <Link to="/lab" className="hook-link">
              Metodo, pesos e acerto historico
            </Link>
            <span className="text-cream/35"> · </span>
            <Link
              to="/candidatos"
              search={(prev) => ({
                uf: "SP",
                cargo: "governador" as const,
                ...(typeof (prev as { asOf?: string }).asOf === "string"
                  ? { asOf: (prev as { asOf: string }).asOf }
                  : {}),
                ...(typeof (prev as { hl?: number }).hl === "number"
                  ? { hl: (prev as { hl: number }).hl }
                  : {}),
              })}
              className="hook-link"
            >
              SP tem 2 casas. Compara.
            </Link>
          </p>
        </section>
        </>
      )}

      {variant === "lab" && (
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

        <TabsContent value="mapa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Mapa agregador
              </CardTitle>
              <CardDescription>
                2026 agregado: pesquisas por UF. 2022 urna: como cada colégio
                (UF) votou em Lula e Bolsonaro. Cor do modo 2022 = margem do 2º.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MapLayerToggle layer={mapLayer} onChange={setMapLayer} />
              <BrazilMap config={config} layer={mapLayer} />
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
                {upcoming
                  ? `${upcoming.title} · ${fmtDateBr(upcoming.date)}`
                  : "Nenhum marco futuro cadastrado. Veja o que já saiu abaixo."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-gold">Quando</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-primary">
                  {upcoming
                    ? daysLeft === 0
                      ? "Hoje"
                      : daysLeft
                    : "n/d"}
                  {upcoming && daysLeft !== 0 ? (
                    <span className="text-lg font-medium text-gold">
                      {" "}
                      {daysLeft === 1 ? "dia" : "dias"}
                    </span>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gold">O que é</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-fg">
                  {upcoming?.detail ??
                    "Linha do tempo com o que já saiu."}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gold">Por que entra</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-fg">
                  {upcoming?.institute
                    ? `${upcoming.institute} entra no agregador na próxima ingestão.`
                    : "Pesquisas nacionais pesam mais que estaduais."}
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
                O que saiu e o que ainda vem. Estadual separado do nacional.
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
                Quem mais acertou o 2º (2018 e 2022)
              </CardTitle>
              <CardDescription>
                Urna 2022: Lula {fmtPct(ELECTION_2022_2T.lula)} × Bolsonaro{" "}
                {fmtPct(ELECTION_2022_2T.bolsonaro)}. Erro = diferença da
                última pesquisa para a urna. Casas com menos erro pesam mais.
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
                        {r.rank}. {r.institute}
                      </p>
                      <p className="text-xs font-medium text-gold">
                        erro ~{r.mae} · peso ×
                        {fmtMult(trackQuality(r.institute))}
                      </p>
                    </div>
                    <Badge variant="default">peso ↑</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-gold">
                Peso = recência × tamanho da amostra × modo × acerto vs urna.
                Sem puxar para um lado. Acerto = 1,55 / (0,55 + erro vs urna).
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
                    <Tooltip content={ChartTip} cursor={false} />
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
                  polls.some(
                    (p) =>
                      p.national &&
                      resolveInstitute(p.institute) === t.institute,
                  ),
                )
                .map((t) => (
                  <div
                    key={t.institute}
                    className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{t.institute}</span>
                      <span className="tabular-nums text-primary">
                        ×{fmtMult(trackQuality(t.institute))}
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
              <CardTitle>Curva 1º turno, Lula × Flávio</CardTitle>
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
                    <Tooltip content={ChartTip} cursor={false} />
                    <Legend wrapperStyle={{ color: CHART.fg, fontSize: 12 }} />
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
                    <Tooltip content={ChartTip} cursor={false} />
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
                <p className="text-xs font-medium text-gold">
                  Flávio no 2º, antigas → recentes
                </p>
                <p className="num-flavio mt-1 font-display text-2xl font-semibold tabular-nums">
                  {fmtDelta(mom.dFlavio2)} pp
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gold">
                  Diferença no 2º
                </p>
                <p className="num-accent mt-1 font-display text-2xl font-semibold tabular-nums">
                  {fmtDelta(mom.dGap2)} pp
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gold">
                  Chance de Lula no 2º
                </p>
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
                    <Tooltip content={ChartTip} cursor={false} />
                    <Legend wrapperStyle={{ color: CHART.fg, fontSize: 12 }} />
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
                    <Tooltip content={ChartTip} cursor={false} />
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
              <CardTitle>Mesma casa: quem subiu?</CardTitle>
              <CardDescription>
                Compara a rodada nova com a anterior da mesma casa. Número
                negativo na diferença = Flávio encurtou.
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
                      <p className="text-xs font-medium text-gold">Flávio 1º</p>
                      <DeltaPill value={d.dFlavio1} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gold">Lula 1º</p>
                      <DeltaPill value={d.dLula1} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gold">Diferença 1º</p>
                      <DeltaPill value={d.dGap1} invert />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gold">Diferença 2º</p>
                      {d.dGap2 != null ? (
                        <DeltaPill value={d.dGap2} invert />
                      ) : (
                        <span className="text-xs font-medium text-muted">n/d</span>
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
                    <Tooltip content={ChartTip} cursor={false} />
                    <Legend wrapperStyle={{ color: CHART.fg, fontSize: 12 }} />
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
                <CardTitle>1º turno, campo completo</CardTitle>
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
                        width={88}
                        tick={{ fill: CHART.fg, fontSize: 12, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={ChartTip} cursor={false} />
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
                            {leader} +{fmtNum(Math.abs(shownGap(f1, l1)))}
                          </span>
                        </p>
                        {p.secondRound && (
                          <p className="text-xs font-medium text-muted">
                            2º · L {fmtPct(p.secondRound.lula ?? 0)} × F{" "}
                            {fmtPct(p.secondRound.flavio ?? 0)}
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
                recência × √n × modo × acerto 2018/2022
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
                Gerp/Datafolha/Paraná sobem no peso quando o track está ON.
                Palver online cai. Sem correção de lado.
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
              <HalfLifeSlider id="lab-half-life" />
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
                  label="Ajuste por casa (fica desligado)"
                />
                <Toggle
                  checked={useTrackRecord}
                  onChange={setUseTrackRecord}
                  label="Peso por acerto 2014/2018/2022"
                />
                <Toggle
                  checked={useTrackHouse}
                  onChange={setUseTrackHouse}
                  label="Ajuste extra por casa (não usado)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}


      <footer className="mt-10 border-t border-border pt-6 text-center text-xs font-medium text-muted">
        v3 · portal independente · peso 2014, 2018 e 2022 · não é instituto oficial
      </footer>
    </div>
    </div>
  );
}
