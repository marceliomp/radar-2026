import { UF_META } from "@/data/calendar";
import { ELECTION_2022, gap2t, leader2t } from "@/data/election-2022";
import { fmtNum, fmtPct } from "@/lib/format";
import { keepRadarSearch, parseLocale, type Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";

export { keepRadarSearch };

export function leadLine(leader: "Lula" | "Bolsonaro", gap: number, locale: Locale = "pt"): string {
  const pp = fmtNum(Math.abs(gap), 2, locale);
  return messages(locale).map.leadLine(leader, pp);
}

export function tipCopy2022(uf: string, locale: Locale = "pt"): string {
  const urn = ELECTION_2022[uf];
  if (!urn) return uf;
  const name = UF_META[uf]?.name ?? uf;
  return messages(locale).map.tip2022(
    name,
    fmtPct(urn.lula1, 1, locale),
    fmtPct(urn.bolsonaro1, 1, locale),
    fmtPct(urn.lula2, 1, locale),
    fmtPct(urn.bolsonaro2, 1, locale),
    leadLine(leader2t(urn), gap2t(urn), locale),
  );
}

export function localeFromPrev(prev: Record<string, unknown>): Locale {
  return parseLocale(prev.lang) ?? "pt";
}
