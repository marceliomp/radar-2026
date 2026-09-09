import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SegGroup } from "@/features/radar/map/map-layer-toggle";
import { CHART, tipStyle } from "@/lib/chart-theme";
import {
  dateBr,
  fieldPeriodLine,
  fmtDelta,
  fmtNum,
  isoDayUtc,
  utcMsToMonthBr,
} from "@/lib/format";
import {
  asOfDayAverages,
  densifyDayAverages,
  monthTicks,
  niceYDomain,
  paddedDomain,
  houseFilterKey,
  houseFilterOptions,
  modeFilterKey,
  modeFilterLabel,
  modeFilterOptions,
  type ModeFilterKey,
  type DayAverage,
} from "@/lib/forecast/curve-series";
import { buildNationalTrend } from "@/lib/forecast/trends";
import type { ForecastPoll } from "@/lib/forecast/engine";
import { pollsOnDate } from "@/lib/latest-day";
import { YEAR_START } from "@/lib/period";

function tickMonth(value: number | string) {
  return utcMsToMonthBr(Number(value));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

const LINE_ANIM_MS = 700;

function softActive(color: string, r = 4.5) {
  return { r, fill: color, strokeWidth: 0 };
}

const XAXIS = {
  type: "number" as const,
  dataKey: "t" as const,
  tickFormatter: tickMonth,
  interval: 0 as const,
  minTickGap: 0,
  tick: { fill: CHART.axis, fontSize: 11, fontWeight: 500 },
  axisLine: false,
  tickLine: false,
  height: 28,
  padding: { left: 8, right: 8 },
};

type RoundKey = "1" | "2";

const OTHERS = [
  { key: "cury", label: "Cury", color: CHART.cury },
  { key: "renan", label: "Renan", color: CHART.renan },
  { key: "caiado", label: "Caiado", color: CHART.caiado },
  { key: "zema", label: "Zema", color: CHART.zema },
] as const;

type OtherKey = (typeof OTHERS)[number]["key"];

type DayHouse = {
  institute: string;
  fieldStart?: string;
  fieldEnd: string;
  lulaPoll: number | null;
  flavioPoll: number | null;
  curyPoll: number | null;
  renanPoll: number | null;
  caiadoPoll: number | null;
  zemaPoll: number | null;
};

type CurveRow = {
  t: number;
  institute: string;
  published: string;
  fieldStart?: string;
  fieldEnd: string;
  lulaPoll: number | null;
  flavioPoll: number | null;
  lulaAvg: number | null;
  flavioAvg: number | null;
  lulaLine: number | null;
  flavioLine: number | null;
  curyLine: number | null;
  renanLine: number | null;
  caiadoLine: number | null;
  zemaLine: number | null;
  curyPoll: number | null;
  renanPoll: number | null;
  caiadoPoll: number | null;
  zemaPoll: number | null;
  curyAvg: number | null;
  renanAvg: number | null;
  caiadoAvg: number | null;
  zemaAvg: number | null;
  sameDay: DayHouse[];
  houseFocus: boolean;
  prevPublished?: string;
  dLula?: number | null;
  dFlavio?: number | null;
};

function avgOnFirstOfDay(rows: CurveRow[]): CurveRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const first = !seen.has(row.published);
    if (first) seen.add(row.published);
    return {
      ...row,
      lulaLine: first ? row.lulaAvg : null,
      flavioLine: first ? row.flavioAvg : null,
      curyLine: first ? row.curyAvg : null,
      renanLine: first ? row.renanAvg : null,
      caiadoLine: first ? row.caiadoAvg : null,
      zemaLine: first ? row.zemaAvg : null,
    };
  });
}

function valuesForDomain(rows: CurveRow[], extra: boolean): Array<number | null> {
  const out: Array<number | null> = [];
  for (const row of rows) {
    out.push(row.lulaAvg, row.flavioAvg, row.lulaLine, row.flavioLine);
    if (extra) {
      out.push(row.curyAvg, row.renanAvg, row.caiadoAvg, row.zemaAvg);
    }
  }
  return out;
}

