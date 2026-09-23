import { createFileRoute } from "@tanstack/react-router";
import { parseAsOfSearch } from "@/lib/as-of";
import { headTags, homeHead, homeJsonLd } from "@/lib/page-meta";

export const Route = createFileRoute("/")({
  validateSearch: parseAsOfSearch,
  head: ({ match }) => {
    const search = match.search as Record<string, unknown>;
    const { meta, links } = headTags(homeHead(search));
    // TanStack's head renderer special-cases `script:ld+json` (see
    // headContentUtils) but this router version's meta type doesn't model
    // it, hence the cast: a type-defs gap, not a runtime one.
    const jsonLd = { "script:ld+json": homeJsonLd(search) } as unknown as (typeof meta)[number];
    return {
      meta: [...meta, jsonLd],
      links,
    };
  },
});
