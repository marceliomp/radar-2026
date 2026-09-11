import { useEffect, useRef, useState } from "react";
import { todayAsOf } from "@/lib/forecast/engine";
import {
  DEFAULT_HALF_LIFE,
  HL_MAX,
  HL_MIN,
  useHalfLife,
  yearToDateDays,
} from "@/lib/half-life";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function HalfLifeSlider({ id }: { id?: string }) {
  const [halfLife, setLive, commitUrl] = useHalfLife();
  const [preview, setPreview] = useState(halfLife);
  const { m } = useI18n();
  const pct = ((preview - HL_MIN) / (HL_MAX - HL_MIN)) * 100;
  const inputRef = useRef<HTMLInputElement>(null);
  const halfLifeRef = useRef(halfLife);
  const commitRef = useRef(commitUrl);
  const setLiveRef = useRef(setLive);
  const draggingRef = useRef(false);
  halfLifeRef.current = halfLife;
  commitRef.current = commitUrl;
  setLiveRef.current = setLive;
  const ytd = yearToDateDays(todayAsOf());
  const presets = [
    { days: HL_MIN, label: `${HL_MIN}d` },
    { days: DEFAULT_HALF_LIFE, label: `${DEFAULT_HALF_LIFE}d` },
    { days: 30, label: m.period.month },
    { days: ytd, label: m.period.year },
  ];

  useEffect(() => {
    setPreview(halfLife);
  }, [halfLife]);

  function liveValue(raw: string) {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    setPreview(next);
    setLiveRef.current(next);
  }

  function commitValue(raw: string) {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    setPreview(next);
    commitRef.current(next);
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const onNativeChange = () => commitValue(el.value);
    el.addEventListener("change", onNativeChange);

    const endDrag = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      commitValue(el.value);
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("touchend", endDrag, { passive: true });

    return () => {
      el.removeEventListener("change", onNativeChange);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("touchend", endDrag);
    };
  }, []);

  return (
    <div>
      <div className="hl-meta">
        <label htmlFor={id}>{m.period.label}</label>
        <span className="hl-val">{m.period.days(preview)}</span>
      </div>
      <p className="hl-copy">{m.period.copy}</p>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={HL_MIN}
        max={HL_MAX}
        value={preview}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          commitValue(e.currentTarget.value);
        }}
        onInput={(e) => liveValue(e.currentTarget.value)}
        onKeyUp={(e) => commitValue(e.currentTarget.value)}
        onBlur={(e) => commitValue(e.currentTarget.value)}
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
      <div className="hl-presets" role="group" aria-label={m.period.presetsAria}>
        {presets.map((preset) => (
          <button
            key={preset.days}
            type="button"
            className={cn("hl-preset", preview === preset.days && "hl-preset-on")}
            aria-pressed={preview === preset.days}
            onClick={() => commitValue(String(preset.days))}
          >
            {preset.label}
          </button>
        ))}
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