function yTicks([min, max]: [number, number]): number[] {
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-6; v += 4) ticks.push(v);
  return ticks.length ? ticks : [min, max];
}

function mergeLineAndPolls(daily: DayAverage[], polls: CurveRow[]): CurveRow[] {
  const sameByDate = new Map<string, DayHouse[]>();
  for (const poll of polls) {
    if (poll.sameDay.length && !sameByDate.has(poll.published)) {
      sameByDate.set(poll.published, poll.sameDay);
    }
  }
  const lineRows: CurveRow[] = daily.map((day) => ({
    t: day.t,
    institute: "",
    published: day.date,
    fieldEnd: day.date,
    lulaPoll: null,
    flavioPoll: null,
    lulaAvg: day.lula,
    flavioAvg: day.flavio,
    lulaLine: day.lula,
    flavioLine: day.flavio,
    curyPoll: null,
    renanPoll: null,
    caiadoPoll: null,
    zemaPoll: null,
    curyAvg: day.cury,
    renanAvg: day.renan,
    caiadoAvg: day.caiado,
    zemaAvg: day.zema,
    curyLine: day.cury,
    renanLine: day.renan,
    caiadoLine: day.caiado,
    zemaLine: day.zema,
    sameDay: sameByDate.get(day.date) ?? [],
    houseFocus: false,
  }));
  const pollRows = polls.map((poll) => ({
    ...poll,
    lulaLine: null,
    flavioLine: null,
    curyLine: null,
    renanLine: null,
    caiadoLine: null,
    zemaLine: null,
  }));
  return [...lineRows, ...pollRows].sort((a, b) => a.t - b.t);
}

function valuesForOthers(rows: CurveRow[]): Array<number | null> {
  const out: Array<number | null> = [];
  for (const row of rows) {
    out.push(
      row.curyAvg,
      row.renanAvg,
      row.caiadoAvg,
      row.zemaAvg,
      row.curyLine,
      row.renanLine,
      row.caiadoLine,
      row.zemaLine,
    );
  }
  return out;
}


type TipRow = {
  dataKey?: string | number;
  value?: number | string;
  payload?: CurveRow;
};

function pct(n: number | null | undefined) {
  return n == null || !Number.isFinite(n) ? "n/d" : `${fmtNum(n)}%`;
}

function asked(n: number | null | undefined) {
  return n != null && Number.isFinite(n);
}

type ScoreItem = { key?: string; label: string; color: string; n: number | null | undefined };

function ScoreCell({ label, color, n }: ScoreItem) {
  if (!asked(n)) return null;
  return (
    <span className="whitespace-nowrap" style={{ color }}>
      {label} {pct(n)}
    </span>
  );
}

function ScoreGrid({
  lula,
  flavio,
  others,
  featured,
}: {
  lula: number | null | undefined;
  flavio: number | null | undefined;
  others?: { key: OtherKey; n: number | null | undefined }[];
  featured?: boolean;
}) {
  const extra: ScoreItem[] = [];
  for (const item of others ?? []) {
    const meta = OTHERS.find((other) => other.key === item.key);
    if (!meta || !asked(item.n)) continue;
    extra.push({ key: item.key, label: meta.label, color: meta.color, n: item.n });
  }
  return (
    <div
      className={
        featured
          ? "mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[15px] font-semibold tabular-nums"
          : "mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[12px] tabular-nums"
      }
    >
      <ScoreCell label="Lula" color={CHART.lula} n={lula} />
      <ScoreCell label="Flávio" color={CHART.flavio} n={flavio} />
      {extra.map((item) => (
        <ScoreCell key={item.key} label={item.label} color={item.color} n={item.n} />
      ))}
    </div>
  );
}

