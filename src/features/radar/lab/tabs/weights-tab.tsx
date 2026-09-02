import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { fieldRangeLabel, fmtMult, fmtNum } from "@/lib/format";

export function WeightsTab({
  rows,
}: {
  rows: Array<{
    poll: { id: string; institute: string; fieldStart?: string; fieldEnd: string; mode: string };
    wTrack: number;
    wRecency: number;
    weightShare: number;
    adjLula1: number;
    adjFlavio1: number;
  }>;
}) {
  return (
        <TabsContent value="weights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Decomposição de pesos</CardTitle>
              <CardDescription>
                recência × √n × modo × acerto 2018/2022
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wider text-fg/75">
                    <tr>
                      <th className="px-3 py-2.5">Instituto</th>
                      <th className="px-3 py-2.5">Campo</th>
                      <th className="px-3 py-2.5">Modo</th>
                      <th className="px-3 py-2.5 tabular-nums">Track</th>
                      <th className="px-3 py-2.5 tabular-nums">Rec.</th>
                      <th className="px-3 py-2.5 tabular-nums">Peso %</th>
                      <th className="px-3 py-2.5 tabular-nums">L adj</th>
                      <th className="px-3 py-2.5 tabular-nums">F adj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.poll.id}
                        className="border-t border-border hover:bg-surface-2/50"
                      >
                        <td className="px-3 py-2.5 font-medium">
                          {r.poll.institute}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-muted">
                          {fieldRangeLabel(r.poll.fieldStart, r.poll.fieldEnd)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={
                              r.poll.mode === "presencial" ? "muted" : "online"
                            }
                          >
                            {r.poll.mode}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-accent">
                          ×{fmtMult(r.wTrack)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {fmtMult(r.wRecency)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-primary">
                          {fmtNum(r.weightShare * 100)}%
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-lula">
                          {fmtNum(r.adjLula1)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-flavio">
                          {fmtNum(r.adjFlavio1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex gap-2 text-xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Gerp/Datafolha/Paraná sobem no peso quando o track está ON.
                Palver online cai. Sem correção de lado.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

  );
}
