import { MapPin } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ChartTip } from "@/components/chart-tooltip";
import { UF_META } from "@/data/calendar";
import { CHART } from "@/lib/chart-theme";
import { fmtNum, fmtPct, shownGap } from "@/lib/format";
import type { ForecastPoll } from "@/lib/forecast/engine";

export function MethodTab({
  barData,
  statePolls,
}: {
  barData: { name: string; value: number; fill: string }[];
  statePolls: ForecastPoll[];
}) {
  return (
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

  );
}
