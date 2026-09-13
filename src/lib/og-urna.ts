import type { Candidate } from "@/data/candidates";
import { SITE } from "@/lib/site";
import type { RaceCargo } from "@/features/races/race-types";
import { officeOfCargo, candidateHasBallotNumber } from "@/lib/candidate-lookup";
import { OG_URNA_KEYS } from "@/lib/og-urna-manifest";

const OG_SERVICE = "https://og.grok.me/v1/card.png";

export function ogUrnaAssetKey(candidate: Candidate): string {
  return `${candidate.uf.toLowerCase()}-${candidate.office}-${candidate.slug}`;
}

export function ogUrnaStaticPath(candidate: Candidate): string {
  return `/og/urna/${ogUrnaAssetKey(candidate)}.jpg`;
}

export function ogUrnaImageUrl(candidate: Candidate): string {
  if (!candidateHasBallotNumber(candidate)) {
    return `${SITE}/og.jpg`;
  }
  return `${SITE}${ogUrnaStaticPath(candidate)}`;
}

export function ogUrnaFallbackImage(title: string): string {
  const params = new URLSearchParams({
    host: "brasilradar.com.br",
    title,
    color: "2a9583",
  });
  return `${OG_SERVICE}?${params}`;
}

export function urnaCardTitle(
  candidate: Candidate,
  cargo: RaceCargo,
  officeLabel: string,
): string {
  const num = candidateHasBallotNumber(candidate)
    ? `${candidate.number} · `
    : "";
  return `${num}${candidate.name} · ${officeLabel} ${candidate.uf} · Radar 2026`;
}

export function urnaCardDescription(candidate: Candidate): string {
  if (!candidateHasBallotNumber(candidate)) {
    return "Número de urna ainda não publicado no espelho TSE. Placar agregado no link.";
  }
  return `Número na urna: ${candidate.number}. ${candidate.party}. Dados TSE. Não é pesquisa.`;
}

export function resolveCandidateOgImage(
  candidate: Candidate,
  cargo: RaceCargo,
  officeLabel: string,
): string {
  if (!candidateHasBallotNumber(candidate)) {
    return `${SITE}/og.jpg`;
  }
  if (OG_URNA_KEYS.has(ogUrnaAssetKey(candidate))) {
    return ogUrnaImageUrl(candidate);
  }
  return ogUrnaFallbackImage(urnaCardTitle(candidate, cargo, officeLabel));
}

export function cargoForCandidate(c: Candidate): RaceCargo {
  return c.office === "senator" ? "senador" : "governador";
}

export function officeLabelFor(c: Candidate, locale: "pt" | "en"): string {
  if (locale === "en") return c.office === "senator" ? "Senator" : "Governor";
  return c.office === "senator" ? "Senador" : "Governador";
}

export { officeOfCargo, candidateHasBallotNumber };
