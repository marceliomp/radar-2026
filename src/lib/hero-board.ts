import { round } from "./format.ts";

export type HeroNamedKey = "lula" | "flavio" | "cury" | "caiado" | "renan" | "zema";
export type HeroKey = HeroNamedKey | "outros";
export type HeroRow = { key: HeroKey; p: number };

export type HeroProbs = {
  lulaWinsElection: number;
  flavioWinsElection: number;
  curyWinsElection?: number;
  caiadoWinsElection?: number;
  renanWinsElection?: number;
  zemaWinsElection?: number;
};

const NAMED: HeroNamedKey[] = ["lula", "flavio", "cury", "caiado", "renan", "zema"];

const PROB_KEY: Record<HeroNamedKey, keyof HeroProbs> = {
  lula: "lulaWinsElection",
  flavio: "flavioWinsElection",
  cury: "curyWinsElection",
  caiado: "caiadoWinsElection",
  renan: "renanWinsElection",
  zema: "zemaWinsElection",
};

/** Named extras need 1% alone. Leftover to 100% (from rounded screen %) becomes Outros. */
export function buildHeroBoard(probs: HeroProbs): HeroRow[] {
  const rows: HeroRow[] = NAMED.map((key) => ({
    key,
    p: Number(probs[PROB_KEY[key]] ?? 0),
  }));
  const always = rows.filter((row) => row.key === "lula" || row.key === "flavio");
  const extras = rows
    .filter((row) => row.key !== "lula" && row.key !== "flavio" && row.p >= 0.01)
    .sort((a, b) => b.p - a.p);
  const picked = [...always, ...extras].sort((a, b) => b.p - a.p).slice(0, 3);
  const shown = picked.reduce((sum, row) => sum + round(row.p * 100, 1), 0);
  const rest = round(100 - shown, 1);
  if (picked.length < 3 && rest >= 0.1) {
    picked.push({ key: "outros", p: rest / 100 });
  }
  return picked;
}
