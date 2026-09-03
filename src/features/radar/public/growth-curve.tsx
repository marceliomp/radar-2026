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
import { dateBr, fieldPeriodLine, fmtNum } from "@/lib/format";
import { buildNationalTrend, rollingAverage } from "@/lib/forecast/trends";
import type { ForecastPoll } from "@/lib/forecast/engine";
import { pollsOnDate } from "@/lib/latest-day";

const XAXIS = {
  dataKey: "label" as const,
  interval: "equidistantPreserveStart" as const,
  angle: -40,
  textAnchor: "end" as const,
  height: 64,
  minTickGap: 18,
  tick: { fill: CHART.axis, fontSize: 11, fontWeight: 500 },
  axisLine: false,
  tickLine: false,
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
  label: string;
  institute: string;
  published: string;
  fieldStart?: string;
  fieldEnd: string;
  lulaPoll: number | null;
  flavioPoll: number | null;
  lulaAvg: number | null;
  flavioAvg: number | null;
  sameDay: DayHouse[];
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
  const houses = row.sameDay.length ? row.sameDay : [
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
    return Number.isFinite(raw) ? `${fmtNum(raw)}%` : "n/d";
  };
  return (
    <div style={{ ...tipStyle, padding: "10px 12px", minWidth: 196, maxWidth: 280, color: CHART.fg }}>
      <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
        {many
          ? `${dateBr(row.published)} · ${houses.length} pesquisas`
          : `${houses[0]?.institute ?? ""} · ${dateBr(row.published)}`}
      </p>
      {houses.map((house, i) => (
        <div key={`${house.institute}-${i}`} className={i === 0 ? "mt-0.5" : "mt-2.5"}>
          {many ? (
            <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
              {house.institute}
            </p>
          ) : null}
          <p className="m-0 mt-0.5 text-[11px] font-medium text-cream/70">
            {fieldPeriodLine(house.fieldStart, house.fieldEnd)}
          </p>
          {!many ? (
            <p className="m-0 mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
              Nesta pesquisa
            </p>
          ) : null}
          <p className="m-0 mt-1 font-mono text-sm tabular-nums">
            <span style={{ color: CHART.lula }}>Lula {pct(house.lulaPoll)}</span>
            <span className="text-cream/35"> · </span>
            <span style={{ color: CHART.flavio }}>Flávio {pct(house.flavioPoll)}</span>
          </p>
        </div>
      ))}
      <p className="m-0 mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
        Média das 3 últimas
      </p>
      <p className="m-0 mt-1 font-mono text-sm tabular-nums">
        <span style={{ color: CHART.lula }}>Lula {pick("lulaAvg")}</span>
        <span className="text-cream/35"> · </span>
        <span style={{ color: CHART.flavio }}>Flávio {pick("flavioAvg")}</span>
      </p>
    </div>
  );
}

function CurveKey() {
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
          <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden>
            <circle cx="5" cy="5" r="2.4" fill={CHART.axis} opacity="0.85" />
            <line x1="10" y1="5" x2="28" y2="5" stroke={CHART.axis} strokeWidth="1.3" opacity="0.55" />
          </svg>
          ponto: nesta pesquisa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden>
            <line x1="2" y1="5" x2="28" y2="5" stroke={CHART.axis} strokeWidth="2.6" />
          </svg>
          linha: média das 3 últimas
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
}) {
  const [round, setRound] = useState<RoundKey>("1");
  const { first, second } = useMemo(() => {
    const visible = polls.filter(
      (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
    );
    const smooth = rollingAverage(buildNationalTrend(visible), 3);
    return {
      first: smooth.map((point) => ({
        label: point.label,
        institute: point.institute,
        published: point.published,
        fieldStart: point.fieldStart,
        fieldEnd: point.fieldEnd,
        lulaPoll: point.lula1,
        flavioPoll: point.flavio1,
        lulaAvg: point.lula1Avg,
        flavioAvg: point.flavio1Avg,
        sameDay: housesOnCurveDay(visible, point.published, asOf, "1"),
      })),
      second: smooth
        .filter((point) => point.lula2 != null && point.flavio2 != null)
        .map((point) => ({
          label: point.label,
          institute: point.institute,
          published: point.published,
          fieldStart: point.fieldStart,
          fieldEnd: point.fieldEnd,
          lulaPoll: point.lula2,
          flavioPoll: point.flavio2,
          lulaAvg: point.lula2Avg,
          flavioAvg: point.flavio2Avg,
          sameDay: housesOnCurveDay(visible, point.published, asOf, "2"),
        })),
    };
  }, [polls, asOf]);

  if (first.length < 3) return null;
  const canSecond = second.length >= 3;
  const active: RoundKey = round === "2" && canSecond ? "2" : "1";
  const data = active === "2" ? second : first;
  const domain: [number, number] = active === "2" ? [35, 52] : [26, 48];

  return (
    <section id="curva" className="mb-6 scroll-mt-24">
      <div className="board-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker">Linha de crescimento</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {active === "2" ? "2º turno, Lula × Flávio" : "1º turno, Lula × Flávio"}
            </p>
            {active === "2" ? (
              <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-cream/85">
                Só pesquisas que perguntaram o par.
              </p>
            ) : null}
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
        <CurveKey />
        <div className="mt-3 h-72 w-full min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis {...XAXIS} />
              <YAxis
                domain={domain}
                tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                unit="%"
                width={36}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={CurveTip} cursor={false} />
              <Line
                type="monotone"
                dataKey="lulaPoll"
                legendType="none"
                stroke={CHART.lula}
                strokeWidth={1.5}
                strokeOpacity={0.55}
                dot={{ r: 3, fill: CHART.lula }}
              />
              <Line
                type="monotone"
                dataKey="flavioPoll"
                legendType="none"
                stroke={CHART.flavio}
                strokeWidth={1.5}
                strokeOpacity={0.55}
                dot={{ r: 3, fill: CHART.flavio }}
              />
              <Line
                type="monotone"
                dataKey="lulaAvg"
                legendType="none"
                stroke={CHART.lula}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="flavioAvg"
                legendType="none"
                stroke={CHART.flavio}
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
