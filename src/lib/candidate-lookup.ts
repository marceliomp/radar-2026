import { CANDIDATES, type Candidate, type CandidateOffice } from "@/data/candidates";
import { fold } from "@/features/races/race-types";
import type { RaceCargo } from "@/features/races/race-types";

export function officeOfCargo(cargo: RaceCargo): CandidateOffice {
  return cargo === "senador" ? "senator" : "governor";
}

export function findCandidateBySlug(
  slug: string,
  uf?: string,
  office?: CandidateOffice,
): Candidate | undefined {
  const key = fold(slug.trim());
  if (!key) return undefined;
  return CANDIDATES.find((c) => {
    if (fold(c.slug) !== key) return false;
    if (uf && c.uf !== uf.toUpperCase()) return false;
    if (office && c.office !== office) return false;
    return true;
  });
}

export function searchCandidates(query: string, limit = 12): Candidate[] {
  const needle = fold(query.trim());
  if (!needle || needle.length < 2) return [];
  const hits: Candidate[] = [];
  for (const c of CANDIDATES) {
    if (c.office === "president") continue;
    const blob = fold(`${c.name} ${c.party} ${c.number} ${c.slug} ${c.uf}`);
    if (!blob.includes(needle)) continue;
    hits.push(c);
    if (hits.length >= limit) break;
  }
  return hits.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function candidateHasBallotNumber(c: Candidate): boolean {
  return Boolean(String(c.number ?? "").trim());
}
