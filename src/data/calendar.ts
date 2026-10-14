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
    id: "quaest-nacional-14",
    kind: "saiu",
    date: "2026-10-14",
    title: "Quaest nacional 2º turno (Globo/O Globo)",
    detail:
      "2T totais: Flávio 46 × Lula 44 (empate técnico ±2). n=2.154 presencial campo 10–13/10. TSE BR-08729/2026. Indecisos 1%, branco/nulo/não vai 9%.",
    institute: "Quaest",
  },
  // ... resto do calendário original omitido por tamanho; restaurar full se necessário
];
