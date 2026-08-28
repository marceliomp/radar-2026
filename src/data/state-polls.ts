export type StateSnapshot = {
  uf: string;
  institute: string;
  date: string;
  moe: number;
  lula1: number;
  flavio1: number;
  lula2?: number;
  flavio2?: number;
  t2Institute?: string;
  note?: string;
  stale?: boolean;
};

export const STATE_SNAPSHOTS: StateSnapshot[] = [
  { uf: "SP", institute: "Quaest/Globo", date: "2026-08-25", moe: 2, lula1: 29, flavio1: 30 },
  { uf: "MG", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 30, flavio1: 31 },
  { uf: "RJ", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 29, flavio1: 31 },
  { uf: "BA", institute: "Quaest/TV Bahia", date: "2026-08-27", moe: 3, lula1: 50, flavio1: 17, note: "Poder360 27/08 · n=900 · 23–26/08. Sem Marçal." },
  { uf: "RS", institute: "Real Time", date: "2026-08-25", moe: 2, lula1: 39, flavio1: 40, lula2: 42, flavio2: 52, t2Institute: "Real Time 25/08" },
  { uf: "PR", institute: "Real Time", date: "2026-08-18", moe: 2, lula1: 31, flavio1: 44, lula2: 35, flavio2: 52, t2Institute: "Real Time 18/08" },
  { uf: "SC", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 20, flavio1: 45 },
  { uf: "PE", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 54, flavio1: 19 },
  { uf: "CE", institute: "Real Time", date: "2026-08-20", moe: 2, lula1: 65, flavio1: 21, lula2: 66, flavio2: 27, t2Institute: "Real Time 20/08" },
  { uf: "PA", institute: "Real Time", date: "2026-08-04", moe: 2, lula1: 43, flavio1: 33, stale: true, note: "RTBD 4/08. Sem Quaest nesta rodada." },
  { uf: "MA", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 58, flavio1: 20 },
  { uf: "GO", institute: "Quaest", date: "2026-08-27", moe: 3, lula1: 20, flavio1: 27, note: "Caiado lidera o 1º (~32%). L×F 20×27." },
  { uf: "PB", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 50, flavio1: 21 },
  { uf: "RN", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 54, flavio1: 20 },
  { uf: "AL", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 44, flavio1: 29 },
  { uf: "PI", institute: "Datafolha", date: "2026-08-25", moe: 3, lula1: 60, flavio1: 19 },
  { uf: "SE", institute: "Quaest", date: "2026-08-26", moe: 3, lula1: 53, flavio1: 19 },
  { uf: "DF", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 28, flavio1: 26 },
  { uf: "ES", institute: "Quaest", date: "2026-08-26", moe: 3, lula1: 30, flavio1: 37 },
  { uf: "MT", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 26, flavio1: 43 },
  { uf: "MS", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 27, flavio1: 33 },
  { uf: "AM", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 38, flavio1: 33 },
  { uf: "RO", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 25, flavio1: 45 },
  { uf: "AC", institute: "Quaest", date: "2026-08-26", moe: 3, lula1: 25, flavio1: 42 },
  { uf: "TO", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 37, flavio1: 32 },
  { uf: "AP", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 36, flavio1: 33 },
  { uf: "RR", institute: "Quaest/Rede Amazônica", date: "2026-08-26", moe: 3, lula1: 17, flavio1: 52 },
];

export const STATE_BY_UF = Object.fromEntries(
  STATE_SNAPSHOTS.map((s) => [s.uf, s]),
) as Record<string, StateSnapshot>;

export type RoundKey = 1 | 2;

export function scores(
  s: StateSnapshot,
  round: RoundKey,
): { lula: number; flavio: number; polled: boolean } {
  if (round === 1) return { lula: s.lula1, flavio: s.flavio1, polled: true };
  if (s.lula2 != null && s.flavio2 != null) {
    return { lula: s.lula2, flavio: s.flavio2, polled: true };
  }
  const tot = s.lula1 + s.flavio1;
  if (tot <= 0) return { lula: 0, flavio: 0, polled: false };
  const lula = Math.round((s.lula1 / tot) * 1000) / 10;
  return { lula, flavio: Math.round((100 - lula) * 10) / 10, polled: false };
}

export function stateFillFromGap(gap: number, moe: number): string {
  if (Math.abs(gap) <= moe) return "#6b7c5e";
  if (gap > 0) {
    if (gap >= 20) return "#1d6ea3";
    if (gap >= 10) return "#2f84bb";
    return "#4a9bc9";
  }
  const g = -gap;
  if (g >= 20) return "#b51c1c";
  if (g >= 10) return "#d03434";
  return "#e05555";
}
