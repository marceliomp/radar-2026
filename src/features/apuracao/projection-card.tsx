import { useMemo } from "react";
import firstRound2026 from "@/data/first-round-2026.json";
import { projectRunoff, type FirstRoundUf } from "@/lib/apuracao/projection";
import { runoffPrior } from "@/lib/apuracao/runoff-prior";
import type { CountResult } from "@/lib/apuracao/tse";
import { fmtPct, fmtProb } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const FIRST_ROUND = firstRound2026 as Record<string, FirstRoundUf>;

/** Ponteiro do 2º turno: projeta o final a partir das UFs já apuradas. */
export function ProjectionCard({ counts }: { counts: Record<string, CountResult> | null }) {
  const { locale, m } = useI18n();
  const prior = useMemo(() => runoffPrior(), []);
  const proj = counts ? projectRunoff(counts, FIRST_ROUND, prior) : null;
  const p = m.apuracao.projection;
  const flavioShare = proj?.flavioShare ?? prior.flavioShare;
  const chance = proj?.flavioChance ?? prior.flavioChance;
  const leader = chance >= 0.5 ? "Flávio" : "Lula";
  const leaderChance = chance >= 0.5 ? chance : 1 - chance;
  const decided = proj != null && leaderChance >= 0.995;
  const f = fmtPct(flavioShare * 100, 1, locale);
  const l = fmtPct((1 - flavioShare) * 100, 1, locale);

  return (
    <section className="apuracao-card apuracao-proj" aria-live="polite">
      <p className="kicker">{p.label}</p>
      <h2 className="apuracao-card-title">{p.title}</h2>
      <div className="apuracao-proj-score">
        <span className="apuracao-proj-flavio">Flávio {f}</span>
        <span className="apuracao-proj-lula">Lula {l}</span>
      </div>
      <div className="apuracao-proj-bar" role="img" aria-label={p.barAria(f, l)}>
        <span style={{ width: `${flavioShare * 100}%` }} />
      </div>
      {proj ? (
        <>
          <p className="apuracao-status">
            {decided ? p.decided(leader) : p.chance(leader, fmtProb(leaderChance, 0, locale))}
          </p>
          {proj.sd > 0 ? (
            <p className="apuracao-meta">
              {p.band(
                fmtPct((flavioShare - 1.28 * proj.sd) * 100, 1, locale),
                fmtPct((flavioShare + 1.28 * proj.sd) * 100, 1, locale),
              )}
            </p>
          ) : null}
          <p className="apuracao-meta">{p.counted(fmtProb(proj.counted, 0, locale))}</p>
        </>
      ) : (
        <p className="apuracao-status">{p.before(leader, fmtProb(leaderChance, 0, locale))}</p>
      )}
      <p className="apuracao-meta">{p.how}</p>
    </section>
  );
}
