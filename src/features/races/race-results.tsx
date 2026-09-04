import type { RaceForecastResult } from "@/lib/forecast/race-engine";
import { fmtPct, fmtProb } from "@/lib/format";
import { partyColor } from "@/lib/chart-theme";
import type { FirstBar } from "./race-types";

export function RaceResults({ bars, result }: { bars: FirstBar[]; result: RaceForecastResult | null }) {
  if (!result || bars.length === 0) return null;
  const publishRunoff =
    result.evidence.canPublishProbability && result.goesToSecond != null;
  return (
    <section className="border-b border-border">
      <div className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-6">
        <p className="kicker">1º turno</p>
        {publishRunoff ? (
          <p className="max-w-[16rem] text-right font-mono text-[11px] font-medium leading-snug text-cream/85">
            Vai a 2º turno em {fmtProb(result.goesToSecond!)} das simulações
          </p>
        ) : null}
      </div>
      <ul>
        {bars.map((bar) => {
          const width = Math.max(0, Math.min(100, bar.mean));
          const color = partyColor(bar.party);
          return (
            <li key={bar.key} className="border-t border-border px-4 py-2.5 md:px-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-cream">
                  {bar.name}{bar.party ? <span className="ml-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-cream">{bar.party}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums" style={{ color }}>{fmtPct(bar.mean)}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-surface-2"><div className="h-full" style={{ width: `${width}%`, background: color }} /></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
