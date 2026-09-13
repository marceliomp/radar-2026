import raw from "./chance-history.json";

/** Published hero chance for one calendar day (percent, one decimal). */
export type ChanceHistoryPoint = {
  date: string;
  lula: number;
  flavio: number;
  source: string;
  commit?: string;
};

export type ChanceHistoryFile = {
  version: number;
  windowDays: number;
  points: ChanceHistoryPoint[];
};

export const chanceHistory = raw as ChanceHistoryFile;
