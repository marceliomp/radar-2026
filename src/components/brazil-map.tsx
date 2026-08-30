import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BR_CENTROID, BR_PATHS, BR_VIEW } from "@/data/brazil-paths";
import { UF_META } from "@/data/calendar";
import {
  ELECTION_2022,
  ELECTION_2022_UF_LIST,
  gap1t,
  gap2t,
  leader1t,
  leader2t,
  type Election2022Uf,
} from "@/data/election-2022";
import {
  STATE_BY_UF,
  cardMarginPp,
  isCardTie,
  stateFillFromGap,
  type RoundKey,
} from "@/data/state-polls";
import { runAllStateForecasts } from "@/lib/forecast/states";
import { mapRoundView } from "@/lib/forecast/map-round";
import type { EngineConfig } from "@/lib/forecast/engine";
import { fmtNum, fmtPct, fmtProb } from "@/lib/format";

const UFS = Object.keys(BR_PATHS);
/** Hex no atributo SVG fill: CSS var vira preto (presentation attribute). */
const UF_MUTED = "#8fb0aa";
const STROKE_IDLE = "#1e3330";
const STROKE_ACTIVE = "#f7f4ef";

export type MapLayer = "agg2026" | "urna2022";

const LAYER_BTNS: { id: MapLayer; label: string; meta: string }[] = [
  { id: "agg2026", label: "2026", meta: "presidente" },
  { id: "urna2022", label: "2022", meta: "urna" },
];

function SegGroup({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function MapLayerToggle({
  layer,
  onChange,
}: {
  layer: MapLayer;
  onChange: (layer: MapLayer) => void;
}) {
  return (
    <SegGroup ariaLabel="Camada do mapa">
      {LAYER_BTNS.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-pressed={layer === b.id}
          onClick={() => onChange(b.id)}
          className="seg-btn"
          aria-label={`${b.label} ${b.meta}`}
        >
          <span className="seg-label">{b.label}</span>
          <span className="seg-meta">{b.meta}</span>
        </button>
      ))}
    </SegGroup>
  );
}

function leadLine(leader: "Lula" | "Bolsonaro", gap: number): string {
  const pp = fmtNum(Math.abs(gap), 2);
  return `${leader} a frente (${pp} pp)`;
}

