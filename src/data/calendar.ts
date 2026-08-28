export type CalendarItem = {
  id: string;
  kind: "saiu" | "campo" | "previsto" | "fato";
  date: string;
  title: string;
  detail: string;
  institute?: string;
};

/** Agenda pública — campo e divulgação esperados. */
export const CALENDAR: CalendarItem[] = [
  {
    id: "quaest-ba-27",
    kind: "saiu",
    date: "2026-08-27",
    title: "Quaest — Bahia presidente",
    detail:
      "1º Lula 50 × Flávio 17. n=900 · ±3 · 23–26/08. Governo aprovado 59%.",
    institute: "Quaest/TV Bahia",
  },
  {
    id: "gerp-26",
    kind: "saiu",
    date: "2026-08-26",
    title: "Gerp nacional",
    detail:
      "1º 38×37 Flávio · 2º 47×42 (fora da margem). n=2.400 · telefone. vs 11/08: 2º era 45×43.",
    institute: "Gerp",
  },
  {
    id: "poderdata-27",
    kind: "saiu",
    date: "2026-08-27",
    title: "PoderData/Aya nacional",
    detail:
      "1º 38×35 (empate técnico, menor gap desde maio) · 2º 45×44. n=2.400 · ±2. vs 13/08: Lula −3 no 1º.",
    institute: "PoderData/Aya",
  },
  {
    id: "quaest-sudeste-25",
    kind: "saiu",
    date: "2026-08-25",
    title: "Quaest/Globo — SP, MG, RJ",
    detail:
      "Empate técnico nos 3 maiores colégios. SP 30×29 · MG 31×30 · RJ 31×29 (Flávio numérico). Indecisos altos (até 17% em MG).",
    institute: "Quaest",
  },
  {
    id: "rtbd-rs-25",
    kind: "saiu",
    date: "2026-08-25",
    title: "Real Time — Rio Grande do Sul",
    detail:
      "1º Flávio 40 × Lula 39 (empate) · 2º 52×42. n=1.600 · ±2 · TSE BR-02823/2026. Marçal 5%.",
    institute: "Real Time Big Data",
  },
  {
    id: "quaest-estados-24",
    kind: "saiu",
    date: "2026-08-24",
    title: "Quaest/Globo — 6 estados",
    detail:
      "Sul: SC 45×20 · PR 41×23 · RS 34×28 (Flávio). Nordeste: MA 58×20 · RN 54×20 · AL 44×29 (Lula). Campo 20–23/08. ±3.",
    institute: "Quaest",
  },
  {
    id: "nexus-prox",
    kind: "saiu",
    date: "2026-08-24",
    title: "Nexus/BTG nacional",
    detail:
      "1º 41×37 · 2º 46×45. Empate técnico. Flávio +1 nos dois turnos vs 17/08. Telefone.",
    institute: "Nexus/BTG",
  },
  {
    id: "datafolha-21",
    kind: "saiu",
    date: "2026-08-21",
    title: "Datafolha nacional (Globo)",
    detail:
      "1º 39×33 · 2º 47×43 (limite do empate técnico). vs jul: Flávio +1 no 1º, 2º estável. Marçal 2%. Peso alto no agregador.",
    institute: "Datafolha",
  },
  {
    id: "verita-21",
    kind: "saiu",
    date: "2026-08-21",
    title: "Veritá nacional",
    detail:
      "1º 39,3×39,1 (Marçal 5,2%) · 2º Flávio 47,3 × Lula 42,0. n=3.840 · ±2. Casa historicamente mais alta em Flávio — cruzar com Datafolha.",
    institute: "Veritá",
  },
  {
    id: "rtbd-pr-18",
    kind: "saiu",
    date: "2026-08-18",
    title: "Real Time Big Data — Paraná",
    detail: "1º 44×31 Flávio · 2º 52×35. Rejeição Lula 56% / Flávio 38%. Gov 35×62.",
    institute: "Real Time Big Data",
  },
  {
    id: "nexus-17",
    kind: "saiu",
    date: "2026-08-17",
    title: "Nexus/BTG nacional",
    detail: "1º 41×36 · 2º 47×44. Empate técnico no 2º.",
    institute: "Nexus/BTG",
  },
  {
    id: "quaest-nacional-prox",
    kind: "previsto",
    date: "2026-08-28",
    title: "Quaest nacional — próxima rodada",
    detail: "Série Globo costuma fechar a semana. Estados já saíram; nacional ainda não.",
    institute: "Quaest",
  },
];

/** Eleitorado aproximado (mi) — TSE 2024/2026. */
export const UF_META: Record<string, { name: string; electorateM: number }> = {
  SP: { name: "São Paulo", electorateM: 34.7 },
  MG: { name: "Minas Gerais", electorateM: 16.3 },
  RJ: { name: "Rio de Janeiro", electorateM: 12.8 },
  BA: { name: "Bahia", electorateM: 11.2 },
  RS: { name: "Rio Grande do Sul", electorateM: 8.5 },
  PR: { name: "Paraná", electorateM: 8.5 },
  PE: { name: "Pernambuco", electorateM: 7.0 },
  CE: { name: "Ceará", electorateM: 6.8 },
  PA: { name: "Pará", electorateM: 6.2 },
  SC: { name: "Santa Catarina", electorateM: 5.5 },
  GO: { name: "Goiás", electorateM: 5.0 },
  MA: { name: "Maranhão", electorateM: 5.0 },
  PB: { name: "Paraíba", electorateM: 3.1 },
  ES: { name: "Espírito Santo", electorateM: 2.9 },
  AM: { name: "Amazonas", electorateM: 2.6 },
  RN: { name: "Rio Grande do Norte", electorateM: 2.6 },
  AL: { name: "Alagoas", electorateM: 2.4 },
  PI: { name: "Piauí", electorateM: 2.5 },
  MT: { name: "Mato Grosso", electorateM: 2.5 },
  DF: { name: "Distrito Federal", electorateM: 2.2 },
  MS: { name: "Mato Grosso do Sul", electorateM: 2.0 },
  SE: { name: "Sergipe", electorateM: 1.7 },
  RO: { name: "Rondônia", electorateM: 1.3 },
  TO: { name: "Tocantins", electorateM: 1.1 },
  AC: { name: "Acre", electorateM: 0.6 },
  AP: { name: "Amapá", electorateM: 0.6 },
  RR: { name: "Roraima", electorateM: 0.4 },
};

