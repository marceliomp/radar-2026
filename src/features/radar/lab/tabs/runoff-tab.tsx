import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ChartTip } from "@/components/chart-tooltip";
import { CHART } from "@/lib/chart-theme";
import { fmtDelta, fmtProb } from "@/lib/format";
import { POLL_XAXIS } from "../lab-shared";

export function RunoffTab({
  mom,
  probs,
  round2Chart,
  gap2Chart,
}: {
  mom: { dFlavio2: number; dGap2: number };
  probs: { lulaWinsSecond: number };
  round2Chart: Record<string, unknown>[];
  gap2Chart: Record<string, unknown>[];
}) {
  return (
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

  );
}
