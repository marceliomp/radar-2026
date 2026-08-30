import { createFileRoute } from "@tanstack/react-router";
import { ForecastDashboard } from "@/components/forecast-dashboard";
import { parseAsOfSearch } from "@/lib/as-of";

export const Route = createFileRoute("/")({
  validateSearch: parseAsOfSearch,
  component: Home,
});

function Home() {
  return <ForecastDashboard />;
}
