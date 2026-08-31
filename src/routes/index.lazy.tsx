import { createLazyFileRoute } from "@tanstack/react-router";
import { PublicRadarPage } from "@/features/radar/public/public-radar-page";

export const Route = createLazyFileRoute("/")({
  component: PublicRadarPage,
});
