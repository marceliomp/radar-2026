import { HL_MAX, HL_MIN, useHalfLife } from "@/lib/half-life";

export function HalfLifeSlider({ id }: { id?: string }) {
  const [halfLife, setHalfLife] = useHalfLife();
  const pct = ((halfLife - HL_MIN) / (HL_MAX - HL_MIN)) * 100;

  return (
    <div>
      <div className="hl-meta">
        <label htmlFor={id}>Half-life</label>
        <span className="hl-val">{halfLife} dias</span>
      </div>
      <p className="hl-copy">Mais recente vs memória longa</p>
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
        aria-valuetext={`${halfLife} dias`}
      />
      <div className="hl-ends">
        <span>{HL_MIN}d recente</span>
        <span>{HL_MAX}d longa</span>
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
