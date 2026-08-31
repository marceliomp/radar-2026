import { createFileRoute } from "@tanstack/react-router";
import { parseAsOfSearch } from "@/lib/as-of";

export const Route = createFileRoute("/lab")({
  validateSearch: parseAsOfSearch,
});
