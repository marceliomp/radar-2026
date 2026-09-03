import { electionBarView } from "@/lib/election-calendar";
import { dateBr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ElectionBase({
  asOf,
  variant = "block",
}: {
  asOf: string;
  variant?: "hero" | "block";
}) {
  const bar = electionBarView(asOf);
  return (
    <div className={cn("elec-strip", variant === "block" && "elec-strip-block")}>
      <p className="elec-bar-copy">
        Base {dateBr(asOf)} · {bar.label}
      </p>
      <div
        className="elec-bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bar.pct}
        aria-label={`Base ${dateBr(asOf)}. ${bar.label}`}
      >
        <div className="elec-bar-fill" style={{ width: `${bar.pct}%` }} />
        {bar.marks.map((mark) => (
          <span key={mark.iso} className="elec-bar-mark" style={{ left: `${mark.left}%` }}>
            {mark.text}
          </span>
        ))}
      </div>
    </div>
  );
}
