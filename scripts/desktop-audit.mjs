#!/usr/bin/env node
/**
 * First-fold desktop audit: 1280×800 and 1440×900, routes /, /lab, /candidatos.
 * Writes PNGs + JSON metrics. Default base is loopback.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:5173/");
const outDir = process.argv[3] || "/workspace/screenshots/desktop-audit";
const routes = ["/", "/lab", "/candidatos?uf=SP&cargo=governador", "/?hl=365"];
const views = [
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const origin = new URL(base).origin;
const report = { origin, views: [] };

try {
  for (const view of views) {
    const page = await browser.newPage({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: 1,
    });
    await page.emulateMedia({ colorScheme: "dark" });
    const viewReport = { viewport: view, routes: [] };

    for (const route of routes) {
      const url = new URL(route, origin).href;
      const slug = `${view.name}-${route.replace(/[/?&=]/g, "_").replace(/^_+|_+$/g, "") || "home"}`;
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(700);

      const metrics = await page.evaluate(({ VW, VH }) => {
        const qa = (sel) => [...document.querySelectorAll(sel)];
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            w: Math.round(r.width),
            h: Math.round(r.height),
            inFold: r.top < VH && r.bottom > 0 && r.left < VW && r.right > 0,
            fullyInFold: r.top >= 0 && r.bottom <= VH,
          };
        };
        const text = document.body.innerText;
        return {
          title: document.title,
          hero: box(document.querySelector(".hero-mast")),
          period: box(document.querySelector(".mast-hl, .hl-card")),
          presets: qa(".hl-preset").map((el) => ({
            label: el.textContent.trim(),
            on: el.classList.contains("hl-preset-on"),
            ...box(el),
          })),
          hlVal: document.querySelector(".hl-val")?.textContent?.trim() || null,
          rangeMax: document.querySelector(".hl-range")?.getAttribute("max") || null,
          rangeVal: document.querySelector(".hl-range")?.value || null,
          curve: box(document.querySelector("#curva")),
          novo: box(document.querySelector("#novo")),
          forbidden: {
            has365: /\b365\b/.test(text),
            hasYTD: /\bYTD\b/i.test(text),
            hasOAno: /o ano/i.test(text),
            has253: /\b253\b/.test(text),
            janeiro: /janeiro até hoje|From January to now/i.test(text),
          },
        };
      }, { VW: view.width, VH: view.height });

      const foldPng = join(outDir, `${slug}-fold.png`);
      await page.screenshot({ path: foldPng, fullPage: false });
      viewReport.routes.push({
        route,
        status: resp?.status() ?? 0,
        foldPng,
        ...metrics,
      });
    }

    await page.close();
    report.views.push(viewReport);
  }

  const jsonPath = join(outDir, "audit.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const flat = report.views.flatMap((v) =>
    v.routes.map((r) => ({
      view: v.viewport.name,
      route: r.route,
      heroH: r.hero?.h,
      periodInFold: r.period?.inFold,
      periodFull: r.period?.fullyInFold,
      hlVal: r.hlVal,
      rangeMax: r.rangeMax,
      rangeVal: r.rangeVal,
      presets: r.presets?.map((p) => p.label),
      forbidden: r.forbidden,
      novoInFold: r.novo?.inFold,
    })),
  );
  console.log(JSON.stringify({ ok: true, jsonPath, routes: flat }, null, 2));
} finally {
  await browser.close();
}
