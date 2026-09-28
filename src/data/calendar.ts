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
    id: "quaest-ufs-23",
    kind: "saiu",
    date: "2026-09-23",
    title: "Quaest/Globo: presidente em MG, RJ, PE, CE, DF",
    detail:
      "Campo 19–22/09. MG 35×30 / 2T 40×40 ±3 n=1506 BR-07664. RJ 30×37 / 2T 36×44 ±3 n=1302 RJ-04982. PE 54×21 / 2T 58×25 ±3 n=1302. CE 55×23 ±3 n=900 BR-03184 (sem 2T). DF 32×33 / 2T 38×49 ±3 n=1104 DF-02596. SP e TO presidente ainda sem matéria G1 no ingest da noite.",
    institute: "Quaest",
  },
];
