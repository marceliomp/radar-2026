import { createFileRoute } from "@tanstack/react-router";
import { ApuracaoPage } from "@/features/apuracao/apuracao-page";
import { parseCargo, type Cargo } from "@/lib/apuracao/tse";
import { parseAsOfParam } from "@/lib/as-of";
import { parseHalfLifeSearch } from "@/lib/half-life";
import { parseLangSearch, type Locale } from "@/lib/i18n/locale";
import { apuracaoHead, headTags } from "@/lib/page-meta";
import { parseUfCode } from "@/lib/site";

export type ApuracaoSearch = {
  cargo: Cargo;
  uf?: string;
  asOf?: string;
  hl?: number;
  lang?: Locale;
};

function parseApuracaoSearch(search: Record<string, unknown>): ApuracaoSearch {
  const uf = parseUfCode(search.uf);
  const asOf = parseAsOfParam(search.asOf);
  return {
    cargo: parseCargo(search.cargo) ?? "presidente",
    ...(uf ? { uf } : {}),
    ...(asOf ? { asOf } : {}),
    ...parseHalfLifeSearch(search),
    ...parseLangSearch(search),
  };
}

export const Route = createFileRoute("/apuracao")({
  validateSearch: parseApuracaoSearch,
  head: ({ match }) => headTags(apuracaoHead(match.search as Record<string, unknown>)),
  component: ApuracaoPage,
});