function housesOnCurveDay(
  polls: ForecastPoll[],
  date: string,
  asOf: string,
  round: RoundKey,
): DayHouse[] {
  return pollsOnDate(polls, date, asOf)
    .map((poll) => ({
      institute: poll.institute,
      fieldStart: poll.fieldStart,
      fieldEnd: poll.fieldEnd,
      lulaPoll: round === "2" ? (poll.secondRound?.lula ?? null) : (poll.firstRound.lula ?? null),
      flavioPoll: round === "2" ? (poll.secondRound?.flavio ?? null) : (poll.firstRound.flavio ?? null),
      curyPoll: round === "1" ? (poll.firstRound.cury ?? null) : null,
      renanPoll: round === "1" ? (poll.firstRound.renan ?? null) : null,
      caiadoPoll: round === "1" ? (poll.firstRound.caiado ?? null) : null,
      zemaPoll: round === "1" ? (poll.firstRound.zema ?? null) : null,
    }))
    .filter((house) => house.lulaPoll != null && house.flavioPoll != null);
}

function CurveTip({ active, payload }: { active?: boolean; payload?: TipRow[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const houses = (
    row.sameDay.length
      ? row.sameDay
      : row.institute
        ? [
            {
              institute: row.institute,
              fieldStart: row.fieldStart,
              fieldEnd: row.fieldEnd,
              lulaPoll: row.lulaPoll,
              flavioPoll: row.flavioPoll,
              curyPoll: row.curyPoll,
              renanPoll: row.renanPoll,
              caiadoPoll: row.caiadoPoll,
              zemaPoll: row.zemaPoll,
            },
          ]
        : []
  ).filter((house) => house.institute && (house.lulaPoll != null || house.flavioPoll != null));
  const many = houses.length > 1;
  if (row.houseFocus) {
    const house = houses[0];
    return (
      <div style={{ ...tipStyle, padding: "10px 12px", minWidth: 228, maxWidth: 320, color: CHART.fg }}>
        <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
          {house?.institute ?? row.institute} · {dateBr(row.published)}
        </p>
        <p className="m-0 mt-0.5 text-[11px] font-medium text-cream/55">
          {fieldPeriodLine(house?.fieldStart ?? row.fieldStart, house?.fieldEnd ?? row.fieldEnd)}
        </p>
        <ScoreGrid
          featured
          lula={house?.lulaPoll ?? row.lulaPoll}
          flavio={house?.flavioPoll ?? row.flavioPoll}
          others={[
            { key: "cury", n: house?.curyPoll ?? row.curyPoll },
            { key: "renan", n: house?.renanPoll ?? row.renanPoll },
            { key: "caiado", n: house?.caiadoPoll ?? row.caiadoPoll },
            { key: "zema", n: house?.zemaPoll ?? row.zemaPoll },
          ]}
        />
        {row.prevPublished && row.dLula != null && row.dFlavio != null ? (
          <p className="m-0 mt-2 text-[12px] font-medium text-cream/80">
            vs {dateBr(row.prevPublished)}: Lula {fmtDelta(row.dLula)} · Flávio {fmtDelta(row.dFlavio)}
          </p>
        ) : (
          <p className="m-0 mt-2 text-[11px] font-medium text-cream/55">Primeira onda desta casa no arquivo</p>
        )}
      </div>
    );
  }
  return (
    <div style={{ ...tipStyle, padding: "10px 12px", minWidth: 228, maxWidth: 320, color: CHART.fg }}>
      <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
        {dateBr(row.published)}
        {many ? ` · ${houses.length} pesquisas` : ""}
      </p>
      <p className="m-0 mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
        Média · pesquisas novas pesam mais. Não é corte.
      </p>
      <ScoreGrid
        featured
        lula={row.lulaAvg}
        flavio={row.flavioAvg}
        others={[
          { key: "cury", n: row.curyAvg },
          { key: "renan", n: row.renanAvg },
          { key: "caiado", n: row.caiadoAvg },
          { key: "zema", n: row.zemaAvg },
        ]}
      />
      {houses.map((house, i) => (
        <div key={`${house.institute}-${i}`} className={i === 0 ? "mt-3" : "mt-2.5"}>
          <p className="m-0 text-[12px] font-medium text-cream/80">{house.institute}</p>
          <p className="m-0 mt-0.5 text-[11px] font-medium text-cream/55">
            {fieldPeriodLine(house.fieldStart, house.fieldEnd)}
          </p>
          <ScoreGrid
            lula={house.lulaPoll}
            flavio={house.flavioPoll}
            others={[
              { key: "cury", n: house.curyPoll },
              { key: "renan", n: house.renanPoll },
              { key: "caiado", n: house.caiadoPoll },
              { key: "zema", n: house.zemaPoll },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

function CurveKey({ houseFocus, showOthers }: { houseFocus: boolean; showOthers: boolean }) {
  return (
    <div className="mt-3 flex flex-col gap-2 text-xs font-medium sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: CHART.lula }} />
          Lula
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: CHART.flavio }} />
          Flávio
        </span>
        {showOthers
          ? OTHERS.map((other) => (
              <span key={other.key} className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full" style={{ background: other.color }} />
                {other.label}
              </span>
            ))
          : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-cream/80">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
            <circle cx="6" cy="5" r="2.2" fill={CHART.axis} opacity="0.45" />
          </svg>
          ponto: nesta pesquisa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden>
            <line x1="2" y1="5" x2="28" y2="5" stroke={CHART.axis} strokeWidth="3.4" />
          </svg>
          {houseFocus ? "linha: esta casa" : "linha: média do período"}
        </span>
      </div>
    </div>
  );
}

function CurvePlot({
  data,
  domain,
  xMin,
  xMax,
  ticks,
  yTickValues,
  houseFocus,
  kind,
  hideX,
  heightClass,
}: {
  data: CurveRow[];
  domain: [number, number];
  xMin: number;
  xMax: number;
  ticks: number[];
  yTickValues: number[];
  houseFocus: boolean;
  kind: "race" | "others" | "all";
  hideX?: boolean;
  heightClass: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const animateAvg = !reduceMotion;
  const showRace = kind === "race" || kind === "all";
  const drawOthersAvg = kind === "others" || kind === "all";
  const showOtherDots = kind === "all" || (kind === "others" && houseFocus);
  const lulaKey = houseFocus ? "lulaAvg" : "lulaLine";
  const flavioKey = houseFocus ? "flavioAvg" : "flavioLine";
  return (
    <div className={`curve-stage ${heightClass} w-full min-w-0`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: hideX ? 4 : 6, bottom: hideX ? 0 : 2 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART.grid}
            strokeOpacity={0.28}
            vertical={false}
          />
          <XAxis
            {...XAXIS}
            domain={[xMin, xMax]}
            ticks={ticks}
            allowDataOverflow
            tick={hideX ? false : XAXIS.tick}
            height={hideX ? 0 : XAXIS.height}
          />
          <YAxis
            domain={domain}
            ticks={yTickValues}
            interval={0}
            tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
            unit="%"
            width={40}
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            allowDataOverflow={false}
          />
          <Tooltip
            content={CurveTip}
            cursor={{ stroke: CHART.axis, strokeWidth: 1, strokeOpacity: 0.35 }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ pointerEvents: "none", zIndex: 30, overflow: "visible" }}
          />
          {showRace ? (
              <Line
                type="linear"
                dataKey="lulaPoll"
                legendType="none"
                stroke="none"
                dot={{
                  r: houseFocus ? 3 : 2,
                  fill: CHART.lula,
                  fillOpacity: houseFocus ? 0.85 : 0.2,
                  strokeWidth: 0,
                }}
                activeDot={false}
                isAnimationActive={false}
              />
          ) : null}
          {showRace ? (
              <Line
                type="linear"
                dataKey="flavioPoll"
                legendType="none"
                stroke="none"
                dot={{
                  r: houseFocus ? 3 : 2,
                  fill: CHART.flavio,
                  fillOpacity: houseFocus ? 0.85 : 0.2,
                  strokeWidth: 0,
                }}
                activeDot={false}
                isAnimationActive={false}
              />
          ) : null}
          {showRace ? (
              <Line
                type={houseFocus ? "linear" : "monotone"}
                dataKey={lulaKey}
                legendType="none"
                stroke={CHART.lula}
                strokeWidth={houseFocus ? 3 : 3.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                connectNulls
                dot={false}
                activeDot={softActive(CHART.lula)}
                isAnimationActive={animateAvg}
                animationDuration={LINE_ANIM_MS}
                animationEasing="ease-out"
              />
          ) : null}
          {showRace ? (
              <Line
                type={houseFocus ? "linear" : "monotone"}
                dataKey={flavioKey}
                legendType="none"
                stroke={CHART.flavio}
                strokeWidth={houseFocus ? 3 : 3.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                connectNulls
                dot={false}
                activeDot={softActive(CHART.flavio)}
                isAnimationActive={animateAvg}
                animationDuration={LINE_ANIM_MS}
                animationEasing="ease-out"
              />
          ) : null}
          {showOtherDots
            ? OTHERS.map((other) => (
                <Line
                  key={`${other.key}-poll`}
                  type="linear"
                  dataKey={`${other.key}Poll`}
                  legendType="none"
                  stroke="none"
                  connectNulls={false}
                  dot={{
                    r: houseFocus ? 2.4 : 1.6,
                    fill: other.color,
                    fillOpacity: houseFocus ? 0.8 : 0.18,
                    strokeWidth: 0,
                  }}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ))
            : null}
          {drawOthersAvg
            ? OTHERS.map((other) => (
                <Line
                  key={`${other.key}-avg`}
                  type={houseFocus ? "linear" : "monotone"}
                  dataKey={houseFocus ? `${other.key}Avg` : `${other.key}Line`}
                  legendType="none"
                  stroke={other.color}
                  strokeWidth={houseFocus ? 2.2 : 2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.95}
                  connectNulls
                  dot={false}
                  activeDot={softActive(other.color, 3.5)}
                  isAnimationActive={animateAvg}
                  animationDuration={LINE_ANIM_MS}
                  animationEasing="ease-out"
                />
              ))
            : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


export function GrowthCurve({
  polls,
  asOf,
  halfLifeDays,
}: {
  polls: ForecastPoll[];
  asOf: string;
  halfLifeDays: number;
}) {
  const [round, setRound] = useState<RoundKey>("1");
  const [house, setHouse] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeFilterKey | null>(null);
  const { first, second, houseOpts, modeOpts, avg1, avg2 } = useMemo(() => {
    const visible = polls.filter(
      (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
    );
    const byMode = mode
      ? visible.filter((poll) => modeFilterKey(poll.mode) === mode)
      : visible;
    const focused = house
      ? byMode.filter((poll) => houseFilterKey(poll.institute) === house)
      : byMode;
    const trend = buildNationalTrend(focused);
    const avg1 = asOfDayAverages(focused, asOf, halfLifeDays, false);
    const avg2 = asOfDayAverages(focused, asOf, halfLifeDays, true);
    const byDay1 = new Map(avg1.map((day) => [day.date, day]));
    const byDay2 = new Map(avg2.map((day) => [day.date, day]));
    const toDots = (
      points: typeof trend,
      byDay: Map<string, (typeof avg1)[number]>,
      key: RoundKey,
    ): CurveRow[] => {
      const rows: CurveRow[] = points.map((point) => {
        const lulaPoll = key === "2" ? point.lula2 : point.lula1;
        const flavioPoll = key === "2" ? point.flavio2 : point.flavio1;
        const day = byDay.get(point.published);
        const curyPoll = key === "1" ? point.cury1 : null;
        const renanPoll = key === "1" ? point.renan1 : null;
        const caiadoPoll = key === "1" ? point.caiado1 : null;
        const zemaPoll = key === "1" ? point.zema1 : null;
        return {
          t: isoDayUtc(point.published),
          institute: point.institute,
          published: point.published,
          fieldStart: point.fieldStart,
          fieldEnd: point.fieldEnd,
          lulaPoll,
          flavioPoll,
          lulaAvg: house ? lulaPoll : (day?.lula ?? null),
          flavioAvg: house ? flavioPoll : (day?.flavio ?? null),
          lulaLine: house ? lulaPoll : (day?.lula ?? null),
          flavioLine: house ? flavioPoll : (day?.flavio ?? null),
          curyPoll,
          renanPoll,
          caiadoPoll,
          zemaPoll,
          curyAvg: key === "1" ? (house ? curyPoll : (day?.cury ?? null)) : null,
          renanAvg: key === "1" ? (house ? renanPoll : (day?.renan ?? null)) : null,
          caiadoAvg: key === "1" ? (house ? caiadoPoll : (day?.caiado ?? null)) : null,
          zemaAvg: key === "1" ? (house ? zemaPoll : (day?.zema ?? null)) : null,
          curyLine: key === "1" ? (house ? curyPoll : (day?.cury ?? null)) : null,
          renanLine: key === "1" ? (house ? renanPoll : (day?.renan ?? null)) : null,
          caiadoLine: key === "1" ? (house ? caiadoPoll : (day?.caiado ?? null)) : null,
          zemaLine: key === "1" ? (house ? zemaPoll : (day?.zema ?? null)) : null,
          sameDay: housesOnCurveDay(focused, point.published, asOf, key),
          houseFocus: Boolean(house),
        };
      });
      if (house) {
        for (let i = 1; i < rows.length; i++) {
          const prev = rows[i - 1]!;
          const cur = rows[i]!;
          if (cur.lulaPoll != null && prev.lulaPoll != null) {
            cur.prevPublished = prev.published;
            cur.dLula = Number((cur.lulaPoll - prev.lulaPoll).toFixed(1));
          }
          if (cur.flavioPoll != null && prev.flavioPoll != null) {
            cur.dFlavio = Number((cur.flavioPoll - prev.flavioPoll).toFixed(1));
          }
        }
      }
      return rows;
    };
    const firstDots = toDots(trend, byDay1, "1");
    const secondDots = toDots(
      trend.filter((point) => point.lula2 != null && point.flavio2 != null),
      byDay2,
      "2",
    );
    return {
      first: firstDots,
      second: secondDots,
      houseOpts: houseFilterOptions(byMode),
      modeOpts: modeFilterOptions(visible),
      avg1,
      avg2,
    };
  }, [polls, asOf, halfLifeDays, house, mode]);

  if (first.length < 3 && !house && !mode) return null;
  const canSecond = second.length >= 2;
  const active: RoundKey = round === "2" && canSecond ? "2" : "1";
  const data = active === "2" ? second : first;
  if (data.length < 1) return null;
  const houseFocus = Boolean(house);
  const plotted = houseFocus
    ? avgOnFirstOfDay(data)
    : mergeLineAndPolls(densifyDayAverages(active === "2" ? avg2 : avg1, asOf), data);
  const ticks = monthTicks(YEAR_START, asOf);
  const xMin = isoDayUtc(YEAR_START);
  const xMax = isoDayUtc(asOf);
  const showOthers = active === "1";
  const splitOthers = showOthers && !houseFocus;
  const raceFallback: [number, number] = active === "2" ? [36, 52] : [24, 48];
  const raceDomain = niceYDomain(
    paddedDomain(valuesForDomain(plotted, false), raceFallback),
    raceFallback,
  );
  const domain: [number, number] = splitOthers
    ? raceDomain
    : niceYDomain(
        paddedDomain(valuesForDomain(plotted, showOthers), raceDomain),
        raceDomain,
      );
  const othersDomain: [number, number] = niceYDomain(
    [0, paddedDomain(valuesForOthers(plotted), [0, 16])[1]],
    [0, 16],
  );
  const raceTicks = yTicks(splitOthers ? raceDomain : domain);
  const otherTicks = yTicks(othersDomain);

  return (
    <section id="curva" className="mb-6 scroll-mt-24">
      <div className="board-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker">Linha de crescimento</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {active === "2" ? "2º turno, Lula × Flávio" : "1º turno"}
            </p>
            <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-cream/85">
              {active === "2" ? "Só pesquisas que perguntaram o par. " : splitOthers ? "Cima: Lula e Flávio. Baixo: os outros. " : "Nome só entra se a casa perguntou. "}
              {houseFocus
                ? `Só ${house}. A linha liga as ondas desta casa.`
                : mode
                  ? `Só ${modeFilterLabel(mode).toLowerCase()}. De janeiro até hoje. Pontos são cada casa. A linha é a média.`
                  : "De janeiro até hoje. Pontos são cada casa. A linha é a média do período."}
            </p>
          </div>
          <SegGroup ariaLabel="Turno da curva">
            <button
              type="button"
              className="seg-btn"
              aria-pressed={active === "1"}
              onClick={() => setRound("1")}
            >
              <span className="seg-label">1º</span>
              <span className="seg-meta">turno</span>
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={active === "2"}
              aria-disabled={!canSecond}
              disabled={!canSecond}
              onClick={() => canSecond && setRound("2")}
            >
              <span className="seg-label">2º</span>
              <span className="seg-meta">turno</span>
            </button>
          </SegGroup>
        </div>
        <CurveKey houseFocus={houseFocus} showOthers={showOthers} />
        {modeOpts.length > 1 ? (
          <div
            className="chip-row mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap"
            role="group"
            aria-label="Filtrar por tipo de pesquisa"
          >
            <button
              type="button"
              aria-pressed={!mode}
              onClick={() => setMode(null)}
              className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                !mode ? "border-gold bg-gold/10 text-gold" : "border-border bg-surface text-fg hover:border-cream/35"
              }`}
            >
              Todos os tipos
            </button>
            {modeOpts.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => {
                  setMode(key);
                  setHouse(null);
                }}
                className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  mode === key
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border bg-surface text-fg hover:border-cream/35"
                }`}
              >
                {modeFilterLabel(key)}
              </button>
            ))}
          </div>
        ) : null}
        {houseOpts.length ? (
          <div
            className="chip-row mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap"
            role="group"
            aria-label="Filtrar por casa"
          >
            <button
              type="button"
              aria-pressed={!house}
              onClick={() => setHouse(null)}
              className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                !house ? "border-gold bg-gold/10 text-gold" : "border-border bg-surface text-fg hover:border-cream/35"
              }`}
            >
              Todas
            </button>
            {houseOpts.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={house === name}
                onClick={() => setHouse(name)}
                className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  house === name
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border bg-surface text-fg hover:border-cream/35"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
        {splitOthers ? (
          <div className="relative z-10 mt-2 overflow-visible">
            <CurvePlot
              data={plotted}
              domain={raceDomain}
              xMin={xMin}
              xMax={xMax}
              ticks={ticks}
              yTickValues={raceTicks}
              houseFocus={houseFocus}
              kind="race"
              hideX
              heightClass="h-48 sm:h-56"
            />
            <div className="relative border-t border-border/70">
              <p className="pointer-events-none absolute left-11 top-1 z-10 text-[10px] font-medium text-cream/70">Os outros</p>
              <CurvePlot
                data={plotted}
                domain={othersDomain}
                xMin={xMin}
                xMax={xMax}
                ticks={ticks}
                yTickValues={otherTicks}
                houseFocus={houseFocus}
                kind="others"
                heightClass="h-28 sm:h-36"
              />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <CurvePlot
              data={plotted}
              domain={domain}
              xMin={xMin}
              xMax={xMax}
              ticks={ticks}
              yTickValues={raceTicks}
              houseFocus={houseFocus}
              kind={showOthers ? "all" : "race"}
              heightClass="h-80 sm:h-96"
            />
          </div>
        )}
      </div>
    </section>
  );
}
