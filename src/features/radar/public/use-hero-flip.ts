import { useEffect, useLayoutEffect, useRef, useState } from "react";

const PAIR = new Set(["lula", "flavio"]);
const DURATION_MS = 460;
export const TWEEN_MS = 280;
const TENTH = 0.001;

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function easeOutCubic(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) ** 3;
}

/** Slightly softer than cubic for hero FLIP / number tween. */
export function easeOutQuint(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) ** 5;
}

function tenth(p: number): number {
  return Math.round(p * 1000);
}

/** Interpolate P(win) in 0.1 pp steps. Snap tiny moves and first paint. */
export function useTweenedProb(target: number, ms = TWEEN_MS): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      valueRef.current = target;
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (reducedMotion() || ms <= 0 || Math.abs(from - target) < TENTH) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    let started: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      if (started == null) started = now;
      const elapsed = now - started;
      if (elapsed >= ms) {
        valueRef.current = target;
        setValue(target);
        return;
      }
      const next = from + (target - from) * easeOutQuint(elapsed / ms);
      valueRef.current = next;
      setValue((prev) => (tenth(prev) === tenth(next) ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return value;
}

/** FLIP the whole Lula/Flávio card (color + %) when they swap sides. First paint is still. */
export function useHeroFlip(orderKey: string) {
  const rootRef = useRef<HTMLElement>(null);
  const prevOrder = useRef<string | null>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const rafs = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nodes = [...root.querySelectorAll<HTMLElement>("[data-hero-key]")];
    const lastOrder = prevOrder.current;
    const willFlip = Boolean(lastOrder && lastOrder !== orderKey && !reducedMotion());

    if (willFlip) {
      for (const node of nodes) {
        const key = node.dataset.heroKey ?? "";
        const pending = rafs.current.get(key);
        if (pending) cancelAnimationFrame(pending);
        node.style.transform = "";
        delete node.dataset.flip;
        node.classList.remove("is-crossing");
      }
    }

    const nextRects = new Map(
      nodes.map((node) => [node.dataset.heroKey ?? "", node.getBoundingClientRect()]),
    );
    const lastRects = prevRects.current;
    prevOrder.current = orderKey;
    prevRects.current = nextRects;
    if (!willFlip) return;

    for (const node of nodes) {
      const key = node.dataset.heroKey ?? "";
      if (!PAIR.has(key)) continue;
      const from = lastRects.get(key);
      const to = nextRects.get(key);
      if (!from || !to) continue;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      node.classList.toggle("is-crossing", to.left < from.left - 1);
      node.style.willChange = "transform";
      let started: number | null = null;
      const tick = (now: number) => {
        if (started == null) started = now;
        const u = Math.min(1, (now - started) / DURATION_MS);
        const e = easeOutQuint(u);
        if (u >= 1) {
          delete node.dataset.flip;
          node.style.transform = "";
          node.style.willChange = "";
          node.classList.remove("is-crossing");
          rafs.current.delete(key);
          return;
        }
        const tx = `${dx * (1 - e)}px`;
        const ty = `${dy * (1 - e)}px`;
        node.dataset.flip = `${tx},${ty}`;
        node.style.transform = `translate3d(${tx}, ${ty}, 0)`;
        rafs.current.set(key, requestAnimationFrame(tick));
      };
      node.dataset.flip = `${dx}px,${dy}px`;
      node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      rafs.current.set(key, requestAnimationFrame(tick));
    }
  }, [orderKey]);

  return rootRef;
}
