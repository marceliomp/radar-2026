import { UF_META } from "@/data/calendar";
import { CANDIDATES } from "@/data/candidates";
import { RACE_POLLS } from "@/data/race-polls";

export type TightRace = {
  uf: string;
  ufName: string;
  houses: number;
  institute: string;
  aName: string;
  bName: string;
  aPct: number;
  bPct: number;
  gap: number;
};

function govName(slug: string, uf: string): string {
  return (
    CANDIDATES.find(
      (c) => c.office === "governor" && c.uf === uf && c.slug === slug,
    )?.name ?? slug
  );
}

export function governorHousesByUf(): Record<string, number> {
  const out: Record<string, number> = {};
  const ufs = new Set(
    RACE_POLLS.filter((p) => p.office === "governor").map((p) => p.uf),
  );
  for (const uf of ufs) {
    const set = new Set(
      RACE_POLLS.filter((x) => x.office === "governor" && x.uf === uf).map(
        (x) => x.institute,
      ),
    );
    out[uf] = set.size;
  }
  return out;
}

/** Ultima casa publicada por UF. Gap = pontos da pesquisa, nao chance. */
export function tightGovernorRaces(limit = 6): TightRace[] {
  const houses = governorHousesByUf();
  const latest = new Map<string, (typeof RACE_POLLS)[number]>();
  for (const p of RACE_POLLS) {
    if (p.office !== "governor") continue;
    const prev = latest.get(p.uf);
    const key = `${p.date}|${p.fieldEnd}`;
    const prevKey = prev ? `${prev.date}|${prev.fieldEnd}` : "";
    if (!prev || key > prevKey) latest.set(p.uf, p);
  }

  const rows: TightRace[] = [];
  for (const [uf, poll] of latest) {
    const ranked = Object.entries(poll.firstRound)
      .filter(([, v]) => typeof v === "number")
      .sort((a, b) => b[1] - a[1]);
    if (ranked.length < 2) continue;
    const [aSlug, aPct] = ranked[0];
    const [bSlug, bPct] = ranked[1];
    const gap = aPct - bPct;
    rows.push({
      uf,
      ufName: UF_META[uf]?.name ?? uf,
      houses: houses[uf] ?? 1,
      institute: poll.institute,
      aName: govName(aSlug, uf),
      bName: govName(bSlug, uf),
      aPct,
      bPct,
      gap,
    });
  }

  return rows
    .sort((a, b) => a.gap - b.gap || a.uf.localeCompare(b.uf))
    .slice(0, limit);
}

export function houseSplit(): { one: string[]; two: string[] } {
  const houses = governorHousesByUf();
  const one: string[] = [];
  const two: string[] = [];
  for (const uf of Object.keys(houses).sort()) {
    if (houses[uf] >= 2) two.push(uf);
    else one.push(uf);
  }
  return { one, two };
}
