import { UF_META } from "@/data/calendar";
import { ELECTION_2022, gap2t, leader2t } from "@/data/election-2022";
import { fmtNum, fmtPct } from "@/lib/format";

export function leadLine(leader: "Lula" | "Bolsonaro", gap: number): string {
  const pp = fmtNum(Math.abs(gap), 2);
  return `${leader} a frente (${pp} pp)`;
}

export function tipCopy2022(uf: string): string {
  const urn = ELECTION_2022[uf];
  if (!urn) return uf;
  return `${UF_META[uf]?.name ?? uf}: 1º Lula ${fmtPct(urn.lula1, 1)} × Bolsonaro ${fmtPct(urn.bolsonaro1, 1)}. 2º Lula ${fmtPct(urn.lula2, 1)} × Bolsonaro ${fmtPct(urn.bolsonaro2, 1)}. ${leadLine(leader2t(urn), gap2t(urn))}`;
}


export function radarKeep(prev: Record<string, unknown>): { asOf?: string; hl?: number } {
  const out: { asOf?: string; hl?: number } = {};
  if (typeof prev.asOf === "string" && prev.asOf) out.asOf = prev.asOf;
  if (typeof prev.hl === "number" && Number.isFinite(prev.hl)) out.hl = prev.hl;
  else if (typeof prev.hl === "string" && prev.hl.trim()) {
    const n = Number(prev.hl);
    if (Number.isFinite(n)) out.hl = n;
  }
  return out;
}
