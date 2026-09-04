#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "scripts/og-card.html"));
const pngPath = "/tmp/radar-og.png";
const jpgPath = join(root, "public/og.jpg");

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
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
process.stdout.write(`wrote ${jpgPath}\n`);
