/**
 * Urna presidencial 2022 por colégio eleitoral (UF).
 * % de votos válidos, 1º (2/out) e 2º (30/out). Lula × Bolsonaro.
 * Fonte: TSE (resultados.tse.jus.br), tabela por UF.
 * Nacional 2º: Lula 50,90 × Bolsonaro 49,10.
 */
export type Election2022Uf = {
  uf: string;
  /** % válidos 1º turno. */
  lula1: number;
  bolsonaro1: number;
  /** % válidos 2º turno. */
  lula2: number;
  bolsonaro2: number;
  votes1: { lula: number; bolsonaro: number };
  votes2: { lula: number; bolsonaro: number };
};

export const NATIONAL_2022 = {
  lula1: 48.43,
  bolsonaro1: 43.2,
  lula2: 50.9,
  bolsonaro2: 49.1,
} as const;

/** 27 UFs. Sem ZZ (exterior). */
const ROWS: Election2022Uf[] = [
  { uf: "AC", lula1: 29.26, bolsonaro1: 62.5, lula2: 29.7, bolsonaro2: 70.3, votes1: { lula: 129022, bolsonaro: 275582 }, votes2: { lula: 121566, bolsonaro: 287750 } },
  { uf: "AL", lula1: 56.5, bolsonaro1: 36.05, lula2: 58.68, bolsonaro2: 41.32, votes1: { lula: 974156, bolsonaro: 621515 }, votes2: { lula: 976831, bolsonaro: 687827 } },
  { uf: "AM", lula1: 49.58, bolsonaro1: 42.8, lula2: 51.1, bolsonaro2: 48.9, votes1: { lula: 1019684, bolsonaro: 880198 }, votes2: { lula: 1004991, bolsonaro: 961741 } },
  { uf: "AP", lula1: 45.67, bolsonaro1: 43.41, lula2: 48.64, bolsonaro2: 51.36, votes1: { lula: 197382, bolsonaro: 187621 }, votes2: { lula: 189918, bolsonaro: 200547 } },
  { uf: "BA", lula1: 69.73, bolsonaro1: 24.31, lula2: 72.12, bolsonaro2: 27.88, votes1: { lula: 5873081, bolsonaro: 2047599 }, votes2: { lula: 6097815, bolsonaro: 2357028 } },
  { uf: "CE", lula1: 65.91, bolsonaro1: 25.38, lula2: 69.97, bolsonaro2: 30.03, votes1: { lula: 3578355, bolsonaro: 1377827 }, votes2: { lula: 3807891, bolsonaro: 1634477 } },
  { uf: "DF", lula1: 36.85, bolsonaro1: 51.65, lula2: 41.19, bolsonaro2: 58.81, votes1: { lula: 649534, bolsonaro: 910397 }, votes2: { lula: 729295, bolsonaro: 1041331 } },
  { uf: "ES", lula1: 40.4, bolsonaro1: 52.23, lula2: 41.96, bolsonaro2: 58.04, votes1: { lula: 897348, bolsonaro: 1160030 }, votes2: { lula: 926767, bolsonaro: 1282145 } },
  { uf: "GO", lula1: 39.51, bolsonaro1: 52.16, lula2: 41.29, bolsonaro2: 58.71, votes1: { lula: 1454723, bolsonaro: 1920203 }, votes2: { lula: 1542115, bolsonaro: 2193041 } },
  { uf: "MA", lula1: 68.84, bolsonaro1: 26.02, lula2: 71.14, bolsonaro2: 28.86, votes1: { lula: 2603454, bolsonaro: 983861 }, votes2: { lula: 2668425, bolsonaro: 1082749 } },
  { uf: "MG", lula1: 48.29, bolsonaro1: 43.6, lula2: 50.2, bolsonaro2: 49.8, votes1: { lula: 5802571, bolsonaro: 5239264 }, votes2: { lula: 6190960, bolsonaro: 6141310 } },
  { uf: "MS", lula1: 39.04, bolsonaro1: 52.7, lula2: 40.51, bolsonaro2: 59.49, votes1: { lula: 588323, bolsonaro: 794206 }, votes2: { lula: 599547, bolsonaro: 880606 } },
  { uf: "MT", lula1: 34.39, bolsonaro1: 59.84, lula2: 34.92, bolsonaro2: 65.08, votes1: { lula: 633748, bolsonaro: 1102866 }, votes2: { lula: 652786, bolsonaro: 1216730 } },
  { uf: "PA", lula1: 52.22, bolsonaro1: 40.27, lula2: 54.75, bolsonaro2: 45.25, votes1: { lula: 2443730, bolsonaro: 1884673 }, votes2: { lula: 2509084, bolsonaro: 2073895 } },
  { uf: "PB", lula1: 64.21, bolsonaro1: 29.62, lula2: 66.62, bolsonaro2: 33.38, votes1: { lula: 1554868, bolsonaro: 717416 }, votes2: { lula: 1601953, bolsonaro: 802502 } },
  { uf: "PE", lula1: 65.27, bolsonaro1: 29.91, lula2: 66.93, bolsonaro2: 33.07, votes1: { lula: 3558322, bolsonaro: 1630938 }, votes2: { lula: 3640933, bolsonaro: 1798832 } },
  { uf: "PI", lula1: 74.25, bolsonaro1: 19.9, lula2: 76.86, bolsonaro2: 23.14, votes1: { lula: 1518008, bolsonaro: 406897 }, votes2: { lula: 1551383, bolsonaro: 467065 } },
  { uf: "PR", lula1: 35.99, bolsonaro1: 55.26, lula2: 37.6, bolsonaro2: 62.4, votes1: { lula: 2363492, bolsonaro: 3628612 }, votes2: { lula: 2506605, bolsonaro: 4159343 } },
  { uf: "RJ", lula1: 40.68, bolsonaro1: 51.09, lula2: 43.47, bolsonaro2: 56.53, votes1: { lula: 3847143, bolsonaro: 4831246 }, votes2: { lula: 4156217, bolsonaro: 5403894 } },
  { uf: "RN", lula1: 62.98, bolsonaro1: 31.02, lula2: 65.1, bolsonaro2: 34.9, votes1: { lula: 1264179, bolsonaro: 622731 }, votes2: { lula: 1326785, bolsonaro: 711381 } },
  { uf: "RO", lula1: 28.98, bolsonaro1: 64.36, lula2: 29.34, bolsonaro2: 70.66, votes1: { lula: 261749, bolsonaro: 581306 }, votes2: { lula: 262904, bolsonaro: 633236 } },
  { uf: "RR", lula1: 23.05, bolsonaro1: 69.57, lula2: 23.92, bolsonaro2: 76.08, votes1: { lula: 68760, bolsonaro: 207587 }, votes2: { lula: 67128, bolsonaro: 213518 } },
  { uf: "RS", lula1: 42.28, bolsonaro1: 48.89, lula2: 43.65, bolsonaro2: 56.35, votes1: { lula: 2806672, bolsonaro: 3245023 }, votes2: { lula: 2891851, bolsonaro: 3733185 } },
  { uf: "SC", lula1: 29.54, bolsonaro1: 62.21, lula2: 30.73, bolsonaro2: 69.27, votes1: { lula: 1279216, bolsonaro: 2694406 }, votes2: { lula: 1351918, bolsonaro: 3047630 } },
  { uf: "SE", lula1: 63.82, bolsonaro1: 29.16, lula2: 67.21, bolsonaro2: 32.79, votes1: { lula: 828716, bolsonaro: 378610 }, votes2: { lula: 862951, bolsonaro: 421086 } },
  { uf: "SP", lula1: 40.89, bolsonaro1: 47.71, lula2: 44.76, bolsonaro2: 55.24, votes1: { lula: 10490032, bolsonaro: 12239989 }, votes2: { lula: 11519882, bolsonaro: 14216587 } },
  { uf: "TO", lula1: 50.4, bolsonaro1: 44.0, lula2: 51.36, bolsonaro2: 48.64, votes1: { lula: 434303, bolsonaro: 379194 }, votes2: { lula: 434593, bolsonaro: 411654 } },
];

