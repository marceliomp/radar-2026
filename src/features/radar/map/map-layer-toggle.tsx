import { type ReactNode } from "react";

export type MapLayer = "agg2026" | "urna2022";

const LAYER_BTNS: { id: MapLayer; label: string; meta: string }[] = [
  { id: "agg2026", label: "2026", meta: "presidente" },
  { id: "urna2022", label: "2022", meta: "urna" },
];

export function SegGroup({
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
