import type { Candidate, Office } from "@/data/candidates";
import type { RaceForecastResult } from "@/lib/forecast/race-engine";

export type RaceOffice = Exclude<Office, "president">;
export type RaceCargo = "governador" | "senador";

export type HeroLeader = {
  key: string;
  name: string;
  party: string;
  number: string;
  pWin: number;
  firstMean: number;
};

export type FirstBar = {
  key: string;
  name: string;
  party: string;
  mean: number;
};

export const OFFICE_OF_CARGO: Record<RaceCargo, RaceOffice> = {
  governador: "governor",
  senador: "senator",
};

export const OFFICE_LABEL: Record<RaceOffice, string> = {
  governor: "Governador",
  senator: "Senador",
};

export function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function fmtDateBr(iso: string) {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function pickLeaders(
  office: RaceOffice,
  candidates: Candidate[],
  result: RaceForecastResult,
): HeroLeader[] {
  const ranked = candidates
    .map((candidate) => ({
      key: candidate.slug,
      name: candidate.name,
      party: candidate.party,
      number: candidate.number,
      pWin: result.probs[candidate.slug] ?? 0,
      firstMean: result.first[candidate.slug]?.mean ?? 0,
    }))
    .sort(
      (a, b) =>
        b.pWin - a.pWin ||
        b.firstMean - a.firstMean ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  if (office === "governor") return ranked.slice(0, 2);
  return ranked.filter((leader) => leader.pWin >= 0.02).slice(0, 4);
}

export function firstBars(
  candidates: Candidate[],
  result: RaceForecastResult,
): FirstBar[] {
  const bySlug = new Map(candidates.map((candidate) => [candidate.slug, candidate]));
  return result.ordered
    .filter((row) => row.mean > 0)
    .slice(0, 8)
    .map((row) => {
      const candidate = bySlug.get(row.slug);
      return {
        key: row.slug,
        name: candidate?.name ?? row.slug,
        party: candidate?.party ?? "",
        mean: row.mean,
      };
    });
}
