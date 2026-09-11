import { createFileRoute } from "@tanstack/react-router";
import { parseAsOfSearch } from "@/lib/as-of";
import { headTags, labHead } from "@/lib/page-meta";

export const Route = createFileRoute("/lab")({
  validateSearch: parseAsOfSearch,
  head: ({ match }) => headTags(labHead(match.search as Record<string, unknown>)),
});
