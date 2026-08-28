/**
 * Historical accuracy priors (2022 2º turno + notes on 1º).
 * Used as multiplicative weight and soft house-effect tilt — not destiny for 2026.
 *
 * Urna 2º 2022 (válidos): Lula 50.90% · Bolsonaro 49.10%
 */

export type TrackRecord = {
  institute: string;
  /** Absolute error on winner share or mean |poll−urna| (pp), last 2T poll 2022. */
  mae2t2022: number | null;
  /** Rank by 2T closeness (lower better); null if unknown / no final poll. */
  rank2t: number | null;
  /**
   * Multiplicative quality from track record.
   * ~1.0 average; higher = more weight in aggregator.
   */
  quality: number;
  /**
   * Soft bias correction for 2026 right-wing candidate (Flávio):
   * positive = institute historically over-read left / under-read right in 1T.
   * Applied as house effect on flavio (subtract from raw → lower flavio if overestimate).
   * Convention matches engine houseEffects: positive = overestimates that cand.
   */
  houseTilt: { lula: number; flavio: number };
  note: string;
};

/** Map by exact institute key used in polls.ts */
export const TRACK_2022: Record<string, TrackRecord> = {
  "Paraná Pesquisas": {
    institute: "Paraná Pesquisas",
    mae2t2022: 0.5,
    rank2t: 1,
    quality: 1.35,
    houseTilt: { lula: 0, flavio: 0 },
    note: "Melhor 2º 2022 (~0,5 pp). Ouro no fechamento.",
  },
  Gerp: {
    institute: "Gerp",
    mae2t2022: 1.1,
    rank2t: 2,
    quality: 1.28,
    // 2022 2T was tight — Gerp often reads closer; mild correction vs “too hot” Flávio online
    houseTilt: { lula: -0.8, flavio: 1.2 },
    note: "Top 2 no 2º 2022 (~1,1 pp). Forte no cenário colado.",
  },
  Datafolha: {
    institute: "Datafolha",
    mae2t2022: 1.1,
    rank2t: 2,
    quality: 1.28,
    // Classic 1T under-read of Bolsonaro base → mild flavio underestimation historically
    houseTilt: { lula: 0.3, flavio: -0.8 },
    note: "Top 2 no 2º 2022. 1º costuma ser mais ‘frio’ na direita.",
  },
  Veritá: {
    institute: "Veritá",
    mae2t2022: 1.9,
    rank2t: 4,
    quality: 1.12,
    houseTilt: { lula: -0.5, flavio: 0.8 },
    note: "~1,9 pp no 2º 2022; às vezes puxa mais à direita.",
  },
  "Genial/Quaest": {
    institute: "Genial/Quaest",
    mae2t2022: 1.1,
    rank2t: 3,
    quality: 1.18,
    houseTilt: { lula: 0.4, flavio: -1.0 },
    note: "2º 2022 dentro da margem; 1º costuma abrir mais gap p/ Lula.",
  },
  "Nexus/BTG": {
    institute: "Nexus/BTG",
    mae2t2022: null,
    rank2t: null,
    quality: 1.1,
    houseTilt: { lula: 0.2, flavio: 0.2 },
    note: "Série BTG/Nexus sólida; sem rank viral 2022 no post.",
  },
  "Futura/Apex": {
    institute: "Futura/Apex",
    mae2t2022: 2.5,
    rank2t: null,
    // 2022 Futura/Modal flertou com Bolsonaro na frente no 2º — quality um pouco abaixo
    quality: 0.95,
    houseTilt: { lula: -0.3, flavio: 0.5 },
    note: "2022: casas Futura/Modal oscilaram no 2º; peso neutro-baixo.",
  },
  "Meio/Ideia": {
    institute: "Meio/Ideia",
    mae2t2022: null,
    rank2t: null,
    quality: 1.0,
    houseTilt: { lula: 0.5, flavio: 0 },
    note: "Sem rank 2º 2022 destacado; peso neutro.",
  },
  "Real Time Big Data": {
    institute: "Real Time Big Data",
    mae2t2022: null,
    rank2t: null,
    quality: 1.0,
    houseTilt: { lula: 0.3, flavio: 0 },
    note: "Peso neutro; bom volume estadual em 2026.",
  },
  Palver: {
    institute: "Palver",
    mae2t2022: null,
    rank2t: null,
    quality: 0.72,
    houseTilt: { lula: 0.8, flavio: 2.0 },
    note: "Online 2026: amostra grande, viés de painel — qualidade ↓.",
  },
  "CNT/MDA": {
    institute: "CNT/MDA",
    mae2t2022: 0.2,
    rank2t: 2,
    quality: 1.22,
    houseTilt: { lula: 0.6, flavio: -0.8 },
    note: "MDA cravou Lula no 2º 2022; 1º subestimou Bolsonaro (~3,5 pp).",
  },
  "PoderData/Aya": {
    institute: "PoderData/Aya",
    mae2t2022: null,
    rank2t: null,
    quality: 0.98,
    houseTilt: { lula: 0.2, flavio: 0.4 },
    note: "Telefone/URA. 2º 2026 costuma medir mais colado.",
  },
  "Ideia (SP)": {
    institute: "Ideia (SP)",
    mae2t2022: null,
    rank2t: null,
    quality: 1.0,
    houseTilt: { lula: 0, flavio: 0 },
    note: "Estadual — fora do nacional.",
  },
};

export const TRACK_RANKING_DISPLAY = [
  {
    rank: 1,
    institute: "Paraná Pesquisas",
    mae: "0,50 pp",
    medal: "🥇",
  },
  {
    rank: 2,
    institute: "Gerp",
    mae: "1,10 pp",
    medal: "🥈",
  },
  {
    rank: 2,
    institute: "Datafolha",
    mae: "1,10 pp",
    medal: "🥈",
  },
  {
    rank: 3,
    institute: "Veritá",
    mae: "1,90 pp",
    medal: "🥉",
  },
] as const;

export const ELECTION_2022_2T = {
  lula: 50.9,
  bolsonaro: 49.1,
} as const;

export function trackQuality(institute: string): number {
  return TRACK_2022[institute]?.quality ?? 0.9;
}

export function trackHouseTilt(institute: string): {
  lula: number;
  flavio: number;
} {
  return TRACK_2022[institute]?.houseTilt ?? { lula: 0, flavio: 0 };
}

export function trackNote(institute: string): string {
  return TRACK_2022[institute]?.note ?? "Sem prior 2022 — qualidade default 0,9.";
}

/** Blend manual house effects with track-record tilts. */
export function blendHouseEffects(
  manual: Record<string, Partial<Record<"lula" | "flavio", number>>>,
  useTrack: boolean,
): Record<string, Partial<Record<"lula" | "flavio", number>>> {
  if (!useTrack) return manual;
  const keys = new Set([
    ...Object.keys(manual),
    ...Object.keys(TRACK_2022),
  ]);
  const out: Record<string, Partial<Record<"lula" | "flavio", number>>> = {};
  for (const k of keys) {
    const m = manual[k] ?? {};
    const t = trackHouseTilt(k);
    // 60% track tilt + 40% manual prior (or full track if no manual)
    const hasManual = k in manual;
    out[k] = {
      lula: hasManual
        ? 0.4 * (m.lula ?? 0) + 0.6 * t.lula
        : t.lula,
      flavio: hasManual
        ? 0.4 * (m.flavio ?? 0) + 0.6 * t.flavio
        : t.flavio,
    };
  }
  return out;
}
