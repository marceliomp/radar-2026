import { useMemo, useState } from "react";
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
  utcMsToDayBr,
} from "@/lib/format";
import {
  asOfDayAverages,
  axisTicks,
  houseFilterKey,
  houseFilterOptions,
} from "@/lib/forecast/curve-series";
import { buildNationalTrend } from "@/lib/forecast/trends";
import type { ForecastPoll } from "@/lib/forecast/engine";
import { pollsOnDate } from "@/lib/latest-day";

function timeDomain([min, max]: [number, number]): [number, number] {
  const span = Math.max(max - min, 86_400_000);
  const pad = span * 0.04;
  return [min - pad, max + pad];
}

function tickDay(value: number | string) {
  return utcMsToDayBr(Number(value));
}

const XAXIS = {
  type: "number" as const,
  dataKey: "t" as const,
  domain: timeDomain,
  tickFormatter: tickDay,
  interval: 0 as const,
  minTickGap: 28,
  tick: { fill: CHART.axis, fontSize: 11, fontWeight: 500 },
  axisLine: false,
  tickLine: false,
  height: 28,
  padding: { left: 8, right: 8 },
};

type RoundKey = "1" | "2";

type DayHouse = {
  institute: string;
  fieldStart?: string;
  fieldEnd: string;
  lulaPoll: number | null;
  flavioPoll: number | null;
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
  sameDay: DayHouse[];
  houseFocus: boolean;
  prevPublished?: string;
  dLula?: number | null;
  dFlavio?: number | null;
};

type TipRow = {
  dataKey?: string | number;
  value?: number | string;
  payload?: CurveRow;
};

function pct(n: number | null | undefined) {
  return n == null || !Number.isFinite(n) ? "n/d" : `${fmtNum(n)}%`;
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
    }))
    .filter((house) => house.lulaPoll != null && house.flavioPoll != null);
}

