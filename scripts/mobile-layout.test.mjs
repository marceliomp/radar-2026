import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("mobile first screen: one-row nav, 44px taps, share icons, period after score", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const bar = readFileSync("src/components/share-bar.tsx", "utf8");
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  const lab = readFileSync("src/features/radar/lab/lab-radar-page.tsx", "utf8");
  const mobile = css.slice(css.indexOf("@media (max-width: 767px)"));
  const phone = css.slice(css.indexOf("@media (max-width: 639px)"));

  assert.match(page, /MastBar/);
  assert.match(mobile, /\.mast\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(mobile, /\.mast-links\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(mobile, /\.mast-link\s*\{[^}]*min-height:\s*2\.75rem/);
  assert.match(css, /\.uf-chip\s*\{[^}]*min-height:\s*2\.75rem/);
  assert.match(css, /\.hl-preset\s*\{[^}]*min-height:\s*2\.75rem/);
  assert.match(css, /\.share-btn\s*\{[^}]*min-height:\s*2\.75rem/);
  assert.match(mobile, /\.share-bar-compact[^}]*flex-wrap:\s*nowrap/);
  assert.match(mobile, /\.share-btn-icon\s*\{[^}]*2\.75rem/);
  assert.match(bar, /share-wa-short/);
  assert.match(bar, /m\.share\.whatsappShort/);
  assert.match(lab, /compact/);
  assert.match(phone, /#mapa \{\s*order: 2/);
  assert.match(phone, /#novo \{\s*order: 4/);
  assert.equal(
    mobile.match(/\.hl-copy\s*\{[^}]*display:\s*none/),
    null,
    ".hl-copy must stay visible on mobile",
  );
});

test("public default period is 15 days", () => {
  const period = readFileSync("src/lib/period.ts", "utf8");
  assert.match(period, /DEFAULT_HALF_LIFE = 15/);
  assert.match(period, /HL_MAX = 90/);
});
