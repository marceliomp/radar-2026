export type RoundKey = 1 | 2;

export type MapRoundInput = {
  n: number;
  n2: number;
  first: { lula: number; flavio: number; se: number };
  second: { lula: number; flavio: number; se: number } | null;
  pFlavio1: number;
  pFlavio2: number;
};

export type MapRoundView = {
  lula: number;
  flavio: number;
  se: number;
  n: number;
  polled: boolean;
  implied: boolean;
  pFlavio: number | null;
};

/** 2º no mapa: número real se o instituto perguntou; senão two-way do 1º. Sem inventar 2º no motor. */
export function mapRoundView(f: MapRoundInput, round: RoundKey): MapRoundView {
  if (round === 1) {
    return {
      lula: f.first.lula,
      flavio: f.first.flavio,
      se: f.first.se,
      n: f.n,
      polled: f.n > 0,
      implied: false,
      pFlavio: f.pFlavio1,
    };
  }
  if (f.second && f.n2 > 0) {
    return {
      lula: f.second.lula,
      flavio: f.second.flavio,
      se: f.second.se,
      n: f.n2,
      polled: true,
      implied: false,
      pFlavio: f.pFlavio2,
    };
  }
  if (f.n <= 0) {
    return {
      lula: 0,
      flavio: 0,
      se: 0,
      n: 0,
      polled: false,
      implied: false,
      pFlavio: null,
    };
  }
  const tot = Math.max(f.first.lula + f.first.flavio, 1);
  return {
    lula: (f.first.lula / tot) * 100,
    flavio: (f.first.flavio / tot) * 100,
    se: f.first.se,
    n: f.n,
    polled: true,
    implied: true,
    pFlavio: f.pFlavio1,
  };
}

/** Barra do dossie: 50 e 17 ocupam 50% e 17%. O resto ate 100% vai em branco. */
export function shareBarPct(lula: number, flavio: number): {
  lula: number;
  flavio: number;
  rest: number;
} {
  const a = Number.isFinite(lula) && lula > 0 ? lula : 0;
  const b = Number.isFinite(flavio) && flavio > 0 ? flavio : 0;
  const sum = a + b;
  if (sum <= 0) return { lula: 0, flavio: 0, rest: 100 };
  if (sum > 100) return { lula: (a / sum) * 100, flavio: (b / sum) * 100, rest: 0 };
  return { lula: a, flavio: b, rest: 100 - sum };
}
