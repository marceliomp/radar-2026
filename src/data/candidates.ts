import { UF_META } from "./calendar";
import candidatesJson from "./candidates.json" with { type: "json" };

export type CandidateOffice = "president" | "governor" | "senator";
export type Office = CandidateOffice;

export type Candidate = {
  office: CandidateOffice;
  uf: string;
  name: string;
  party: string;
  number: string;
  slug: string;
  gender: string;
  currentOffice: string;
};
export type CandidateRow = Candidate;

export type CandidatesFile = {
  source: string;
  asOf: string;
  note: string;
  counts: { governor: number; senator: number; president: number };
  candidates: Candidate[];
};

const file = candidatesJson as CandidatesFile;

export const CANDIDATES: Candidate[] = file.candidates;

export const CANDIDATES_META = {
  source: file.source,
  asOf: file.asOf,
  note: file.note,
  counts: file.counts,
};

/** Siglas A-Z (AC, AL, AM...). Default de pagina continua SC. */
export const UF_ORDER = Object.keys(UF_META).sort((a, b) => a.localeCompare(b));

export function byUf(uf: string): Candidate[] {
  const key = uf.trim().toUpperCase();
  if (!key || key === "TODOS" || key === "ALL") return CANDIDATES;
  return CANDIDATES.filter((c) => c.uf === key);
}

export function byOffice(office: CandidateOffice): Candidate[] {
  return CANDIDATES.filter((c) => c.office === office);
}
