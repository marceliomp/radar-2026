import { createLazyFileRoute } from "@tanstack/react-router";
import { LabRadarPage } from "@/features/radar/lab/lab-radar-page";

export const Route = createLazyFileRoute("/lab")({
  component: LabRadarPage,
});