export const ELECTION_2022: Record<string, Election2022Uf> = Object.fromEntries(
  ROWS.map((r) => [r.uf, r]),
);

export const ELECTION_2022_UF_LIST = ROWS.map((r) => r.uf);

export function election2022Of(uf: string): Election2022Uf | undefined {
  return ELECTION_2022[uf];
}

/** Margem 2º: Bolsonaro - Lula (pp). Positivo = Bolsonaro. */
export function gap2t(row: Election2022Uf): number {
  return row.bolsonaro2 - row.lula2;
}

export function leader2t(row: Election2022Uf): "Lula" | "Bolsonaro" {
  return row.lula2 >= row.bolsonaro2 ? "Lula" : "Bolsonaro";
}

export function gap1t(row: Election2022Uf): number {
  return row.bolsonaro1 - row.lula1;
}

export function leader1t(row: Election2022Uf): "Lula" | "Bolsonaro" {
  return row.lula1 >= row.bolsonaro1 ? "Lula" : "Bolsonaro";
}

/** Soma dos votos 2º nas 27 UFs (sem ZZ). */
export function votes2tNationalUfs(): { lula: number; bolsonaro: number; shareLula: number } {
  let l = 0;
  let b = 0;
  for (const row of ROWS) {
    l += row.votes2.lula;
    b += row.votes2.bolsonaro;
  }
  return { lula: l, bolsonaro: b, shareLula: (100 * l) / (l + b) };
}
