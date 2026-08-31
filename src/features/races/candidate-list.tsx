import type { Candidate } from "@/data/candidates";
import { partyColor } from "@/lib/chart-theme";
import { fold, OFFICE_LABEL, type RaceOffice } from "./race-types";

export function CandidateList({ rows, marked }: { rows: Candidate[]; marked: Set<string> }) {
  if (rows.length === 0) return <p className="py-8 font-mono text-sm text-muted">Nenhum nome neste filtro.</p>;
  const sorted = [...rows].sort((a, b) => {
    const aHit = marked.has(fold(a.slug)) || marked.has(fold(a.name));
    const bHit = marked.has(fold(b.slug)) || marked.has(fold(b.name));
    if (aHit !== bHit) return aHit ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  return (
    <div>
      <div className="cand-head"><span>UF</span><span>Cargo</span><span>Nome de urna</span><span>Partido</span><span>Nº</span></div>
      <ul className="divide-y divide-border border-t border-border">
        {sorted.map((candidate) => {
          const inPoll = marked.has(fold(candidate.slug)) || marked.has(fold(candidate.name));
          return (
            <li key={`${candidate.office}-${candidate.uf}-${candidate.number}-${candidate.slug ?? candidate.name}`}>
              <article className="cand-row">
                <span className="font-mono text-xs font-semibold tracking-[0.12em] text-muted">{candidate.uf}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{OFFICE_LABEL[candidate.office as RaceOffice]}</span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug text-cream">{candidate.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/80">
                    {candidate.currentOffice || (inPoll ? "Na pesquisa" : "Só na urna")}
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{candidate.party}</span>
                <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: partyColor(candidate.party) }}>{candidate.number}</span>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
