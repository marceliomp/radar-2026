import { useEffect, useState } from "react";
import {
  VISIT_KEY,
  readVisit,
  visitView,
  writeVisit,
  type VisitSnap,
} from "@/lib/visit-delta";

export function VisitHook({
  pLula,
  pFlavio,
  hl,
  newestId,
}: {
  pLula: number;
  pFlavio: number;
  hl: number;
  newestId: string;
}) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    const now = { pLula, pFlavio, hl, newestId };
    const prev = readVisit(window.localStorage.getItem(VISIT_KEY));
    setLine(visitView(prev, now).line);
    const snap: VisitSnap = { at: Date.now(), ...now };
    window.localStorage.setItem(VISIT_KEY, writeVisit(snap));
  }, [pLula, pFlavio, hl, newestId]);

  if (!line) return null;
  return <p className="hero-pulse">{line}</p>;
}
