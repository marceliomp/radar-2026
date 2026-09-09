export type Locale = "pt" | "en";

export const LOCALES: readonly Locale[] = ["pt", "en"];
export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_KEY = "radar2026:lang";

export function parseLocale(raw: unknown): Locale | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "en" || v === "en-us" || v === "en-gb" || v === "en_us") return "en";
  if (v === "pt" || v === "pt-br" || v === "pt-pt" || v === "pt_br") return "pt";
  return undefined;
}

export function localeTag(locale: Locale): string {
  return locale === "en" ? "en-US" : "pt-BR";
}

export function localeHtml(locale: Locale): string {
  return locale === "en" ? "en" : "pt-BR";
}

export function localeOg(locale: Locale): string {
  return locale === "en" ? "en_US" : "pt_BR";
}

export function readStoredLocale(): Locale | undefined {
  try {
    return parseLocale(localStorage.getItem(LOCALE_KEY));
  } catch {
    return undefined;
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export type RadarSearchKeep = {
  asOf?: string;
  hl?: number;
  lang?: Locale;
};

/** Keep asOf, period and language when hopping between routes. */
export function keepRadarSearch(prev: Record<string, unknown>): RadarSearchKeep {
  const out: RadarSearchKeep = {};
  if (typeof prev.asOf === "string" && prev.asOf) out.asOf = prev.asOf;
  if (typeof prev.hl === "number" && Number.isFinite(prev.hl)) out.hl = prev.hl;
  else if (typeof prev.hl === "string" && prev.hl.trim()) {
    const n = Number(prev.hl);
    if (Number.isFinite(n)) out.hl = n;
  }
  const lang = parseLocale(prev.lang);
  if (lang) out.lang = lang;
  return out;
}

export function parseLangSearch(search: Record<string, unknown>): {
  lang?: Locale;
} {
  const lang = parseLocale(search.lang);
  if (!lang) return {};
  return { lang };
}
