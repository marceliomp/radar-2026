import { track } from "@vercel/analytics";

export type RadarEvent = "period_drag" | "uf_click" | "share_wa";

export function trackRadar(name: RadarEvent): void {
  try {
    track(name);
  } catch {
    /* ignore */
  }
}
