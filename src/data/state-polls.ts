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
  { uf: "SP", institute: "Datafolha/Globo", date: "2026-10-02", moe: 2, lula1: 38, flavio1: 39, lula2: 45, flavio2: 48, t2Institute: "Datafolha 02/10", note: "G1/Veja 02/10. n=1.610 ±2 campo 28–30/09. TSE SP-01367/2026 e BR-02676/2026 (mesma onda Folha). 1º 38×39 Flávio. 2º 45×48." },
  { uf: "MG", institute: "Datafolha/Globo", date: "2026-10-02", moe: 3, lula1: 42, flavio1: 36, lula2: 48, flavio2: 44, t2Institute: "Datafolha 02/10", note: "G1 02/10. TSE BR-00950/2026. n=1.204 ±3 campo 28/09–01/10. 1º 42×36. 2º 48×44." },
  { uf: "RJ", institute: "Datafolha/Globo", date: "2026-10-02", moe: 3, lula1: 38, flavio1: 45, lula2: 42, flavio2: 51, t2Institute: "Datafolha 02/10", note: "G1 02/10. TSE RJ-02070/2026 e BR-01272/2026. n=1.204 ±3 campo 28/09–01/10. 1º 38×45. 2º 42×51." },
  { uf: "BA", institute: "Quaest/TV Bahia", date: "2026-08-27", moe: 3, lula1: 50, flavio1: 17, note: "Poder360 27/08 · n=900 · 23–26/08. Sem Marçal." },
  { uf: "RS", institute: "Real Time", date: "2026-08-25", moe: 2, lula1: 39, flavio1: 40, lula2: 42, flavio2: 52, t2Institute: "Real Time 25/08" },
  { uf: "PR", institute: "Real Time", date: "2026-08-18", moe: 2, lula1: 31, flavio1: 44, lula2: 35, flavio2: 52, t2Institute: "Real Time 18/08" },
  { uf: "SC", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 20, flavio1: 45 },
  { uf: "PE", institute: "Datafolha/Globo", date: "2026-10-02", moe: 3, lula1: 61, flavio1: 25, lula2: 65, flavio2: 29, t2Institute: "Datafolha 02/10", note: "G1 02/10. TSE PE-06822/2026 e BR-02676/2026. n=1.204 ±3 campo 28/09–01/10. 1º 61×25. 2º 65×29." },
  { uf: "CE", institute: "Quaest/TV Verdes Mares", date: "2026-09-23", moe: 3, lula1: 55, flavio1: 23, note: "G1 23/09. TSE BR-03184/2026. n=900 ±3 campo 19–22/09. Sem 2T neste recorte." },
  { uf: "PA", institute: "Real Time", date: "2026-08-04", moe: 2, lula1: 43, flavio1: 33, stale: true, note: "RTBD 4/08. Sem Quaest nesta rodada." },
  { uf: "MA", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 58, flavio1: 20 },
  { uf: "GO", institute: "Quaest", date: "2026-08-27", moe: 3, lula1: 20, flavio1: 27, note: "Caiado lidera o 1º (~32%). L×F 20×27." },
  { uf: "PB", institute: "Quaest/Globo", date: "2026-08-25", moe: 3, lula1: 50, flavio1: 21 },
  { uf: "RN", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 54, flavio1: 20 },
  { uf: "AL", institute: "Quaest/Globo", date: "2026-08-24", moe: 3, lula1: 44, flavio1: 29 },
  { uf: "PI", institute: "Datafolha", date: "2026-08-25", moe: 3, lula1: 60, flavio1: 19 },
  { uf: "SE", institute: "Quaest", date: "2026-08-26", moe: 3, lula1: 53, flavio1: 19 },
  { uf: "DF", institute: "Datafolha/Globo", date: "2026-10-02", moe: 3, lula1: 35, flavio1: 44, lula2: 39, flavio2: 51, t2Institute: "Datafolha 02/10", note: "G1 02/10. TSE DF-00905/2026 e BR-09530/2026. n=910 ±3 campo 28–30/09. 1º 35×44. 2º 39×51." },
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
  return { lula: 0, flavio: 0, polled: false };
}

/** Margem do card do mapa: ±1.96 × SE do agregado (não o SE do gap do motor). */
export function cardMarginPp(se: number): number {
  return 1.96 * se;
}

/** Empate só se |gap| cabe na margem realmente exibida no card. */
export function isCardTie(gap: number, se: number): boolean {
  return Math.abs(gap) <= cardMarginPp(se);
}

export function stateFillFromGap(gap: number, moe: number): string {
  if (Math.abs(gap) <= moe) return "#5f7358";
  if (gap > 0) {
    if (gap >= 20) return "#256fa3";
    if (gap >= 10) return "#3489c0";
    return "#3d96cc";
  }
  const g = -gap;
  if (g >= 20) return "#c62828";
  if (g >= 10) return "#dc3d3d";
  return "#ee5a5a";
}
