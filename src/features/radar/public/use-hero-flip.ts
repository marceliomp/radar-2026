import { useLayoutEffect, useRef } from "react";

const PAIR = new Set(["lula", "flavio"]);
const DURATION_MS = 1000;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** FLIP the Lula/Flávio columns when they swap sides. First paint is still. */
export function useHeroFlip(orderKey: string) {
  const rootRef = useRef<HTMLElement>(null);
  const prevOrder = useRef<string | null>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nodes = [...root.querySelectorAll<HTMLElement>("[data-hero-key]")];
    for (const node of nodes) {
      for (const running of node.getAnimations()) running.cancel();
      node.classList.remove("is-crossing");
    }

    const nextRects = new Map(
      nodes.map((node) => [node.dataset.heroKey ?? "", node.getBoundingClientRect()]),
    );
    const lastOrder = prevOrder.current;
    const lastRects = prevRects.current;
    prevOrder.current = orderKey;
    prevRects.current = nextRects;

    if (!lastOrder || lastOrder === orderKey || reducedMotion()) return;

    for (const node of nodes) {
      const key = node.dataset.heroKey ?? "";
      if (!PAIR.has(key)) continue;
      const from = lastRects.get(key);
      const to = nextRects.get(key);
      if (!from || !to) continue;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const takingLead = to.left < from.left - 1;
      node.classList.toggle("is-crossing", takingLead);
      const anim = node.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        { duration: DURATION_MS, easing: EASE, fill: "none" },
      );
      void anim.finished.then(
        () => node.classList.remove("is-crossing"),
        () => node.classList.remove("is-crossing"),
      );
    }
  }, [orderKey]);

  return rootRef;
}
