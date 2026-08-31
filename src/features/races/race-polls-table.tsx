import type { RaceForecastResult } from "@/lib/forecast/race-engine";
import { fmtNum } from "@/lib/format";
import { fmtDateBr } from "./race-types";

export function RacePollsTable({ result }: { result: RaceForecastResult | null }) {
  if (!result?.rows.length) return null;
  return (
    <section className="border-b border-border">
      <div className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-6">
        <p className="kicker">Casas</p>
        <p className="font-mono text-[11px] tabular-nums text-muted">{result.rows.length}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cream/80">
            <tr className="border-t border-border">
              <th className="px-4 py-2 font-semibold md:px-6">Instituto</th><th className="px-3 py-2 font-semibold">Campo</th><th className="px-3 py-2 font-semibold">Modo</th><th className="px-3 py-2 font-semibold tabular-nums">n</th><th className="px-3 py-2 font-semibold tabular-nums">MOE</th><th className="px-4 py-2 font-semibold tabular-nums md:px-6">Peso</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.poll.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-cream md:px-6">{row.poll.institute}{row.poll.notes ? <span className="mt-0.5 block text-xs font-medium text-muted">{row.poll.notes}</span> : null}</td>
                <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">{fmtDateBr(row.poll.fieldEnd) || row.poll.fieldEnd}</td>
                <td className="px-3 py-2 font-mono text-xs uppercase tracking-[0.08em] text-muted">{row.poll.mode || "n/d"}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{row.poll.sample ? fmtNum(row.poll.sample, 0) : "n/d"}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{row.poll.moe ? `±${fmtNum(row.poll.moe, 0)}` : "n/d"}</td>
                <td className="px-4 py-2 font-mono font-medium tabular-nums text-cream md:px-6">{fmtNum(row.weightShare * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
