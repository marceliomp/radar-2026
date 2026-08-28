import { useMemo, useState } from "react";
import { BR_CENTROID, BR_PATHS, BR_VIEW } from "@/data/brazil-paths";
import { UF_META } from "@/data/calendar";
import { STATE_BY_UF, stateFillFromGap, type RoundKey } from "@/data/state-polls";
import { runAllStateForecasts, type StateForecast } from "@/lib/forecast/states";
import type { EngineConfig } from "@/lib/forecast/engine";
import { fmtNum, fmtPct, fmtProb } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const UFS = Object.keys(BR_PATHS);

function means(f: StateForecast, round: RoundKey) {
  if (round === 2 && f.second) {
    return {
      lula: f.second.lula,
      flavio: f.second.flavio,
      se: f.second.se,
      tie: f.second.tie,
      n: f.n2 || f.n,
      polled: f.n2 > 0,
    };
  }
  return {
    lula: f.first.lula,
    flavio: f.first.flavio,
    se: f.first.se,
    tie: f.first.tie,
    n: f.n,
    polled: true,
  };
}

export function BrazilMap({ config }: { config: EngineConfig }) {
  const [sel, setSel] = useState("SP");
  const [round, setRound] = useState<RoundKey>(2);
  const forecasts = useMemo(() => runAllStateForecasts(config), [config]);
  const f = forecasts[sel];
  const meta = UF_META[sel];
  const m = f ? means(f, round) : undefined;

  const ufsWith = Object.keys(forecasts);
  const flavioLead = ufsWith.filter((uf) => {
    const x = means(forecasts[uf]!, round);
    return !x.tie && x.flavio > x.lula;
  }).length;
  const lulaLead = ufsWith.filter((uf) => {
    const x = means(forecasts[uf]!, round);
    return !x.tie && x.lula > x.flavio;
  }).length;
  const ties = ufsWith.filter((uf) => means(forecasts[uf]!, round).tie).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRound(1)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            round === 1 ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-fg",
          )}
        >
          1º turno
        </button>
        <button
          type="button"
          onClick={() => setRound(2)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            round === 2 ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-fg",
          )}
        >
          2º turno
        </button>
        <span className="self-center text-[11px] font-medium text-muted">
          agregador por UF · recência · √n · house · MC
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface/60 p-2 sm:p-3">
          <svg
            viewBox={`0 0 ${BR_VIEW.w} ${BR_VIEW.h}`}
            className="h-auto w-full"
            role="img"
            aria-label="Mapa agregador por estado"
          >
            {UFS.map((uf) => {
              const fc = forecasts[uf];
              const c = BR_CENTROID[uf];
              const active = uf === sel;
              const sc = fc ? means(fc, round) : undefined;
              const fill = sc
                ? stateFillFromGap(sc.flavio - sc.lula, sc.tie ? 99 : 0.4)
                : "var(--color-surface-2)";
              const faded = !fc || (round === 2 && sc && !sc.polled);
              return (
                <g key={uf}>
                  <path
                    d={BR_PATHS[uf]}
                    fill={fill}
                    fillOpacity={faded ? 0.55 : 1}
                    stroke={active ? "var(--color-cream)" : "var(--color-bg)"}
                    strokeWidth={active ? 2.4 : 1.1}
                    className="cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                    onClick={() => setSel(uf)}
                  />
                  {c && (
                    <text
                      x={c.x}
                      y={c.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none select-none"
                      fill="#faf6ef"
                      fontSize={uf === "DF" ? 8 : 11}
                      fontWeight={700}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {uf}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap items-center gap-3 px-1 text-[11px] font-medium text-muted">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-sm" style={{ background: "#1d6ea3" }} />
              Flávio
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-sm" style={{ background: "#6b7c5e" }} />
              Empate técnico
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-sm" style={{ background: "#b51c1c" }} />
              Lula
            </span>
            {round === 2 && (
              <span>Tom claro = 2º só projetado do 1º</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[var(--radius-md)] border border-flavio/30 bg-flavio/10 p-2">
              <p className="num-flavio font-display text-xl font-semibold">{flavioLead}</p>
              <p className="text-[10px] font-medium text-muted">Flávio</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-2/50 p-2">
              <p className="font-display text-xl font-semibold text-gold">{ties}</p>
              <p className="text-[10px] font-medium text-muted">empate</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-lula/30 bg-lula/10 p-2">
              <p className="num-lula font-display text-xl font-semibold">{lulaLead}</p>
              <p className="text-[10px] font-medium text-muted">Lula</p>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border bg-surface-2/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-display text-lg font-semibold">
                {sel} · {meta?.name ?? sel}
              </p>
              {m ? (
                <Badge variant={m.tie ? "outline" : "default"}>
                  {m.tie ? "empate" : m.flavio > m.lula ? "Flávio" : "Lula"}
                </Badge>
              ) : (
                <Badge variant="outline">sem dado</Badge>
              )}
            </div>
            {f && m ? (
              <div className="space-y-2 text-sm">
                <p className="text-xs font-medium text-muted">
                  {f.n} pesquisa{f.n === 1 ? "" : "s"} no 1º
                  {f.n2 ? ` · ${f.n2} com 2º perguntado` : " · 2º não perguntado"}
                  {meta ? ` · ~${fmtNum(meta.electorateM, 1)} mi` : ""}
                </p>
                {round === 2 && !m.polled && (
                  <Badge variant="outline">2º projetado (válidos do 1º)</Badge>
                )}
                <div className="flex justify-between tabular-nums">
                  <span className="num-lula font-semibold">Lula {fmtPct(m.lula)}</span>
                  <span className="num-flavio font-semibold">Flávio {fmtPct(m.flavio)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full"
                    style={{
                      width: `${(m.lula / Math.max(m.lula + m.flavio, 1)) * 100}%`,
                      background: "var(--color-lula)",
                      float: "left",
                    }}
                  />
                  <div
                    className="h-full"
                    style={{
                      width: `${(m.flavio / Math.max(m.lula + m.flavio, 1)) * 100}%`,
                      background: "var(--color-flavio)",
                    }}
                  />
                </div>
                <p className="text-xs font-medium text-muted">
                  IC ~ ±{fmtNum(1.96 * m.se, 1)} pp · P(Flávio 2º){" "}
                  <span className="num-flavio">{fmtProb(f.pFlavio2)}</span>
                </p>
                {STATE_BY_UF[sel]?.note && (
                  <p className="text-xs font-medium leading-relaxed text-muted">
                    {STATE_BY_UF[sel]!.note}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium text-muted">Sem pesquisa neste estado.</p>
            )}
          </div>

          {f && (
            <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
              {f.snapshot.rows
                .filter((r) => round === 1 || f.n2 === 0 || r.poll.secondRound)
                .map((r) => (
                <li
                  key={r.poll.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-muted"
                >
                  <span className="min-w-0 truncate font-medium">
                    {r.poll.institute.split("/")[0]} {r.poll.date.slice(8)}/
                    {r.poll.date.slice(5, 7)}
                    {r.poll.secondRound ? "" : " · proj."}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="num-flavio">
                      {fmtNum(round === 2 && r.adjFlavio2 != null ? r.adjFlavio2 : r.adjFlavio1)}
                    </span>
                    <span className="mx-1 opacity-40">×</span>
                    <span className="num-lula">
                      {fmtNum(round === 2 && r.adjLula2 != null ? r.adjLula2 : r.adjLula1)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
