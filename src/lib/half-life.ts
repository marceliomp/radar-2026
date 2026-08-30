import { useNavigate, useSearch } from "@tanstack/react-router";

export const HL_MIN = 5;
export const HL_MAX = 40;
export const DEFAULT_HALF_LIFE = 14;

export function clampHalfLife(n: number): number {
  return Math.round(Math.min(HL_MAX, Math.max(HL_MIN, n)));
}

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
  };

  return [halfLife, setHalfLife];
}
