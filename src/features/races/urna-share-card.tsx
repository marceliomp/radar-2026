import type { Candidate } from "@/data/candidates";
import { partyColor } from "@/lib/chart-theme";
import { candidateHasBallotNumber } from "@/lib/candidate-lookup";
import { useI18n } from "@/lib/i18n";
import { ShareBar } from "@/components/share-bar";
import type { RaceCargo } from "./race-types";

type Props = {
  candidate: Candidate;
  cargo: RaceCargo;
  shareHref: string;
  shareText: string;
};

export function UrnaShareCard({ candidate, cargo, shareHref, shareText }: Props) {
  const { m } = useI18n();
  const officeLabel = cargo === "senador" ? m.race.senator : m.race.governor;
  const hasNum = candidateHasBallotNumber(candidate);

  return (
    <section className="urna-card border-b border-border px-4 py-6 md:px-6">
      <p className="kicker">{m.urna.kicker}</p>
      <div className="urna-card-body mt-4">
        {hasNum ? (
          <p
            className="urna-num tabular-nums"
            style={{ color: partyColor(candidate.party) }}
            aria-label={m.race.num(candidate.number)}
          >
            {candidate.number}
          </p>
        ) : (
          <p className="urna-missing">{m.urna.noNumber}</p>
        )}
        <div className="urna-meta min-w-0">
          <h1 className="urna-name">{candidate.name}</h1>
          <p className="urna-detail">
            {officeLabel} · {candidate.uf} · {candidate.party}
          </p>
          {!hasNum ? (
            <p className="urna-note mt-2 text-sm font-medium text-muted">{m.urna.noNumberNote}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <ShareBar compact url={shareHref} text={shareText} />
      </div>
    </section>
  );
}
