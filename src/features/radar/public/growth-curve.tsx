import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTip } from "@/components/chart-tooltip";
import { CHART } from "@/lib/chart-theme";
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

function PairChart({
  data,
  domain,
}: {
  data: Record<string, unknown>[];
  domain: [number, number];
}) {
  return (
    <div className="mt-4 h-72 w-full min-w-0 sm:h-80">
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
  );
}

export function GrowthCurve({
  polls,
  asOf,
}: {
  polls: ForecastPoll[];
  asOf: string;
}) {
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
        fieldEnd: point.fieldEnd,
        Lula: point.lula1,
        Flávio: point.flavio1,
        "Lula (média 3)": point.lula1Avg,
        "Flávio (média 3)": point.flavio1Avg,
      })),
      second: smooth
        .filter((point) => point.lula2 != null && point.flavio2 != null)
        .map((point) => ({
          label: point.label,
          institute: point.institute,
          published: point.published,
          fieldEnd: point.fieldEnd,
          Lula: point.lula2,
          Flávio: point.flavio2,
          "Lula (média 3)": point.lula2Avg,
          "Flávio (média 3)": point.flavio2Avg,
        })),
    };
  }, [polls, asOf]);

  if (first.length < 3) return null;

  return (
    <section id="curva" className="mb-6 scroll-mt-24 space-y-4">
      <div className="board-card">
        <p className="kicker">Linha de crescimento</p>
        <p className="mt-1 font-display text-xl font-semibold">1º turno, Lula × Flávio</p>
        <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-cream/85">
          Cada ponto é uma pesquisa nacional. A linha grossa é a média das 3 últimas.
        </p>
        <PairChart data={first} domain={[26, 48]} />
      </div>
      {second.length >= 3 ? (
        <div className="board-card">
          <p className="kicker">Linha de crescimento</p>
          <p className="mt-1 font-display text-xl font-semibold">2º turno, Lula × Flávio</p>
          <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-cream/85">
            Só as pesquisas que perguntaram o par. Linha grossa = média das 3 últimas com 2º turno.
          </p>
          <PairChart data={second} domain={[35, 52]} />
        </div>
      ) : null}
    </section>
  );
}
