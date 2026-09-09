import { useEffect, useState } from "react";
import { HL_MAX, HL_MIN, useHalfLife } from "@/lib/half-life";
import { useI18n } from "@/lib/i18n";

export function HalfLifeSlider({ id }: { id?: string }) {
  const [halfLife, setHalfLife] = useHalfLife();
  const [preview, setPreview] = useState(halfLife);
  const { m } = useI18n();
  const pct = ((preview - HL_MIN) / (HL_MAX - HL_MIN)) * 100;

  useEffect(() => {
    setPreview(halfLife);
  }, [halfLife]);

  function commit(raw: string) {
    const next = Number(raw);
    setPreview(next);
    if (next !== halfLife) setHalfLife(next);
  }

  return (
    <div>
      <div className="hl-meta">
        <label htmlFor={id}>{m.period.label}</label>
        <span className="hl-val">{m.period.days(preview)}</span>
      </div>
      <p className="hl-copy">{m.period.copy}</p>
      <input
        id={id}
        type="range"
        min={HL_MIN}
        max={HL_MAX}
        value={preview}
        onInput={(e) => setPreview(Number(e.currentTarget.value))}
        onPointerUp={(e) => commit(e.currentTarget.value)}
        onKeyUp={(e) => commit(e.currentTarget.value)}
        onBlur={(e) => commit(e.currentTarget.value)}
        className="hl-range"
        style={{ ["--hl-pct" as string]: `${pct}%` }}
        aria-valuemin={HL_MIN}
        aria-valuemax={HL_MAX}
        aria-valuenow={preview}
        aria-valuetext={m.period.valuetext(preview)}
      />
      <div className="hl-ends">
        <span>{m.period.recent(HL_MIN)}</span>
        <span>{m.period.long(HL_MAX)}</span>
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
