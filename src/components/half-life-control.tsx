import { HL_MAX, HL_MIN, useHalfLife } from "@/lib/half-life";

export function HalfLifeSlider({ id }: { id?: string }) {
  const [halfLife, setHalfLife] = useHalfLife();
  const pct = ((halfLife - HL_MIN) / (HL_MAX - HL_MIN)) * 100;

  return (
    <div>
      <div className="hl-meta">
        <label htmlFor={id}>Período</label>
        <span className="hl-val">{halfLife} dias</span>
      </div>
      <p className="hl-copy">Pesquisas novas pesam mais na média</p>
      <input
        id={id}
        type="range"
        min={HL_MIN}
        max={HL_MAX}
        value={halfLife}
        onChange={(e) => setHalfLife(Number(e.target.value))}
        className="hl-range"
        style={{ ["--hl-pct" as string]: `${pct}%` }}
        aria-valuemin={HL_MIN}
        aria-valuemax={HL_MAX}
        aria-valuenow={halfLife}
        aria-valuetext={`período de ${halfLife} dias`}
      />
      <div className="hl-ends">
        <span>{HL_MIN}d só o novo</span>
        <span>{HL_MAX}d tudo entra</span>
      </div>
    </div>
  );
}

export function HalfLifeControl() {
  return (
    <div className="mast-hl">
      <div className="hl-card">
        <HalfLifeSlider id="mast-half-life" />
      </div>
    </div>
  );
}
