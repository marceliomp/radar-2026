/**
 * Peso por acerto histórico no 2º turno (2018 + 2022).
 * Só erro absoluto vs urna. Sem tilt “esquerda/direita”.
 *
 * Urna 2º 2018 (válidos): Bolsonaro 55,13 · Haddad 44,87
 * Urna 2º 2022 (válidos): Lula 50,90 · Bolsonaro 49,10
 */

export type TrackRecord = {
  institute: string;
  /** Erro |poll−urna| no 2º 2014 (Dilma 51,64 × Aécio 48,36). */
  mae2t2014: number | null;
  mae2t2018: number | null;
  mae2t2022: number | null;
  rank2t: number | null;
  note: string;
};

/** Chave canônica = nome após resolveInstitute. */
export const TRACK: Record<string, TrackRecord> = {
  "Paraná Pesquisas": {
    institute: "Paraná Pesquisas",
    mae2t2014: null,
    mae2t2018: 0.9,
    mae2t2022: 0.5,
    rank2t: 1,
    note: "Melhor 2º 2022 (~0,5 pp). 2018 no grupo curto. Sem MAE 2014 no arquivo.",
  },
  Datafolha: {
    institute: "Datafolha",
    mae2t2014: 0.4,
    mae2t2018: 0.2,
    mae2t2022: 1.1,
    rank2t: 2,
    note: "Cravou 2014 (~0,4 pp) e 2018 (~0,2 pp). 2022 dentro da margem (~1,1 pp).",
  },
  "CNT/MDA": {
    institute: "CNT/MDA",
    mae2t2014: null,
    mae2t2018: 1.4,
    mae2t2022: 0.2,
    rank2t: 2,
    note: "MDA cravou o 2º 2022 (~0,2 pp). 2018 um pouco pior.",
  },
  Gerp: {
    institute: "Gerp",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: 1.1,
    rank2t: 2,
    note: "Top do 2º 2022 (~1,1 pp). Sem série 2014/2018 comparável.",
  },
  Quaest: {
    institute: "Quaest",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: 1.1,
    rank2t: 3,
    note: "2º 2022 dentro da margem. Genial/Globo entram como Quaest.",
  },
  Veritá: {
    institute: "Veritá",
    mae2t2014: null,
    mae2t2018: 1.6,
    mae2t2022: 1.9,
    rank2t: 4,
    note: "Erro ~1,6–1,9 pp nos 2º 2018 e 2022. Peso abaixo das casas curtas.",
  },
  Ipec: {
    institute: "Ipec",
    mae2t2014: 1.4,
    mae2t2018: 1.1,
    mae2t2022: 1.4,
    rank2t: null,
    note: "Ibope 2014/2018 + Ipec 2022. Série presencial longa, erro ~1,1–1,4 pp.",
  },
  "Nexus/BTG": {
    institute: "Nexus/BTG",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: null,
    rank2t: null,
    note: "Sem MAE de fechamento 2014/2018/2022 no arquivo. Peso neutro.",
  },
  "Futura/Apex": {
    institute: "Futura/Apex",
    mae2t2014: null,
    mae2t2018: 2.2,
    mae2t2022: 2.5,
    rank2t: null,
    note: "Oscilou no 2º nas eleições com urna no arquivo. Peso baixo.",
  },
  "Meio/Ideia": {
    institute: "Meio/Ideia",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: null,
    rank2t: null,
    note: "Sem rank de fechamento. Neutro.",
  },
  "Real Time Big Data": {
    institute: "Real Time Big Data",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: null,
    rank2t: null,
    note: "Volume estadual 2026. Sem MAE nacional de urna.",
  },
  Palver: {
    institute: "Palver",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: null,
    rank2t: null,
    note: "Online, sem urna 2014/2018/2022. Peso baixo (modo já desconta).",
  },
  "PoderData/Aya": {
    institute: "PoderData/Aya",
    mae2t2014: null,
    mae2t2018: null,
    mae2t2022: null,
    rank2t: null,
    note: "URA/telefone. Sem MAE de 2º 2014/2018/2022.",
  },
};

const FIRST_ALIAS: Record<string, string> = {
  Quaest: "Quaest",
  Genial: "Quaest",
  "Real Time": "Real Time Big Data",
  PoderData: "PoderData/Aya",
  Ideia: "Meio/Ideia",
  Ibope: "Ipec",
  Ipec: "Ipec",
  AtlasIntel: "AtlasIntel",
};

export function resolveInstitute(name: string): string {
  const raw = name.trim();
  if (TRACK[raw]) return raw;
  const first = raw.split("/")[0] ?? raw;
  if (TRACK[first]) return first;
  return FIRST_ALIAS[first] ?? raw;
}

/** 0,3 pp → ~1,45 · 1,1 pp → ~1,18 · 2,5 pp → ~0,82 · sem urna → 0,88 */
export function qualityFromMae(mae: number): number {
  const q = 1.55 / (0.55 + Math.max(mae, 0));
  return Math.min(1.55, Math.max(0.55, q));
}

export function blendedMae(t: TrackRecord): number | null {
  const parts: { mae: number; w: number }[] = [];
  if (t.mae2t2022 != null) parts.push({ mae: t.mae2t2022, w: 0.55 });
  if (t.mae2t2018 != null) parts.push({ mae: t.mae2t2018, w: 0.3 });
  if (t.mae2t2014 != null) parts.push({ mae: t.mae2t2014, w: 0.15 });
  if (!parts.length) return null;
  const w = parts.reduce((s, p) => s + p.w, 0);
  return parts.reduce((s, p) => s + p.mae * p.w, 0) / w;
}

export function trackQuality(institute: string): number {
  const t = TRACK[resolveInstitute(institute)];
  if (!t) return 0.88;
  const mae = blendedMae(t);
  if (mae == null) {
    if (t.institute === "Palver") return 0.72;
    return 0.88;
  }
  return qualityFromMae(mae);
}

export function trackNote(institute: string): string {
  return (
    TRACK[resolveInstitute(institute)]?.note ??
    "Sem urna 2018/2022. Peso neutro 0,88."
  );
}

export const TRACK_RANKING_DISPLAY = (
  [
    "Paraná Pesquisas",
    "CNT/MDA",
    "Datafolha",
    "Gerp",
    "Quaest",
    "Ipec",
    "Veritá",
  ] as const
)
  .map((institute) => {
    const t = TRACK[institute]!;
    const mae = blendedMae(t);
    return {
      institute,
      mae: mae == null ? "n/d" : `${mae.toFixed(2).replace(".", ",")} pp`,
      quality: trackQuality(institute),
    };
  })
  .sort((a, b) => b.quality - a.quality)
  .map((row, i) => ({ ...row, rank: i + 1 }));

export const ELECTION_2022_2T = {
  lula: 50.9,
  bolsonaro: 49.1,
} as const;

/** @deprecated alias: o portal não aplica tilt de lado. */
export const TRACK_2022 = TRACK;

export function trackHouseTilt(_institute: string): {
  lula: number;
  flavio: number;
} {
  return { lula: 0, flavio: 0 };
}

export function blendHouseEffects(
  manual: Record<string, Partial<Record<"lula" | "flavio", number>>>,
  _useTrack: boolean,
): Record<string, Partial<Record<"lula" | "flavio", number>>> {
  return manual;
}
