import { Area, AreaChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ChartTip } from "@/components/chart-tooltip";
import { CHART } from "@/lib/chart-theme";
import { POLL_XAXIS } from "../lab-shared";

export function TrendsTab({
  growth1Chart,
  gap1Chart,
}: {
  growth1Chart: Record<string, unknown>[];
  gap1Chart: Record<string, unknown>[];
}) {
  return (
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

  );
}
