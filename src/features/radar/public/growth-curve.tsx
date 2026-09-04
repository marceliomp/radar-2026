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
  CURVE_PERIOD_DAYS,
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
  const houses = row.sameDay.length
    ? row.sameDay
    : [
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
      ];
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
        Média do período · últimos {CURVE_PERIOD_DAYS} dias
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
          {houseFocus ? "linha: esta casa" : "linha: média dos últimos 7 dias"}
        </span>
      </div>
    </div>
  );
}

export function GrowthCurve({
  polls,
  asOf,
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
    const avg1 = asOfDayAverages(focused, asOf, CURVE_PERIOD_DAYS, false);
    const avg2 = asOfDayAverages(focused, asOf, CURVE_PERIOD_DAYS, true);
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
          curyPoll,
          renanPoll,
          caiadoPoll,
          zemaPoll,
          curyAvg: key === "1" ? (house ? curyPoll : (day?.cury ?? null)) : null,
          renanAvg: key === "1" ? (house ? renanPoll : (day?.renan ?? null)) : null,
          caiadoAvg: key === "1" ? (house ? caiadoPoll : (day?.caiado ?? null)) : null,
          zemaAvg: key === "1" ? (house ? zemaPoll : (day?.zema ?? null)) : null,
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
  }, [polls, asOf, house]);

  if (first.length < 3 && !house) return null;
  const canSecond = second.length >= 2;
  const active: RoundKey = round === "2" && canSecond ? "2" : "1";
  const data = active === "2" ? second : first;
  if (data.length < 1) return null;
  const ticks = axisTicks(data.map((row) => row.t));
  const domain: [number, number] = active === "2" ? [35, 52] : [0, 50];
  const houseFocus = Boolean(house);
  const showOthers = active === "1";

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
              {active === "2" ? "Só pesquisas que perguntaram o par. " : "Nome só entra se a casa perguntou. "}
              {houseFocus
                ? `Só ${house}. A linha liga as ondas desta casa.`
                : "Pontos são cada casa. A linha é a média dos últimos 7 dias."}
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
                strokeWidth={3.6}
                dot={false}
                activeDot={{ r: 4, fill: CHART.lula, strokeWidth: 0 }}
                isAnimationActive={false}
              />
              <Line
                type={houseFocus ? "linear" : "monotone"}
                dataKey="flavioAvg"
                legendType="none"
                stroke={CHART.flavio}
                strokeWidth={3.6}
                dot={false}
                activeDot={{ r: 4, fill: CHART.flavio, strokeWidth: 0 }}
                isAnimationActive={false}
              />
              {showOthers
                ? OTHERS.map((other) => (
                    <Line
                      key={`${other.key}-poll`}
                      type="linear"
                      dataKey={`${other.key}Poll`}
                      legendType="none"
                      stroke="none"
                      connectNulls={false}
                      dot={{
                        r: houseFocus ? 2.6 : 2,
                        fill: other.color,
                        fillOpacity: houseFocus ? 0.85 : 0.5,
                        strokeWidth: 0,
                      }}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  ))
                : null}
              {showOthers
                ? OTHERS.map((other) => (
                    <Line
                      key={`${other.key}-avg`}
                      type={houseFocus ? "linear" : "monotone"}
                      dataKey={`${other.key}Avg`}
                      legendType="none"
                      stroke={other.color}
                      strokeWidth={3.6}
                      strokeOpacity={0.9}
                      connectNulls
                      dot={false}
                      activeDot={{ r: 3.5, fill: other.color, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))
                : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
