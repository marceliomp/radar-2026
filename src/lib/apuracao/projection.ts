import type { CountResult } from "./tse.ts";

/**
 * Projeção ao vivo do 2º turno presidencial.
 *
 * O TSE apura Sul e Sudeste antes do Nordeste, então o placar parcial
 * engana. A projeção compara cada UF com ela mesma no 1º turno (a virada,
 * em pontos de fatia Flávio / (Flávio + Lula)) e aplica essa virada ao
 * que falta em cada UF. UF sem apuração herda a virada média das UFs já
 * apuradas, puxada para a virada da previsão enquanto há pouco voto.
 *
 * shortcut: a ordem dentro da UF (capital antes do interior) não entra;
 * a incerteza é larga até ~50% apurado para cobrir isso.
 */

/** Votos do 1º turno numa UF. `validVotes` pesa o que a UF ainda vai votar. */
export type FirstRoundUf = { flavio: number; lula: number; validVotes: number };

/** Previsão publicada antes da apuração: fatia de Flávio (0-1) e chance (0-1). */
export type RunoffPrior = { flavioShare: number; flavioChance: number };

export type RunoffProjection = {
  /** Fatia projetada de Flávio nos votos válidos dos dois, 0-1. */
  flavioShare: number;
  /** Desvio da fatia projetada, 0-1. Zero com tudo apurado. */
  sd: number;
  /** Chance de Flávio vencer, 0-1. */
  flavioChance: number;
  /** Parte do voto esperado já apurado, 0-1. */
  counted: number;
  /** Virada nacional estimada contra o 1º turno, em fatia (0,01 = 1 ponto). */
  swing: number;
};

export const FLAVIO_NUMBER = "22";
export const LULA_NUMBER = "13";

/** Peso da previsão na virada nacional, em fração do voto total. */
const PRIOR_WEIGHT = 0.05;
/** Peso da virada nacional dentro de cada UF, em fração do voto da UF. */
const UF_PRIOR_WEIGHT = 0.2;
const SD_FALLBACK = 0.02;

function normCdf(z: number): number {
  // Abramowitz-Stegun 7.1.26, erro < 1e-7.
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

function normInv(p: number): number {
  // Bisseção basta: roda uma vez por atualização.
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (normCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Desvio da previsão que reproduz a chance publicada com 0% apurado. */
export function priorSd(prior: RunoffPrior): number {
  const p = Math.min(Math.max(prior.flavioChance, 0.001), 0.999);
  const z = normInv(p);
  const gap = prior.flavioShare - 0.5;
  if (Math.abs(z) < 0.05 || gap === 0 || Math.sign(z) !== Math.sign(gap)) return SD_FALLBACK;
  return Math.min(Math.max(gap / z, 0.005), 0.08);
}

type Counted = { flavio: number; lula: number; frac: number };

function countedPair(row: CountResult | undefined): Counted | null {
  if (!row || row.status !== "ok") return null;
  const votes = (n: string) => row.candidates.find((c) => c.number === n)?.votes ?? 0;
  const flavio = votes(FLAVIO_NUMBER);
  const lula = votes(LULA_NUMBER);
  if (flavio + lula === 0) return null;
  const frac =
    row.sectionsTotal > 0
      ? row.sectionsCounted / row.sectionsTotal
      : Number(row.pctApuradoExact.replace(",", ".")) / 100;
  return { flavio, lula, frac: Math.min(Math.max(frac || 0, 0), 1) };
}

/** `byUf` é o mesmo mapa da página (chave = UF; `BR` é ignorado). Null antes do primeiro voto. */
export function projectRunoff(
  byUf: Record<string, CountResult>,
  base: Record<string, FirstRoundUf>,
  prior: RunoffPrior,
): RunoffProjection | null {
  const ufs = Object.keys(base);
  const share1 = (b: FirstRoundUf) => b.flavio / (b.flavio + b.lula);
  const totalW = ufs.reduce((s, uf) => s + base[uf].validVotes, 0);
  const nat1 = ufs.reduce((s, uf) => s + share1(base[uf]) * base[uf].validVotes, 0) / totalW;

  const counted = new Map<string, Counted>();
  for (const uf of ufs) {
    const pair = countedPair(byUf[uf]);
    if (pair) counted.set(uf, pair);
  }
  if (counted.size === 0) return null;

  // Comparecimento do 2º contra o 1º, medido onde já há voto.
  let seen = 0;
  let expected = 0;
  let swingVotes = 0;
  for (const [uf, c] of counted) {
    const two = c.flavio + c.lula;
    seen += two;
    expected += c.frac * base[uf].validVotes;
    swingVotes += two * (c.flavio / two - share1(base[uf]));
  }
  const turnout = expected > 0 ? Math.min(Math.max(seen / expected, 0.7), 1.3) : 1;
  const k0 = PRIOR_WEIGHT * totalW;
  const swing = (k0 * (prior.flavioShare - nat1) + swingVotes) / (k0 + seen);

  let flavio = 0;
  let total = 0;
  let remaining = 0;
  for (const uf of ufs) {
    const b = base[uf];
    const c = counted.get(uf);
    const two = c ? c.flavio + c.lula : 0;
    // Com 10% das seções a própria UF já diz quanto voto vem; antes, usa o 1º turno.
    const full = c && c.frac >= 0.1 ? two / c.frac : Math.max(two, b.validVotes * turnout);
    const rest = full - two;
    const kUf = UF_PRIOR_WEIGHT * b.validVotes;
    const ufSwing = c ? (two * (c.flavio / two - share1(b)) + kUf * swing) / (two + kUf) : swing;
    const restShare = Math.min(Math.max(share1(b) + ufSwing, 0), 1);
    flavio += (c?.flavio ?? 0) + rest * restShare;
    total += full;
    remaining += rest;
  }

  const share = flavio / total;
  const left = total > 0 ? remaining / total : 0;
  const sd = priorSd(prior) * Math.sqrt(left);
  const flavioChance = sd > 0 ? normCdf((share - 0.5) / sd) : share > 0.5 ? 1 : share < 0.5 ? 0 : 0.5;
  return { flavioShare: share, sd, flavioChance, counted: 1 - left, swing };
}
