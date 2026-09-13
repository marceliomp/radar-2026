import { UF_ORDER } from "../data/candidates.ts";

export const SITE = "https://brasilradar.com.br";
export const UF_STORAGE_KEY = "radar2026:uf";
export const UF_CHIP_CODES = ["SP", "MG", "RJ", "BA", "RS", "SC"] as const;

const UF_SET = new Set(UF_ORDER);

export function parseUfCode(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const code = raw.trim().toUpperCase();
  return UF_SET.has(code) ? code : undefined;
}

export function readStoredUf(): string | undefined {
  try {
    return parseUfCode(sessionStorage.getItem(UF_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function writeStoredUf(uf: string): void {
  const code = parseUfCode(uf);
  if (!code) return;
  try {
    sessionStorage.setItem(UF_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

export function canonicalSearch(parts: {
  uf?: string;
  cargo?: string;
  lang?: string;
}): string {
  const q = new URLSearchParams();
  if (parts.uf) q.set("uf", parts.uf);
  if (parts.cargo) q.set("cargo", parts.cargo);
  if (parts.lang === "en") q.set("lang", "en");
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export function canonicalUrl(
  pathname: string,
  parts: { uf?: string; cargo?: string; lang?: string } = {},
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE}${path === "" ? "/" : path}${canonicalSearch(parts)}`;
}

export function locationUrl(
  pathname: string,
  search: Record<string, unknown>,
): string {
  const q = new URLSearchParams();
  const keys = ["uf", "cargo", "c", "hl", "asOf", "lang"];
  for (const key of keys) {
    const value = search[key];
    if (value == null || value === "") continue;
    q.set(key, String(value));
  }
  const qs = q.toString();
  return `${SITE}${pathname}${qs ? `?${qs}` : ""}`;
}

export type SitemapEntry = { loc: string; changefreq: string; priority: string };

export function sitemapEntries(): SitemapEntry[] {
  const rows: SitemapEntry[] = [
    { loc: `${SITE}/`, changefreq: "hourly", priority: "1.0" },
    { loc: `${SITE}/lab`, changefreq: "daily", priority: "0.6" },
  ];
  for (const uf of UF_ORDER) {
    for (const cargo of ["governador", "senador"] as const) {
      rows.push({
        loc: `${SITE}/candidatos?uf=${uf}&cargo=${cargo}`,
        changefreq: "daily",
        priority: "0.8",
      });
    }
  }
  return rows;
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderSitemapXml(): string {
  const body = sitemapEntries()
    .map(
      (row) =>
        `  <url><loc>${xmlEscape(row.loc)}</loc><changefreq>${row.changefreq}</changefreq><priority>${row.priority}</priority></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
