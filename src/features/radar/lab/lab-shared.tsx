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
import { HalfLifeSlider } from "@/components/half-life-control";
import { polls, CANDIDATE_META } from "@/data/polls";
import { CALENDAR, UF_META } from "@/data/calendar";

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

export function fmtDateBr(iso: string) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function gapPlain(
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

export function nextUpcoming(asOf: string) {
  const future = CALENDAR.filter(
    (i) =>
      (i.kind === "previsto" || i.kind === "campo") && i.date >= asOf,
  ).sort((a, b) => a.date.localeCompare(b.date));
  return future[0] ?? null;
}


export const POLL_XAXIS = {
  dataKey: "label" as const,
  interval: 0 as const,
  angle: -40,
  textAnchor: "end" as const,
  height: 70,
  tick: { fill: CHART.axis, fontSize: 11, fontWeight: 500 },
  axisLine: false,
  tickLine: false,
};

export function ProbBar({
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

export const FIRST_KEYS = ["lula", "flavio", "renan", "caiado", "zema", "cury"] as const;

export function FirstRoundField({
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

export function pollFirstRoundRows(poll: {
  firstRound: Partial<Record<(typeof FIRST_KEYS)[number], number>>;
}) {
  return pollFieldRows(poll.firstRound);
}

export function pollFieldRows(
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

export function isFieldKey(k: CandidateKey): k is FieldKey {
  return (FIRST_KEYS as readonly string[]).includes(k);
}

export function pollAskedPairs(poll: Pick<ForecastPoll, "secondRound" | "secondPairs">) {
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

export function pairChance(p: number) {
  if (p >= 0.995) return ">99%";
  if (p < 0.005) return "<1%";
  return fmtProb(p);
}

export function SecondRoundScenarios({
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

export const EMPTY_FIELD = {
  lula: { mean: 0 },
  flavio: { mean: 0 },
  renan: { mean: 0 },
  caiado: { mean: 0 },
  zema: { mean: 0 },
  cury: { mean: 0 },
};

export function Toggle({
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

export function DeltaPill({
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
