#!/usr/bin/env node
/**
 * First-fold mobile audit: 390×844, routes /, /lab, /candidatos.
 * Writes PNGs + JSON metrics. Default base is loopback; production needs
 * BROWSER_ALLOW_EXTERNAL_HOST=1.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:5173/");
const outDir = process.argv[3] || "/workspace/screenshots/mobile-audit";
const routes = ["/", "/lab", "/candidatos?uf=SP&cargo=governador"];
const VW = 390;
const VH = 844;

mkdirSync(outDir, { recursive: true });

function box(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.round(r.top),
    bottom: Math.round(r.bottom),
    left: Math.round(r.left),
    right: Math.round(r.right),
    w: Math.round(r.width),
    h: Math.round(r.height),
    inFold: r.top < VH && r.bottom > 0 && r.left < VW && r.right > 0,
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const origin = new URL(base).origin;
const report = { origin, viewport: { width: VW, height: VH }, routes: [] };

try {
  const page = await browser.newPage({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });

  for (const route of routes) {
    const url = new URL(route, origin).href;
    const slug = route.replace(/[/?&=]/g, "_").replace(/^_+|_+$/g, "") || "home";
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(800);

    const metrics = await page.evaluate(({ VW, VH }) => {
      const q = (sel) => document.querySelector(sel);
      const qa = (sel) => [...document.querySelectorAll(sel)];
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left),
          right: Math.round(r.right),
          w: Math.round(r.width),
          h: Math.round(r.height),
          inFold: r.top < VH && r.bottom > 0 && r.left < VW && r.right > 0,
        };
      };
      const taps = qa("a, button, .uf-chip, .hl-preset, .mast-link").map((el) => {
        const r = el.getBoundingClientRect();
        const label = (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40);
        return {
          label,
          w: Math.round(r.width),
          h: Math.round(r.height),
          short: r.height > 0 && r.height < 44 && r.width > 0,
        };
      });
      const body = document.body;
      return {
        title: document.title,
        scrollWidth: body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflowX: body.scrollWidth > VW + 2,
        hero: box(q(".hero-mast") || q("header")),
        nav: box(q(".mast")),
        share: box(q(".hero-share") || q("[class*='share']")),
        shareButtons: qa(".hero-share button, .hero-share a").map((el) => box(el)),
        ufChips: box(q(".uf-chips")),
        ufChipH: qa(".uf-chip").map((el) => Math.round(el.getBoundingClientRect().height)),
        period: box(q(".mast-hl") || q(".hl-card")),
        presets: qa(".hl-preset").map((el) => ({
          label: el.textContent.trim(),
          ...box(el),
        })),
        score: box(q(".hero-score") || q(".hero-num")),
        map: box(q("#mapa") || q(".map-phone")),
        curve: box(q("#curva")),
        novo: box(q("#novo")),
        sticky: box(q(".hl-strip")),
        shortTaps: taps.filter((t) => t.short).slice(0, 12),
      };
    }, { VW, VH });

    const foldPng = join(outDir, `${slug}-fold.png`);
    const fullPng = join(outDir, `${slug}-full.png`);
    await page.screenshot({ path: foldPng, fullPage: false });
    await page.screenshot({ path: fullPng, fullPage: true });

    report.routes.push({
      route,
      status: resp?.status() ?? 0,
      foldPng,
      fullPng,
      ...metrics,
    });
  }

  const jsonPath = join(outDir, "audit.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, jsonPath, routes: report.routes.map((r) => ({
    route: r.route,
    overflowX: r.overflowX,
    heroH: r.hero?.h,
    periodInFold: r.period?.inFold,
    periodTop: r.period?.top,
    navH: r.nav?.h,
    ufChipH: r.ufChipH,
    shortTaps: r.shortTaps,
  })) }, null, 2));
} finally {
  await browser.close();
}
