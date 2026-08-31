import { createFileRoute } from "@tanstack/react-router";
import { RacePage } from "@/features/races/race-page";
import { parseAsOfParam } from "@/lib/as-of";
import { parseHalfLifeSearch } from "@/lib/half-life";
import { UF_ORDER } from "@/data/candidates";

const UF_SET = new Set(UF_ORDER);

export type CandidatosSearch = {
  uf?: string;
  cargo?: "governador" | "senador";
  asOf?: string;
  hl?: number;
};

function parseCandidatosSearch(
  search: Record<string, unknown>,
): CandidatosSearch {
  const raw =
    typeof search.uf === "string" ? search.uf.trim().toUpperCase() : "";
  const uf = UF_SET.has(raw) ? raw : "SC";
  const cargo =
    search.cargo === "senador" || search.cargo === "senator"
      ? "senador"
      : "governador";
  const asOf = parseAsOfParam(search.asOf);
  return {
    uf,
    cargo,
    ...(asOf ? { asOf } : {}),
    ...parseHalfLifeSearch(search),
  };
}

export const Route = createFileRoute("/candidatos")({
  validateSearch: parseCandidatosSearch,
  component: CandidatosPage,
});

function CandidatosPage() {
  return <RacePage />;
}
