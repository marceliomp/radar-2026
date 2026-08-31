import { CalendarClock, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CALENDAR } from "@/data/calendar";
import { fmtDateBr } from "../lab-shared";

export function AgendaTab({
  upcoming,
  daysLeft,
}: {
  upcoming: { title: string; date: string; detail?: string; institute?: string } | null;
  daysLeft: number | null;
}) {
  return (
        <TabsContent value="agenda" className="mt-4 space-y-4">
          <Card className="border-primary/40 bg-gradient-to-br from-surface via-surface to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                Próximo marco
              </CardTitle>
              <CardDescription>
                {upcoming
                  ? `${upcoming.title} · ${fmtDateBr(upcoming.date)}`
                  : "Nenhum marco futuro cadastrado. Veja o que já saiu abaixo."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-gold">Quando</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-primary">
                  {upcoming
                    ? daysLeft === 0
                      ? "Hoje"
                      : daysLeft
                    : "n/d"}
                  {upcoming && daysLeft !== 0 ? (
                    <span className="text-lg font-medium text-gold">
                      {" "}
                      {daysLeft === 1 ? "dia" : "dias"}
                    </span>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gold">O que é</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-fg">
                  {upcoming?.detail ??
                    "Linha do tempo com o que já saiu."}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gold">Por que entra</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-fg">
                  {upcoming?.institute
                    ? `${upcoming.institute} entra no agregador na próxima ingestão.`
                    : "Pesquisas nacionais pesam mais que estaduais."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="size-4 text-primary" />
                Linha do tempo
              </CardTitle>
              <CardDescription>
                O que saiu e o que ainda vem. Estadual separado do nacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {CALENDAR.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2/40 p-3"
                >
                  <div className="w-16 shrink-0 text-xs font-semibold tabular-nums text-primary">
                    {item.date.slice(8)}/{item.date.slice(5, 7)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <Badge
                        variant={
                          item.kind === "previsto"
                            ? "default"
                            : item.kind === "saiu"
                              ? "muted"
                              : "outline"
                        }
                      >
                        {item.kind === "previsto"
                          ? "previsto"
                          : item.kind === "saiu"
                            ? "saiu"
                            : item.kind === "campo"
                              ? "campo"
                              : "fato"}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-muted">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

  );
}
