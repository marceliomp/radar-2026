import { createFileRoute } from "@tanstack/react-router";
import { RacePage } from "@/features/races/race-page";
import { parseAsOfParam } from "@/lib/as-of";
import { parseHalfLifeSearch } from "@/lib/half-life";
import { parseLangSearch, type Locale } from "@/lib/i18n/locale";
import { candidatosHead, headTags } from "@/lib/page-meta";
import { parseUfCode } from "@/lib/site";

export type CandidatosSearch = {
  uf?: string;
  cargo?: "governador" | "senador";
  c?: string;
  asOf?: string;
  hl?: number;
  lang?: Locale;
};

function parseCandidatosSearch(
  search: Record<string, unknown>,
): CandidatosSearch {
  const uf = parseUfCode(search.uf);
  const cargo =
    search.cargo === "senador" || search.cargo === "senator"
      ? "senador"
      : "governador";
  const asOf = parseAsOfParam(search.asOf);
  const c =
    typeof search.c === "string" && search.c.trim().length >= 2
      ? search.c.trim()
      : undefined;
  return {
    ...(uf ? { uf } : {}),
    cargo,
    ...(c ? { c } : {}),
    ...(asOf ? { asOf } : {}),
    ...parseHalfLifeSearch(search),
    ...parseLangSearch(search),
  };
}

export const Route = createFileRoute("/candidatos")({
  validateSearch: parseCandidatosSearch,
  head: ({ match }) =>
    headTags(candidatosHead(match.search as Record<string, unknown>)),
  component: CandidatosPage,
});

function CandidatosPage() {
  return <RacePage />;
}
