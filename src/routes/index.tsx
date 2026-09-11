import { createFileRoute } from "@tanstack/react-router";
import { parseAsOfSearch } from "@/lib/as-of";
import { headTags, homeHead } from "@/lib/page-meta";

export const Route = createFileRoute("/")({
  validateSearch: parseAsOfSearch,
  head: ({ match }) => headTags(homeHead(match.search as Record<string, unknown>)),
});
