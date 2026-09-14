import { isoDayUtc } from "./format.ts";
import { chanceAxisStart, CHANCE_HISTORY_DAYS } from "./chance-history.ts";

export type ChanceMark = {
  t: number;
  date: string;
  house: string;
  /** Short name drawn on the chart (Datafolha, Quaest, tip day). */
  label: string | null;
};

type PollLike = {
  national?: boolean;
  date: string;
  institute: string;
};

/** Short public house name for chance marks. */
export function shortHouseName(institute: string): string {
  const s = institute.toLowerCase();
  if (s.includes("datafolha")) return "Datafolha";
  if (s.includes("quaest")) return "Quaest";
  if (s.includes("atlas")) return "Atlas";
  if (s.includes("gerp")) return "Gerp";
  if (s.includes("nexus")) return "Nexus";
  if (s.includes("futura") || s.includes("apex")) return "Futura";
  if (s.includes("poder")) return "PoderData";
  if (s.includes("verit")) return "Veritá";
  if (s.includes("vox")) return "Vox";
  if (s.includes("palver")) return "Palver";
  if (s.includes("meio") || s.includes("ideia")) return "Meio";
  if (s.includes("indexa")) return "Indexa";
  if (s.includes("cnt") || s.includes("mda")) return "CNT";
  if (s.includes("real time") || s.includes("rtbd")) return "RTBD";
  return institute.split("/")[0]?.trim() || institute;
}

function dayMonthLabel(iso: string, locale: "pt" | "en"): string {
  const [, month, day] = iso.split("-");
  if (!month || !day) return iso;
  return locale === "en" ? `${month}/${day}` : `${day}/${month}`;
}

/**
 * One mark per national publication day in the chance window.
 * Labels call out Datafolha, Quaest, and the tip day so those houses are visible.
 */
export function nationalChanceMarks(
  polls: PollLike[],
  asOf: string,
  _windowDays = CHANCE_HISTORY_DAYS,
  locale: "pt" | "en" = "pt",
): ChanceMark[] {
  const start = chanceAxisStart(asOf);
  const byDay = new Map<string, string[]>();
  for (const poll of polls) {
    if (!poll.national) continue;
    if (poll.date <= start || poll.date > asOf) continue;
    const house = shortHouseName(poll.institute);
    const list = byDay.get(poll.date) ?? [];
    if (!list.includes(house)) list.push(house);
    byDay.set(poll.date, list);
  }
  const priority = ["Datafolha", "Quaest"];
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, houses]) => {
      const preferred =
        priority.find((name) => houses.includes(name)) ?? houses[0] ?? "";
      const named =
        preferred === "Datafolha" ||
        preferred === "Quaest" ||
        date === asOf;
      return {
        t: isoDayUtc(date),
        date,
        house: preferred,
        label: named ? `${preferred} ${dayMonthLabel(date, locale)}` : null,
      };
    });
}
