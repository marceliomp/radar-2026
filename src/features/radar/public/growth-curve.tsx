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
import { fieldPeriodLine, fmtNum } from "@/lib/format";
import { buildNationalTrend, rollingAverage } from "@/lib/forecast/trends";
import type { ForecastPoll } from "@/lib/forecast/engine";

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
};

type TipRow = {
  dataKey?: string | number;
  value?: number | string;
  payload?: CurveRow;
};

function dateBr(iso?: string) {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8)}/${iso.slice(5, 7)}`;
}

function CurveTip({ active, payload }: { active?: boolean; payload?: TipRow[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const pick = (key: keyof CurveRow) => {
    const hit = payload.find((item) => item.dataKey === key);
    const raw = Number(hit?.value);
    return Number.isFinite(raw) ? `${fmtNum(raw)}%` : "n/d";
  };
  return (
    <div style={{ ...tipStyle, padding: "10px 12px", minWidth: 196, color: CHART.fg }}>
      <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
        {row?.institute ?? ""} · {dateBr(row?.published)}
      </p>
      <p className="m-0 mt-0.5 text-[11px] font-medium text-cream/70">
        {fieldPeriodLine(row?.fieldStart, row?.fieldEnd)}
      </p>
      <p className="m-0 mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
        Nesta pesquisa
      </p>
      <p className="m-0 mt-1 font-mono text-sm tabular-nums">
        <span style={{ color: CHART.lula }}>Lula {pick("lulaPoll")}</span>
        <span className="text-cream/35"> · </span>
        <span style={{ color: CHART.flavio }}>Flávio {pick("flavioPoll")}</span>
      </p>
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
