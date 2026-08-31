import { Medal } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ChartTip } from "@/components/chart-tooltip";
import { CHART } from "@/lib/chart-theme";
import { polls } from "@/data/polls";
import { fmtMult, fmtPct } from "@/lib/format";
import { ELECTION_2022_2T, TRACK_2022, TRACK_RANKING_DISPLAY, resolveInstitute, trackQuality } from "@/lib/forecast/track-record";

export function TrackTab({
  qualityBars,
}: {
  qualityBars: { name: string; full: string; quality: number }[];
}) {
  return (
        <TabsContent value="track" className="mt-4 space-y-4">
          <Card className="border-primary/30 glow-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="size-4 text-primary" />
                Quem mais acertou o 2º (2018 e 2022)
              </CardTitle>
              <CardDescription>
                Urna 2022: Lula {fmtPct(ELECTION_2022_2T.lula)} × Bolsonaro{" "}
                {fmtPct(ELECTION_2022_2T.bolsonaro)}. Erro = diferença da
                última pesquisa para a urna. Casas com menos erro pesam mais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {TRACK_RANKING_DISPLAY.map((r) => (
                  <div
                    key={r.institute + r.rank}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface-2/50 px-3 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {r.rank}. {r.institute}
                      </p>
                      <p className="text-xs font-medium text-gold">
                        erro ~{r.mae} · peso ×
                        {fmtMult(trackQuality(r.institute))}
                      </p>
                    </div>
                    <Badge variant="default">peso ↑</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-gold">
                Peso = recência × tamanho da amostra × modo × acerto vs urna.
                Sem puxar para um lado. Acerto = 1,55 / (0,55 + erro vs urna).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality score por instituto (2026 no modelo)</CardTitle>
              <CardDescription>
                Multiplicador no agregador (Palver ↓ online; Gerp/Datafolha ↑)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={qualityBars}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART.grid}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 1.5]}
                      tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
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
                    <Bar dataKey="quality" name="quality" radius={[0, 6, 6, 0]}>
                      {qualityBars.map((e) => (
                        <Cell
                          key={e.full}
                          fill={
                            e.quality >= 1.2
                              ? CHART.accent
                              : e.quality < 0.85
                                ? CHART.renan
                                : CHART.flavio
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas por casa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.values(TRACK_2022)
                .filter((t) =>
                  polls.some(
                    (p) =>
                      p.national &&
                      resolveInstitute(p.institute) === t.institute,
                  ),
                )
                .map((t) => (
                  <div
                    key={t.institute}
                    className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{t.institute}</span>
                      <span className="tabular-nums text-primary">
                        ×{fmtMult(trackQuality(t.institute))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-muted">{t.note}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

  );
}
