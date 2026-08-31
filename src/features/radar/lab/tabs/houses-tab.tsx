import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ChartTip } from "@/components/chart-tooltip";
import { CHART } from "@/lib/chart-theme";
import { fmtMult } from "@/lib/format";
import { trackQuality } from "@/lib/forecast/track-record";
import { DeltaPill } from "../lab-shared";

export function HousesTab({
  deltas,
  melhoraBars,
}: {
  deltas: Array<{
    institute: string;
    from: string;
    to: string;
    whoImproved1: string;
    dFlavio1: number;
    dLula1: number;
    dGap1: number;
    dGap2: number | null;
  }>;
  melhoraBars: Record<string, unknown>[];
}) {
  return (
        <TabsContent value="melhora" className="mt-4 space-y-4">
          <Card className="border-accent/25">
            <CardHeader>
              <CardTitle>Mesma casa: quem subiu?</CardTitle>
              <CardDescription>
                Compara a rodada nova com a anterior da mesma casa. Número
                negativo na diferença = Flávio encurtou.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deltas.map((d) => (
                <div
                  key={`${d.institute}-${d.from}-${d.to}`}
                  className="rounded-[var(--radius-md)] border border-border bg-surface-2/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-fg">{d.institute}</p>
                      <p className="text-xs font-medium text-muted">
                        {d.from} → {d.to} · quality ×
                        {fmtMult(trackQuality(d.institute))}
                      </p>
                    </div>
                    <Badge
                      variant={
                        d.whoImproved1 === "flavio" ? "default" : "muted"
                      }
                    >
                      1º:{" "}
                      {d.whoImproved1 === "flavio"
                        ? "Flávio melhor"
                        : d.whoImproved1 === "lula"
                          ? "Lula melhor"
                          : "estável"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-gold">Flávio 1º</p>
                      <DeltaPill value={d.dFlavio1} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gold">Lula 1º</p>
                      <DeltaPill value={d.dLula1} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gold">Diferença 1º</p>
                      <DeltaPill value={d.dGap1} invert />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gold">Diferença 2º</p>
                      {d.dGap2 != null ? (
                        <DeltaPill value={d.dGap2} invert />
                      ) : (
                        <span className="text-xs font-medium text-muted">n/d</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Barras de melhora</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={melhoraBars}
                    margin={{ bottom: 28, left: 0, right: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={48}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
                      unit=" pp"
                      width={36}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={ChartTip} cursor={false} />
                    <Legend wrapperStyle={{ color: CHART.fg, fontSize: 12 }} />
                    <ReferenceLine y={0} stroke={CHART.muted} />
                    <Bar dataKey="Δ Flávio 1º" fill={CHART.flavio} />
                    <Bar dataKey="Δ Lula 1º" fill={CHART.lula} />
                    <Bar dataKey="Δ gap (L−F)" fill={CHART.accent} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

  );
}
