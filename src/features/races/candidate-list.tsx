import type { Candidate } from "@/data/candidates";
import { partyColor } from "@/lib/chart-theme";
import { useI18n } from "@/lib/i18n";
import { fold, type RaceOffice } from "./race-types";

export function CandidateList({
  rows,
  marked,
  onPick,
  activeSlug,
}: {
  rows: Candidate[];
  marked: Set<string>;
  onPick?: (candidate: Candidate) => void;
  activeSlug?: string;
}) {
  const { m } = useI18n();
  if (rows.length === 0) return <p className="py-8 font-mono text-sm text-muted">{m.race.empty}</p>;
  const sorted = [...rows].sort((a, b) => {
    const aHit = marked.has(fold(a.slug)) || marked.has(fold(a.name));
    const bHit = marked.has(fold(b.slug)) || marked.has(fold(b.name));
    if (aHit !== bHit) return aHit ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  const officeLabel = (office: string) =>
    office === "senator" ? m.race.senator : m.race.governor;
  return (
    <div>
      <div className="cand-head"><span>{m.race.colUf}</span><span>{m.race.colOffice}</span><span>{m.race.colName}</span><span>{m.race.colParty}</span><span>{m.race.colNum}</span></div>
      <ul className="divide-y divide-border border-t border-border">
        {sorted.map((candidate) => {
          const inPoll = marked.has(fold(candidate.slug)) || marked.has(fold(candidate.name));
          const active = activeSlug === candidate.slug;
          const body = (
            <>
              <span className="font-mono text-xs font-semibold tracking-[0.12em] text-muted">{candidate.uf}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{officeLabel(candidate.office as RaceOffice)}</span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug text-cream">{candidate.name}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/80">
                  {candidate.currentOffice || (inPoll ? m.race.inPoll : m.race.onlyBallot)}
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{candidate.party}</span>
              <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: partyColor(candidate.party) }}>{candidate.number || "—"}</span>
            </>
          );
          return (
            <li key={`${candidate.office}-${candidate.uf}-${candidate.number}-${candidate.slug ?? candidate.name}`}>
              {onPick ? (
                <button
                  type="button"
                  className={`cand-row cand-row-btn w-full text-left${active ? " cand-row-active" : ""}`}
                  onClick={() => onPick(candidate)}
                >
                  {body}
                </button>
              ) : (
                <article className="cand-row">{body}</article>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