function CurveTip({ active, payload }: { active?: boolean; payload?: TipRow[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const houses = row.sameDay.length
    ? row.sameDay
    : [
        {
          institute: row.institute,
          fieldStart: row.fieldStart,
          fieldEnd: row.fieldEnd,
          lulaPoll: row.lulaPoll,
          flavioPoll: row.flavioPoll,
        },
      ];
  const many = houses.length > 1;
  const pick = (key: keyof CurveRow) => {
    const hit = payload.find((item) => item.dataKey === key);
    const raw = Number(hit?.value);
    if (Number.isFinite(raw)) return `${fmtNum(raw)}%`;
    const fromRow = row[key];
    return typeof fromRow === "number" && Number.isFinite(fromRow) ? pct(fromRow) : "n/d";
  };
  if (row.houseFocus) {
    const house = houses[0];
    return (
      <div style={{ ...tipStyle, padding: "10px 12px", minWidth: 196, maxWidth: 280, color: CHART.fg }}>
        <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
          {house?.institute ?? row.institute} · {dateBr(row.published)}
        </p>
        <p className="m-0 mt-0.5 text-[11px] font-medium text-cream/55">
          {fieldPeriodLine(house?.fieldStart ?? row.fieldStart, house?.fieldEnd ?? row.fieldEnd)}
        </p>
        <p className="m-0 mt-2 font-mono text-base font-semibold tabular-nums">
          <span style={{ color: CHART.lula }}>Lula {pct(house?.lulaPoll ?? row.lulaPoll)}</span>
          <span className="text-cream/35"> · </span>
          <span style={{ color: CHART.flavio }}>Flávio {pct(house?.flavioPoll ?? row.flavioPoll)}</span>
        </p>
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
    <div style={{ ...tipStyle, padding: "10px 12px", minWidth: 196, maxWidth: 280, color: CHART.fg }}>
      <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
        {dateBr(row.published)}
        {many ? ` · ${houses.length} pesquisas` : ""}
      </p>
      <p className="m-0 mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
        Média do período
      </p>
      <p className="m-0 mt-1 font-mono text-base font-semibold tabular-nums">
        <span style={{ color: CHART.lula }}>Lula {pick("lulaAvg")}</span>
        <span className="text-cream/35"> · </span>
        <span style={{ color: CHART.flavio }}>Flávio {pick("flavioAvg")}</span>
      </p>
      {houses.map((house, i) => (
        <div key={`${house.institute}-${i}`} className={i === 0 ? "mt-3" : "mt-2.5"}>
          <p className="m-0 text-[12px] font-medium text-cream/80">{house.institute}</p>
          <p className="m-0 mt-0.5 text-[11px] font-medium text-cream/55">
            {fieldPeriodLine(house.fieldStart, house.fieldEnd)}
          </p>
          <p className="m-0 mt-1 font-mono text-[13px] tabular-nums text-cream/85">
            <span style={{ color: CHART.lula }}>Lula {pct(house.lulaPoll)}</span>
            <span className="text-cream/35"> · </span>
            <span style={{ color: CHART.flavio }}>Flávio {pct(house.flavioPoll)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function CurveKey({ houseFocus }: { houseFocus: boolean }) {
  return (
    <div className="mt-3 flex flex-col gap-2 text-xs font-medium sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: CHART.lula }} />
          Lula
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: CHART.flavio }} />
          Flávio
        </span>
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
            <line x1="2" y1="5" x2="28" y2="5" stroke={CHART.axis} strokeWidth="2.6" />
          </svg>
          {houseFocus ? "linha: esta casa" : "linha: média do período"}
        </span>
      </div>
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
  const { first, second, houseOpts } = useMemo(() => {
    const visible = polls.filter(
      (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
    );
    const focused = house
      ? visible.filter((poll) => houseFilterKey(poll.institute) === house)
      : visible;
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
        return {
          t: isoDayUtc(point.published),
          institute: point.institute,
          published: point.published,
          fieldStart: point.fieldStart,
          fieldEnd: point.fieldEnd,
          lulaPoll,
          flavioPoll,
          lulaAvg: house ? lulaPoll : (byDay.get(point.published)?.lula ?? null),
          flavioAvg: house ? flavioPoll : (byDay.get(point.published)?.flavio ?? null),
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
      houseOpts: houseFilterOptions(visible),
    };
  }, [polls, asOf, halfLifeDays, house]);

  if (first.length < 3 && !house) return null;
  const canSecond = second.length >= 2;
  const active: RoundKey = round === "2" && canSecond ? "2" : "1";
  const data = active === "2" ? second : first;
  if (data.length < 1) return null;
  const ticks = axisTicks(data.map((row) => row.t));
  const domain: [number, number] = active === "2" ? [35, 52] : [26, 48];
  const houseFocus = Boolean(house);

  return (
    <section id="curva" className="mb-6 scroll-mt-24">
      <div className="board-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker">Linha de crescimento</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {active === "2" ? "2º turno, Lula × Flávio" : "1º turno, Lula × Flávio"}
            </p>
            <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-cream/85">
              {active === "2" ? "Só pesquisas que perguntaram o par. " : ""}
              {houseFocus
                ? `Só ${house}. A linha liga as ondas desta casa.`
                : "Pontos são cada casa. A linha é a média do período."}
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
        <CurveKey houseFocus={houseFocus} />
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
              className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                !house ? "border-gold bg-gold/10 text-gold" : "border-border bg-surface text-fg"
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
                className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  house === name
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border bg-surface text-fg"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 h-72 w-full min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis {...XAXIS} ticks={ticks} />
              <YAxis
                domain={domain}
                tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                unit="%"
                width={36}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={CurveTip}
                cursor={{ stroke: CHART.axis, strokeWidth: 1, strokeOpacity: 0.45 }}
                isAnimationActive={false}
                wrapperStyle={{ pointerEvents: "none" }}
              />
              <Line
                type="linear"
                dataKey="lulaPoll"
                legendType="none"
                stroke="none"
                dot={{
                  r: houseFocus ? 3.2 : 2.4,
                  fill: CHART.lula,
                  fillOpacity: houseFocus ? 0.9 : 0.42,
                  strokeWidth: 0,
                }}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="flavioPoll"
                legendType="none"
                stroke="none"
                dot={{
                  r: houseFocus ? 3.2 : 2.4,
                  fill: CHART.flavio,
                  fillOpacity: houseFocus ? 0.9 : 0.42,
                  strokeWidth: 0,
                }}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                type={houseFocus ? "linear" : "monotone"}
                dataKey="lulaAvg"
                legendType="none"
                stroke={CHART.lula}
                strokeWidth={2.8}
                dot={false}
                activeDot={{ r: 4, fill: CHART.lula, strokeWidth: 0 }}
                isAnimationActive={false}
              />
              <Line
                type={houseFocus ? "linear" : "monotone"}
                dataKey="flavioAvg"
                legendType="none"
                stroke={CHART.flavio}
                strokeWidth={2.8}
                dot={false}
                activeDot={{ r: 4, fill: CHART.flavio, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
