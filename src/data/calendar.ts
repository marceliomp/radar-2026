export type CalendarItem = {
  id: string;
  kind: "saiu" | "campo" | "previsto" | "fato";
  date: string;
  title: string;
  detail: string;
  institute?: string;
};
