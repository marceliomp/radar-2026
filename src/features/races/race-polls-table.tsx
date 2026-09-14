import { PublicPollSource } from "./public-poll-source";
import type { RaceForecastResult } from "@/lib/forecast/race-engine";
import { dateFull, fmtNum } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function RacePollsTable({ result }: { result: RaceForecastResult | null }) {
  const { locale, m } = useI18n();
  if (!result?.rows.length) return null;
  return (
    <section className="border-b border-border">
      <div className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-6">
        <h2 className="text-lg font-semibold">{locale === "en" ? "Polls behind the average" : "Pesquisas que compõem a média"}</h2>
        <p className="font-mono text-[11px] tabular-nums text-muted">{result.rows.length} {locale === "en" ? "polls" : "pesquisas"} · {result.evidence.houses} {locale === "en" ? "institutes" : "institutos"}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cream/80">
            <tr className="border-t border-border">
              <th className="px-4 py-2 font-semibold md:px-6">{m.race.institute}</th>
              <th className="px-3 py-2 font-semibold">{m.race.field}</th>
              <th className="px-3 py-2 font-semibold">{m.race.mode}</th>
              <th className="px-3 py-2 font-semibold tabular-nums">n</th>
              <th className="px-3 py-2 font-semibold tabular-nums">MOE</th>
              <th className="px-4 py-2 font-semibold tabular-nums md:px-6">{m.race.weight}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.poll.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-cream md:px-6">{row.poll.institute}<span className="mt-1 block text-xs text-muted">{locale === "en" ? "Published" : "Publicação"}: {dateFull(row.poll.date, locale)}</span><PublicPollSource poll={row.poll} locale={locale} /></td>
                <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">{row.poll.fieldStart ? `${dateFull(row.poll.fieldStart, locale)} a ` : ""}{dateFull(row.poll.fieldEnd, locale) || row.poll.fieldEnd}</td>
                <td className="px-3 py-2 font-mono text-xs uppercase tracking-[0.08em] text-muted">{row.poll.mode || "n/d"}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{row.poll.sample ? fmtNum(row.poll.sample, 0, locale) : "n/d"}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{row.poll.moe ? `±${fmtNum(row.poll.moe, 0, locale)}` : "n/d"}</td>
                <td className="px-4 py-2 font-mono font-medium tabular-nums text-cream md:px-6">{fmtNum(row.weightShare * 100, 1, locale)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
