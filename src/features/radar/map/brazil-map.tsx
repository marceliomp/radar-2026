import { useMemo, useRef, useState, type MouseEvent } from "react";
import { UF_META } from "@/data/calendar";
import { ELECTION_2022, ELECTION_2022_UF_LIST } from "@/data/election-2022";
import { isCardTie, type RoundKey } from "@/data/state-polls";
import { runAllStateForecasts } from "@/lib/forecast/states";
import { mapRoundView } from "@/lib/forecast/map-round";
import type { EngineConfig } from "@/lib/forecast/engine";
import { fmtPct } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
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
  const { locale, m } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState("SP");
  const [round, setRound] = useState<RoundKey>(1);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const forecasts = useMemo(() => runAllStateForecasts(config), [config]);
  const is2022 = layer === "urna2022";
  const row2022 = ELECTION_2022[sel];
  const f = forecasts[sel];
  const meta = UF_META[sel];
  const mv = f ? mapRoundView(f, round) : undefined;
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
      ? tipCopy2022(uf, locale)
      : sc && sc.polled
        ? m.map.tip2026(UF_META[uf]?.name ?? uf, fmtPct(sc.lula, 1, locale), fmtPct(sc.flavio, 1, locale))
        : m.map.noPollTip(UF_META[uf]?.name ?? uf);
    const x = Math.min(Math.max(8, e.clientX - box.left + 12), box.width - 180);
    const y = Math.min(Math.max(8, e.clientY - box.top + 12), box.height - 48);
    setTip({ text, x, y });
  }

  const statusLabel = mv?.polled
    ? isCardTie(mv.flavio - mv.lula, mv.se)
      ? m.map.tie
      : mv.flavio > mv.lula
        ? "Flávio"
        : "Lula"
    : round === 2
      ? m.map.noSecond
      : m.map.noData;

  return (
    <div className="space-y-3">
      {!is2022 && (
        <div className="flex flex-wrap items-center gap-3">
          <SegGroup ariaLabel={m.map.roundAria}>
            <button
              type="button"
              aria-pressed={round === 1}
              aria-label={m.map.firstAria}
              onClick={() => setRound(1)}
              className="seg-btn"
            >
              <span className="seg-label">{m.map.first}</span>
            </button>
            <button
              type="button"
              aria-pressed={round === 2}
              aria-label={m.map.secondAria}
              onClick={() => setRound(2)}
              className="seg-btn"
            >
              <span className="seg-label">{m.map.second}</span>
            </button>
          </SegGroup>
          <span className="self-center text-[11px] font-medium text-gold">
            {m.map.statePres}
          </span>
        </div>
      )}
      {is2022 && (
        <p className="text-xs font-medium leading-relaxed text-muted">
          {m.map.urnaHint}
        </p>
      )}
      {round === 2 && !is2022 && (
        <p className="text-xs font-medium leading-relaxed text-muted">
          {m.map.impliedHint}
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
          view={mv}
          meta={meta}
          statusLabel={statusLabel}
          round={round}
        />
      </div>
    </div>
  );
}