function Urna2022Card({ uf, row }: { uf: string; row: Election2022Uf }) {
  const meta = UF_META[uf];
  const elec = UF_META[uf]?.electorateM;
  const won2 = leader2t(row);
  return (
    <div className="dossier">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="dossier-name">
          {uf} · {meta?.name ?? uf}
        </p>
        <p className="text-xs font-semibold uppercase tracking-wide text-cream/80">
          Presidente 2022 · {won2} no 2º
        </p>
      </div>
      <div className="space-y-3 text-sm">
        {elec != null && (
          <p className="text-xs font-medium text-gold">
            ~{fmtNum(elec, 1)} mi eleitores (TSE 2024/26)
          </p>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            1º turno 2022
          </p>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="num-lula font-semibold">Lula {fmtPct(row.lula1, 2)}</span>
            <span className="num-flavio font-semibold">
              Bolsonaro {fmtPct(row.bolsonaro1, 2)}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-gold">
            {leadLine(leader1t(row), gap1t(row))}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            2º turno 2022
          </p>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="num-lula font-semibold">Lula {fmtPct(row.lula2, 2)}</span>
            <span className="num-flavio font-semibold">
              Bolsonaro {fmtPct(row.bolsonaro2, 2)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden bg-bg">
            <div
              className="h-full"
              style={{
                width: `${(row.lula2 / Math.max(row.lula2 + row.bolsonaro2, 1)) * 100}%`,
                background: "var(--color-lula)",
                float: "left",
              }}
            />
            <div
              className="h-full"
              style={{
                width: `${(row.bolsonaro2 / Math.max(row.lula2 + row.bolsonaro2, 1)) * 100}%`,
                background: "var(--color-flavio)",
                float: "left",
              }}
            />
          </div>
          <p className="mt-1 text-xs font-medium text-gold">
            {leadLine(won2, gap2t(row))}
          </p>
        </div>
        <p className="text-xs font-medium leading-relaxed text-muted">
          TSE, votos validos. Urna, nao pesquisa.
        </p>
      </div>
    </div>
  );
}

function tipCopy2022(uf: string): string {
  const urn = ELECTION_2022[uf];
  if (!urn) return uf;
  return `${UF_META[uf]?.name ?? uf}: 1º Lula ${fmtPct(urn.lula1, 1)} × Bolsonaro ${fmtPct(urn.bolsonaro1, 1)}. 2º Lula ${fmtPct(urn.lula2, 1)} × Bolsonaro ${fmtPct(urn.bolsonaro2, 1)}. ${leadLine(leader2t(urn), gap2t(urn))}`;
}


function radarKeep(prev: Record<string, unknown>): { asOf?: string; hl?: number } {
  const out: { asOf?: string; hl?: number } = {};
  if (typeof prev.asOf === "string" && prev.asOf) out.asOf = prev.asOf;
  if (typeof prev.hl === "number" && Number.isFinite(prev.hl)) out.hl = prev.hl;
  else if (typeof prev.hl === "string" && prev.hl.trim()) {
    const n = Number(prev.hl);
    if (Number.isFinite(n)) out.hl = n;
  }
  return out;
}

export function BrazilMap({
  config,
  layer = "agg2026",
}: {
  config: EngineConfig;
  layer?: MapLayer;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [sel, setSel] = useState("SP");
  const [round, setRound] = useState<RoundKey>(1);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  const forecasts = useMemo(() => runAllStateForecasts(config), [config]);
  const is2022 = layer === "urna2022";
  const row2022 = ELECTION_2022[sel];
  const f = forecasts[sel];
  const meta = UF_META[sel];
  const m = f ? mapRoundView(f, round) : undefined;

  const ufsWith = Object.keys(forecasts);
  const scored = ufsWith
    .map((uf) => mapRoundView(forecasts[uf]!, round))
    .filter((x) => x.polled);
  const flavioLead = scored.filter(
    (x) => !isCardTie(x.flavio - x.lula, x.se) && x.flavio > x.lula,
  ).length;
  const lulaLead = scored.filter(
    (x) => !isCardTie(x.flavio - x.lula, x.se) && x.lula > x.flavio,
  ).length;
  const ties = scored.filter((x) => isCardTie(x.flavio - x.lula, x.se)).length;

  const urnaBolso = ELECTION_2022_UF_LIST.filter(
    (uf) => ELECTION_2022[uf]!.bolsonaro2 > ELECTION_2022[uf]!.lula2,
  ).length;
  const urnaLula = ELECTION_2022_UF_LIST.length - urnaBolso;

  function openGovernors(uf: string) {
    setSel(uf);
    try {
      sessionStorage.setItem("radar2026:uf", uf);
    } catch {
      /* ignore */
    }
    void navigate({
      to: "/candidatos",
      search: (prev) => ({
        uf,
        cargo: "governador" as const,
        ...radarKeep(prev as Record<string, unknown>),
      }),
    });
  }

  function placeTip(uf: string, e: MouseEvent<SVGPathElement>) {
    setSel(uf);
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const sc = forecasts[uf] ? mapRoundView(forecasts[uf]!, round) : undefined;
    const text = is2022
      ? tipCopy2022(uf)
      : sc && sc.polled
        ? `${UF_META[uf]?.name ?? uf}: Lula ${fmtPct(sc.lula)} × Flávio ${fmtPct(sc.flavio)}`
        : `${UF_META[uf]?.name ?? uf}: sem pesquisa`;
    const x = Math.min(Math.max(8, e.clientX - box.left + 12), box.width - 180);
    const y = Math.min(Math.max(8, e.clientY - box.top + 12), box.height - 48);
    setTip({ text, x, y });
  }

  const statusLabel = m?.polled
    ? isCardTie(m.flavio - m.lula, m.se)
      ? "empate"
      : m.flavio > m.lula
        ? "Flávio"
        : "Lula"
    : round === 2
      ? "sem 2º"
      : "sem dado";

  return (
    <div className="space-y-3">
      {!is2022 && (
        <div className="flex flex-wrap items-center gap-3">
          <SegGroup ariaLabel="Turno no mapa">
            <button
              type="button"
              aria-pressed={round === 1}
              aria-label="1º turno presidente"
              onClick={() => setRound(1)}
              className="seg-btn"
            >
              <span className="seg-label">1º turno</span>
            </button>
            <button
              type="button"
              aria-pressed={round === 2}
              aria-label="2º turno presidente"
              onClick={() => setRound(2)}
              className="seg-btn"
            >
              <span className="seg-label">2º turno</span>
            </button>
          </SegGroup>
          <span className="self-center text-[11px] font-medium text-gold">
            clique no estado · abre governadores
          </span>
        </div>
      )}
      {is2022 && (
        <p className="text-xs font-medium leading-relaxed text-muted">
          2022 urna: cor pela margem do 2º (Lula × Bolsonaro). Passe o mouse ou
          clique na UF.
        </p>
      )}
      {round === 2 && !is2022 && (
        <p className="text-xs font-medium leading-relaxed text-muted">
          2º turno: cor cheia = o instituto perguntou. Tom claro = two-way do 1º,
          nao e 2º medido. Nao use o print cinza como se fosse 2º turno.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_17.5rem]">
        <div
          ref={wrapRef}
          className="relative order-2 min-w-0 overflow-x-auto border border-border bg-surface/60 p-2 sm:p-3 lg:order-1"
        >
          <svg
            viewBox={`0 0 ${BR_VIEW.w} ${BR_VIEW.h}`}
            className="h-auto w-full"
            role="img"
            aria-label={
              is2022
                ? "Mapa urna 2022 por unidade da federacao"
                : "Mapa agregador por estado"
            }
            onMouseLeave={() => setTip(null)}
          >
            {UFS.map((uf) => {
              const fc = forecasts[uf];
              const c = BR_CENTROID[uf];
              const active = uf === sel;
              const sc = fc ? mapRoundView(fc, round) : undefined;
              const urn = ELECTION_2022[uf];
              const fill = is2022
                ? urn
                  ? stateFillFromGap(urn.bolsonaro2 - urn.lula2, 0)
                  : UF_MUTED
                : sc && sc.polled
                  ? stateFillFromGap(
                      sc.flavio - sc.lula,
                      cardMarginPp(sc.se),
                    )
                  : UF_MUTED;
              return (
                <g key={uf}>
                  <path
                    d={BR_PATHS[uf]}
                    fill={fill}
                    fillOpacity={!is2022 && sc?.implied ? 0.72 : 1}
                    stroke={active ? STROKE_ACTIVE : STROKE_IDLE}
                    strokeWidth={active ? 2.4 : 1.2}
                    className="cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                    onClick={() => openGovernors(uf)}
                    onMouseEnter={(e) => placeTip(uf, e)}
                    onMouseMove={(e) => placeTip(uf, e)}
                  />
                  {c && (
                    <text
                      x={c.x}
                      y={c.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none hidden select-none sm:inline"
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
          {tip && (
            <div
              className="map-tooltip"
              role="tooltip"
              style={{ left: tip.x, top: tip.y }}
            >
              {tip.text}
            </div>
          )}
          <div className="map-legend mt-2">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5" style={{ background: "#256fa3" }} />
              {is2022 ? "Bolsonaro" : "Flávio"}
            </span>
            {!is2022 && (
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block size-2.5" style={{ background: "#5f7358" }} />
                Empate técnico
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5" style={{ background: "#c62828" }} />
              Lula
            </span>
            {round === 2 && !is2022 && (
              <span>Tom claro = 2º nao perguntado (two-way do 1º)</span>
            )}
          </div>
        </div>

        <div className="order-1 space-y-3 lg:order-2">
          {is2022 ? (
            <>
              <p className="map-tally">
                <span className="num-flavio">{urnaBolso} Bolsonaro</span>
                <span className="num-lula">{urnaLula} Lula</span>
                <span className="text-muted">no 2º turno</span>
              </p>
              {row2022 ? (
                <Urna2022Card uf={sel} row={row2022} />
              ) : (
                <p className="text-sm font-medium text-muted">Sem urna 2022 nesta UF.</p>
              )}
              <Link
                to="/candidatos"
                search={(prev) => ({
                  uf: sel,
                  cargo: "governador" as const,
                  ...radarKeep(prev as Record<string, unknown>),
                })}
                className="hook-link mt-3 inline-block"
              >
                Ver governadores de {sel}
              </Link>
            </>
          ) : (
            <>
              <p className="map-tally">
                <span className="num-flavio">{flavioLead} Flávio</span>
                <span className="text-gold">{ties} empate</span>
                <span className="num-lula">{lulaLead} Lula</span>
              </p>

              <div className="dossier">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="dossier-name">
                    {sel} · {meta?.name ?? sel}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cream/80">
                    Presidente · {statusLabel}
                    {m?.implied ? " · 1º" : ""}
                  </p>
                </div>
                {f && m ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-medium text-gold">
                      {f.n === 1 ? "1 pesquisa no 1º" : `${f.n} pesquisas no 1º`}
                      {f.n2 ? ` · ${f.n2} com 2º perguntado` : " · 2º nao perguntado"}
                      {meta ? ` · ~${fmtNum(meta.electorateM, 1)} mi eleitores` : ""}
                    </p>
                    {round === 2 && m.implied && (
                      <p className="text-xs font-medium text-muted">
                        2º nao perguntado · two-way do 1º
                      </p>
                    )}
                    {m.polled && (
                      <>
                        <div className="flex justify-between tabular-nums">
                          <span className="num-lula font-semibold">
                            Lula {fmtPct(m.lula)}
                          </span>
                          <span className="num-flavio font-semibold">
                            Flávio {fmtPct(m.flavio)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden bg-bg">
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
                              float: "left",
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-gold">
                          Margem ~ ±{fmtNum(cardMarginPp(m.se), 1)} pp · {m.implied
                            ? "chance de Flávio no two-way do 1º"
                            : "chance de Flávio neste turno"}{" "}
                          <span className="num-flavio">
                            {fmtProb(m.pFlavio ?? 0)}
                          </span>
                        </p>
                      </>
                    )}
                    {STATE_BY_UF[sel]?.note && (
                      <p className="text-xs font-medium leading-relaxed text-muted">
                        {STATE_BY_UF[sel]!.note}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted">Sem pesquisa neste estado.</p>
                )}
                <Link
                  to="/candidatos"
                  search={(prev) => ({
                    uf: sel,
                    cargo: "governador" as const,
                    ...radarKeep(prev as Record<string, unknown>),
                  })}
                  className="hook-link mt-3 inline-block"
                >
                  Ver governadores de {sel}
                </Link>
              </div>

              {f && (
                <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                  {f.snapshot.rows
                    .filter((r) =>
                      round === 1 || m?.implied
                        ? true
                        : Boolean(r.poll.secondRound && r.adjFlavio2 != null && r.adjLula2 != null),
                    )
                    .map((r) => (
                    <li
                      key={r.poll.id}
                      className="flex items-center justify-between px-0 py-1.5 text-muted"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {r.poll.institute.split("/")[0]} {r.poll.date.slice(8)}/
                        {r.poll.date.slice(5, 7)}
                        {r.poll.secondRound ? "" : " · 1º"}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="num-flavio">
                          {fmtNum(
                            round === 2 && !m?.implied ? r.adjFlavio2! : r.adjFlavio1,
                          )}
                        </span>
                        <span className="mx-1 opacity-40">×</span>
                        <span className="num-lula">
                          {fmtNum(
                            round === 2 && !m?.implied ? r.adjLula2! : r.adjLula1,
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
