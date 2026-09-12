import { polls } from "@/data/polls";
import { CANDIDATES } from "@/data/candidates";
import { pollsFor } from "@/data/race-polls";
import { extraVarCached, publicEngineConfig } from "@/lib/forecast/extra-var";
import { runForecast, todayAsOf } from "@/lib/forecast/engine";
import { fmtPct, fmtProb } from "@/lib/format";
import { DEFAULT_HALF_LIFE, parseHalfLifeParam } from "@/lib/half-life";
import { parseAsOfParam } from "@/lib/as-of";
import { messages, type Locale } from "@/lib/i18n";
import { parseLocale } from "@/lib/i18n/locale";
import { canonicalUrl, parseUfCode } from "@/lib/site";
import type { RaceCargo } from "@/features/races/race-types";

export type PageHead = {
  title: string;
  description: string;
  url: string;
  locale: Locale;
};

function localeOf(search: Record<string, unknown>): Locale {
  return parseLocale(search.lang) ?? "pt";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function raceLeaderLine(
  uf: string,
  cargo: RaceCargo,
  locale: Locale,
): string | undefined {
  const office = cargo === "senador" ? "senator" : "governor";
  const rows = pollsFor(office, uf);
  if (!rows.length) return undefined;
  const latest = [...rows].sort((a, b) => {
    const d = (b.date || b.fieldEnd).localeCompare(a.date || a.fieldEnd);
    return d !== 0 ? d : b.fieldEnd.localeCompare(a.fieldEnd);
  })[0];
  if (!latest) return undefined;
  const ranked = Object.entries(latest.firstRound)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return undefined;
  const [slug, pct] = ranked[0];
  const person =
    CANDIDATES.find((c) => c.uf === uf && c.office === office && c.slug === slug)
      ?.name ?? slug;
  const house = latest.institute.split("/")[0] ?? latest.institute;
  return `${firstName(person)} ${fmtPct(pct, 0, locale).replace("%", "")}% (${house})`;
}

export function homeHead(search: Record<string, unknown>): PageHead {
  const locale = localeOf(search);
  const copy = messages(locale);
  const asOf = parseAsOfParam(search.asOf) ?? todayAsOf();
  const hl = parseHalfLifeParam(search.hl) ?? DEFAULT_HALF_LIFE;
  const extraVarPp = extraVarCached(publicEngineConfig(asOf, hl));
  const forecast = runForecast(polls, publicEngineConfig(asOf, hl, extraVarPp));
  const pLula = fmtProb(forecast.probs.lulaWinsElection, 1, locale);
  const title = copy.meta.homeTitle(pLula);
  const description = copy.meta.homeDescription(pLula);
  return {
    title,
    description,
    url: canonicalUrl("/", { lang: locale === "en" ? "en" : undefined }),
    locale,
  };
}

export function labHead(search: Record<string, unknown>): PageHead {
  const locale = localeOf(search);
  const copy = messages(locale);
  return {
    title: copy.meta.labTitle,
    description: copy.meta.labDescription,
    url: canonicalUrl("/lab", { lang: locale === "en" ? "en" : undefined }),
    locale,
  };
}

export function candidatosHead(search: Record<string, unknown>): PageHead {
  const locale = localeOf(search);
  const copy = messages(locale);
  const uf = parseUfCode(search.uf) ?? "";
  const cargo: RaceCargo =
    search.cargo === "senador" || search.cargo === "senator"
      ? "senador"
      : "governador";
  const officeLabel = cargo === "senador" ? copy.race.senator : copy.race.governor;
  const leader = uf ? raceLeaderLine(uf, cargo, locale) : undefined;
  const title = uf
    ? copy.meta.raceTitle(officeLabel, uf, leader)
    : copy.meta.racePickTitle(officeLabel);
  const description = uf
    ? copy.meta.raceDescription(officeLabel, uf)
    : copy.meta.racePickDescription;
  return {
    title,
    description,
    url: canonicalUrl("/candidatos", {
      uf: uf || undefined,
      cargo: uf ? cargo : undefined,
      lang: locale === "en" ? "en" : undefined,
    }),
    locale,
  };
}

const OG_IMAGE = "https://brasilradar.com.br/og.jpg";

export function headTags(page: PageHead) {
  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
      { name: "twitter:image", content: OG_IMAGE },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: page.url },
      { property: "og:site_name", content: "Radar 2026" },
      { property: "og:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: page.url }],
  };
}
