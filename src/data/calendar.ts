export type CalendarItem = {
  id: string;
  kind: "saiu" | "campo" | "previsto" | "fato";
  date: string;
  title: string;
  detail: string;
  institute?: string;
};

/** Agenda pública: campo e divulgação esperados. */
export const CALENDAR: CalendarItem[] = [
  {
    id: "datafolha-ufs-02",
    kind: "saiu",
    date: "2026-10-02",
    title: "Datafolha/Globo: presidente em SP, MG, RJ, PE, DF",
    detail:
      "Divulgação 02/10 à tarde. SP 38×39 / 2T 45×48 ±2 n=1610 campo 28–30/09 SP-01367 e BR-02676. MG 42×36 / 2T 48×44 ±3 n=1204 BR-00950. RJ 38×45 / 2T 42×51 ±3 n=1204 RJ-02070 e BR-01272. PE 61×25 / 2T 65×29 ±3 n=1204 PE-06822 e BR-02676. DF 35×44 / 2T 39×51 ±3 n=910 DF-00905 e BR-09530. Sem nacional novo hoje.",
    institute: "Datafolha",
  },
  {
    id: "quaest-datafolha-sabado",
    kind: "previsto",
    date: "2026-10-03",
    title: "Última nacional antes do 1º turno",
    detail:
      "Quaest campo 2–3/10, n=3.702 ±2, TSE BR-02197/2026, divulgação sábado. Datafolha ouve 4.006 no sábado, presencial ±2. Não é número.",
    institute: "Quaest/Datafolha",
  },
  {
    id: "quaest-ufs-23",
    kind: "saiu",
    date: "2026-09-23",
    title: "Quaest/Globo: presidente em MG, RJ, PE, CE, DF",
    detail:
      "Campo 19–22/09. Substituído em SP/MG/RJ/PE/DF pelo Datafolha 02/10. CE segue 55×23 ±3 n=900 BR-03184.",
    institute: "Quaest",
  },
  {
    id: "atlas-nacional-23",
    kind: "saiu",
    date: "2026-09-23",
    title: "AtlasIntel/Bloomberg nacional",
    detail:
      "Já no polls.json (manhã). 1º 45,8×43,4 · 2º 47,7×47,4. n≈5.015 ±1 campo 17–22/09. TSE BR-04739/2026.",
    institute: "AtlasIntel",
  },
  {
    id: "quaest-nacional-28",
    kind: "saiu",
    date: "2026-09-28",
    title: "Quaest nacional (Globo/O Globo)",
    detail:
      "1º Lula 39 × Flávio 34. 2º 42×42. n=2.004 ±2 campo 24–27/09. Última nacional da casa até a de sábado.",
    institute: "Quaest",
  },
];

/** Eleitorado aproximado (mi). TSE 2024/2026. */
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
