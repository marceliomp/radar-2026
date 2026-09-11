import { startTransition, useCallback, useEffect, useSyncExternalStore } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { todayAsOf } from "@/lib/forecast/engine";
import { clampHalfLife, yearToDateDays } from "@/lib/period";
import { trackRadar } from "@/lib/track";

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

type LiveSnap = { days: number | null; dragging: boolean };

const SERVER_SNAP: LiveSnap = { days: null, dragging: false };
let snap: LiveSnap = SERVER_SNAP;
const listeners = new Set<() => void>();
let pending: number | null = null;
let timer = 0;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnap(): LiveSnap {
  return snap;
}

function setSnap(next: LiveSnap) {
  if (next.days === snap.days && next.dragging === snap.dragging) return;
  snap = next;
  emit();
}

function flushPending() {
  timer = 0;
  if (pending == null) return;
  const days = pending;
  pending = null;
  setSnap({ days, dragging: true });
}

/** Live days while the period slider moves. URL stays put until commit. */
export function setLiveHalfLife(raw: number) {
  const next = clampHalfLife(raw);
  const first = !snap.dragging;
  if (first) {
    pending = null;
    if (timer && typeof window !== "undefined") {
      window.clearTimeout(timer);
      timer = 0;
    }
    setSnap({ days: next, dragging: true });
    return;
  }
  pending = next;
  if (typeof window === "undefined") {
    flushPending();
    return;
  }
  if (timer) return;
  timer = window.setTimeout(flushPending, 32);
}

export function useHalfLifeDragging(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getSnap().dragging,
    () => false,
  );
}

export function useHalfLife(): [
  number,
  (next: number) => void,
  (next: number) => void,
] {
  const search = useSearch({ strict: false }) as {
    hl?: number | string;
    halfLife?: number | string;
  };
  const navigate = useNavigate();
  const urlDays =
    parseHalfLifeParam(search.hl ?? search.halfLife) ?? DEFAULT_HALF_LIFE;
  const live = useSyncExternalStore(subscribe, getSnap, () => SERVER_SNAP);
  const halfLife = live.days ?? urlDays;

  useEffect(() => {
    if (getSnap().dragging) return;
    setSnap({ days: urlDays, dragging: false });
  }, [urlDays]);

  const setLive = useCallback((raw: number) => {
    setLiveHalfLife(raw);
  }, []);

  const commitUrl = useCallback(
    (raw: number) => {
      const next = clampHalfLife(raw);
      if (timer && typeof window !== "undefined") {
        window.clearTimeout(timer);
        timer = 0;
      }
      pending = null;
      setSnap({ days: next, dragging: false });
      trackRadar("period_drag");
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
    },
    [navigate],
  );

  return [halfLife, setLive, commitUrl];
}
