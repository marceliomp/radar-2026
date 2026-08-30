import type { ForecastPoll } from "@/lib/forecast/engine";
import { partyColor } from "@/lib/chart-theme";
import pollsJson from "./polls.json";

/** Public mid-2026 snapshot. SoT is polls.json. */
export const polls: ForecastPoll[] = pollsJson as ForecastPoll[];

export const CANDIDATE_META = {
  lula: { name: "Lula", party: "PT", color: partyColor("PT") },
  flavio: { name: "Flávio Bolsonaro", party: "PL", color: partyColor("PL") },
  renan: { name: "Renan Santos", party: "Missão", color: partyColor("Missão") },
  caiado: { name: "Ronaldo Caiado", party: "PSD", color: partyColor("PSD") },
  zema: { name: "Romeu Zema", party: "NOVO", color: partyColor("NOVO") },
  cury: { name: "Augusto Cury", party: "Avante", color: partyColor("Avante") },
} as const;
