import { useMemo, useRef, useState, type MouseEvent } from "react";
import { UF_META } from "@/data/calendar";
import { ELECTION_2022, ELECTION_2022_UF_LIST } from "@/data/election-2022";
import { isCardTie, type RoundKey } from "@/data/state-polls";
import { runAllStateForecasts } from "@/lib/forecast/states";
import { mapRoundView } from "@/lib/forecast/map-round";
import type { EngineConfig } from "@/lib/forecast/engine";
import { fmtPct } from "@/lib/format";
import { tipCopy2022 } from "./map-helpers";
import { MapLayerToggle, SegGroup, type MapLayer } from "./map-layer-toggle";
import { BrazilMapSvg } from "./brazil-map-svg";
import { SelectedStatePanel } from "./selected-state-card";

export type { MapLayer };
export { MapLayerToggle };

export function BrazilMap({
  config,
  layer = "agg2026",
}: {
  config: EngineConfig;
  layer?: MapLayer;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState("SP");
  const [round, setRound] = useState<RoundKey>(1);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const forecasts = useMemo(() => runAllStateForecasts(config), [config]);
  const is2022 = layer === "urna2022";
  const row2022 = ELECTION_2022[sel];
  const f = forecasts[sel];
  const meta = UF_META[sel];
  const m = f ? mapRoundView(f, round) : undefined;
  const ufsWith = Object.keys(forecasts);
  const scored = ufsWith.map((uf) => mapRoundView(forecasts[uf]!, round)).filter((x) => x.polled);
  const flavioLead = scored.filter((x) => !isCardTie(x.flavio - x.lula, x.se) && x.flavio > x.lula).length;
  const lulaLead = scored.filter((x) => !isCardTie(x.flavio - x.lula, x.se) && x.lula > x.flavio).length;
  const ties = scored.filter((x) => isCardTie(x.flavio - x.lula, x.se)).length;
  const urnaBolso = ELECTION_2022_UF_LIST.filter((uf) => ELECTION_2022[uf]!.bolsonaro2 > ELECTION_2022[uf]!.lula2).length;
  const urnaLula = ELECTION_2022_UF_LIST.length - urnaBolso;

  function selectUf(uf: string) {
    setSel(uf);
    try {
      sessionStorage.setItem("radar2026:uf", uf);
    } catch {
      /* ignore */
    }
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
            estado · presidente
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
        <BrazilMapSvg
          wrapRef={wrapRef}
          is2022={is2022}
          forecasts={forecasts}
          round={round}
          sel={sel}
          tip={tip}
          onSelectUf={selectUf}
          placeTip={placeTip}
          setTip={setTip}
        />
        <SelectedStatePanel
          is2022={is2022}
          sel={sel}
          row2022={row2022}
          urnaBolso={urnaBolso}
          urnaLula={urnaLula}
          flavioLead={flavioLead}
          ties={ties}
          lulaLead={lulaLead}
          f={f}
          m={m}
          meta={meta}
          statusLabel={statusLabel}
          round={round}
        />
      </div>
    </div>
  );
}
