#!/usr/bin/env node
/**
 * Rebuild public/og.jpg from scripts/og-card.html using the default public
 * model (hl=DEFAULT_HALF_LIFE). Keeps the share card aligned with hero + og:title.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(join(root, "scripts/og-card.html"), "utf8");
const pngPath = "/tmp/radar-og.png";
const jpgPath = join(root, "public/og.jpg");

const { runForecast, DEFAULT_CONFIG, todayAsOf } = await import(
  "../src/lib/forecast/engine.ts"
);
const { DEFAULT_HALF_LIFE } = await import("../src/lib/period.ts");
const polls = JSON.parse(readFileSync(join(root, "src/data/polls.json"), "utf8"));

const asOf = todayAsOf();
const snap = runForecast(polls, {
  ...DEFAULT_CONFIG,
  asOf,
  halfLifeDays: DEFAULT_HALF_LIFE,
  simulations: 4000,
});
const lula = Math.round(snap.probs.lulaWinsElection * 1000) / 10;
const flavio = Math.round(snap.probs.flavioWinsElection * 1000) / 10;
const lulaLeads = lula >= flavio;
const fmt = (n) => n.toFixed(1).replace(".", ",");
const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf) ?? [];
const dateBr = y ? `${d}/${m}` : asOf;
const pollCount = polls.filter((p) => p.national).length;

const html = template
  .replaceAll("{{LULA_PCT}}", `${fmt(lula)}%`)
  .replaceAll("{{FLAVIO_PCT}}", `${fmt(flavio)}%`)
  .replaceAll("{{HL}}", String(DEFAULT_HALF_LIFE))
  .replaceAll("{{ASOF}}", dateBr)
  .replaceAll("{{LEADER}}", lulaLeads ? "Lula" : "Flávio")
  .replaceAll("{{LEADER_PCT}}", `${fmt(lulaLeads ? lula : flavio)}%`)
  .replaceAll("{{POLL_COUNT}}", String(pollCount));

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
} catch (err) {
  server.close();
  const msg = err instanceof Error ? err.message : String(err);
  // Vercel preview often lacks Playwright browsers; keep committed og.jpg.
  if (existsSync(jpgPath)) {
    process.stderr.write(
      `[render-og] skip (playwright unavailable): ${msg}\n[render-og] keeping existing ${jpgPath}\n`,
    );
    process.exit(0);
  }
  throw err;
}
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(`http://127.0.0.1:${port}/`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: pngPath, type: "png" });
} finally {
  await browser.close();
  server.close();
}

const ff = spawnSync(
  "ffmpeg",
  ["-y", "-i", pngPath, "-q:v", "4", jpgPath],
  { encoding: "utf8" },
);
if (ff.status !== 0) {
  process.stderr.write(ff.stderr || "ffmpeg failed\n");
  process.exit(1);
}
writeFileSync(
  join(root, "public/og-meta.json"),
  `${JSON.stringify(
    {
      asOf,
      halfLifeDays: DEFAULT_HALF_LIFE,
      lula,
      flavio,
      leader: lulaLeads ? "Lula" : "Flávio",
      leaderPct: lulaLeads ? lula : flavio,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `wrote ${jpgPath} · ${lulaLeads ? "Lula" : "Flávio"} ${fmt(lulaLeads ? lula : flavio)}% · hl=${DEFAULT_HALF_LIFE} · ${asOf}\n`,
);
