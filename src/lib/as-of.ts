import { useNavigate, useSearch } from "@tanstack/react-router";
import { todayAsOf } from "@/lib/forecast/engine";
import { parseHalfLifeSearch } from "@/lib/half-life";
import { parseLangSearch } from "@/lib/i18n/locale";

export const ASOF_MIN = "2026-01-01";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseAsOfParam(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!ISO.test(v)) return undefined;
  return clampAsOf(v);
}

export function clampAsOf(iso: string): string {
  const max = todayAsOf();
  if (iso < ASOF_MIN) return ASOF_MIN;
  if (iso > max) return max;
  return iso;
}

export function parseAsOfSearch(search: Record<string, unknown>): {
  asOf?: string;
  hl?: number;
  lang?: "pt" | "en";
} {
  const asOf = parseAsOfParam(search.asOf);
  const hl = parseHalfLifeSearch(search);
  const lang = parseLangSearch(search);
  if (!asOf || asOf === todayAsOf()) return { ...hl, ...lang };
  return { asOf, ...hl, ...lang };
}

/** Recorte: so o que ja estava em campo e publicado ate a data. */
export function pollKnownBy(
  poll: { date: string; fieldEnd: string },
  asOf: string,
): boolean {
  return poll.date <= asOf && poll.fieldEnd <= asOf;
}

export function useAsOf(): [string, (next: string) => void] {
  const search = useSearch({ strict: false }) as { asOf?: string };
  const navigate = useNavigate();
  const asOf = parseAsOfParam(search.asOf) ?? todayAsOf();

  const setAsOf = (raw: string) => {
    const next = clampAsOf(raw);
    const go = navigate as unknown as (opts: {
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
      replace: boolean;
    }) => void;
    go({
      search: (prev) => {
        const merged = { ...prev };
        if (next === todayAsOf()) delete merged.asOf;
        else merged.asOf = next;
        return merged;
      },
      replace: true,
    });
  };

  return [asOf, setAsOf];
}
