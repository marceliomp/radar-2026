import { createFileRoute } from "@tanstack/react-router";
import { ForecastDashboard } from "@/components/forecast-dashboard";
import { parseAsOfSearch } from "@/lib/as-of";

export const Route = createFileRoute("/lab")({
  validateSearch: parseAsOfSearch,
  component: Lab,
});

function Lab() {
  return <ForecastDashboard variant="lab" />;
}
