import { type MouseEvent, type RefObject } from "react";
import { BR_CENTROID, BR_PATHS, BR_VIEW } from "@/data/brazil-paths";
import { ELECTION_2022 } from "@/data/election-2022";
import { cardMarginPp, stateFillFromGap, type RoundKey } from "@/data/state-polls";
import { mapRoundView } from "@/lib/forecast/map-round";
import { runAllStateForecasts } from "@/lib/forecast/states";

const UFS = Object.keys(BR_PATHS);
const UF_MUTED = "#8fb0aa";
const STROKE_IDLE = "#1e3330";
const STROKE_ACTIVE = "#f7f4ef";

type Forecasts = ReturnType<typeof runAllStateForecasts>;

export function BrazilMapSvg({
  wrapRef,
  is2022,
  forecasts,
  round,
  sel,
  tip,
  onSelectUf,
  placeTip,
  setTip,
}: {
  wrapRef: RefObject<HTMLDivElement | null>;
  is2022: boolean;
  forecasts: Forecasts;
  round: RoundKey;
  sel: string;
  tip: { text: string; x: number; y: number } | null;
  onSelectUf: (uf: string) => void;
  placeTip: (uf: string, e: MouseEvent<SVGPathElement>) => void;
  setTip: (tip: { text: string; x: number; y: number } | null) => void;
}) {
  return (
        <div
          ref={wrapRef}
          className="map-phone relative min-w-0 overflow-x-auto border border-border bg-surface/60 p-2 sm:p-3"
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
                    onClick={() => onSelectUf(uf)}
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
  );
}
