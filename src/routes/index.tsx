import { createFileRoute } from "@tanstack/react-router";
import { ForecastDashboard } from "@/components/forecast-dashboard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <ForecastDashboard />;
}
