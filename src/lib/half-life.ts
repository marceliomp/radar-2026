import { startTransition } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { todayAsOf } from "@/lib/forecast/engine";
import { clampHalfLife, yearToDateDays } from "@/lib/period";

export {
  clampHalfLife,
  HL_MAX,
  HL_MIN,
  YEAR_START,
  yearToDateDays,
} from "@/lib/period";

export const DEFAULT_HALF_LIFE = yearToDateDays(todayAsOf());

export function parseHalfLifeParam(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clampHalfLife(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return clampHalfLife(n);
  }
  return undefined;
}

export function parseHalfLifeSearch(search: Record<string, unknown>): {
  hl?: number;
} {
  const hl = parseHalfLifeParam(search.hl ?? search.halfLife);
  if (hl == null || hl === DEFAULT_HALF_LIFE) return {};
  return { hl };
}

export function useHalfLife(): [number, (next: number) => void] {
  const search = useSearch({ strict: false }) as {
    hl?: number | string;
    halfLife?: number | string;
  };
  const navigate = useNavigate();
  const halfLife =
    parseHalfLifeParam(search.hl ?? search.halfLife) ?? DEFAULT_HALF_LIFE;

  const setHalfLife = (raw: number) => {
    const next = clampHalfLife(raw);
    const go = navigate as unknown as (opts: {
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
      replace: boolean;
    }) => void;
    startTransition(() => {
      go({
        search: (prev) => {
          const merged = { ...prev };
          delete merged.halfLife;
          if (next === DEFAULT_HALF_LIFE) delete merged.hl;
          else merged.hl = next;
          return merged;
        },
        replace: true,
      });
    });
  };

  return [halfLife, setHalfLife];
}
