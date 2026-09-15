import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("og:title and share ignore ?hl= and stay on DEFAULT_HALF_LIFE", () => {
  const meta = readFileSync("src/lib/page-meta.ts", "utf8");
  assert.match(meta, /DEFAULT_HALF_LIFE/);
  assert.match(meta, /Ignore \?hl=/);
  assert.doesNotMatch(
    meta,
    /parseHalfLifeParam\(search\.hl\) \?\? DEFAULT_HALF_LIFE/,
  );
  assert.match(meta, /homeTitle\(leader, leaderPct\)/);

  const site = readFileSync("src/lib/site.ts", "utf8");
  assert.match(site, /export function shareLocationUrl/);
  assert.match(site, /never carry \?hl=/);

  const bar = readFileSync("src/components/share-bar.tsx", "utf8");
  assert.match(bar, /shareLocationUrl/);
  assert.doesNotMatch(bar, /locationUrl\(pathname,\s*search\)/);

  const page = readFileSync(
    "src/features/radar/public/public-radar-page.tsx",
    "utf8",
  );
  assert.match(page, /shareForecast/);
  assert.match(page, /DEFAULT_HALF_LIFE/);
});

test("og card template is a live shell and prebuild regenerates og.jpg", () => {
  const card = readFileSync("scripts/og-card.html", "utf8");
  const render = readFileSync("scripts/render-og.mjs", "utf8");
  const pkg = readFileSync("package.json", "utf8");
  assert.match(card, /Não é pesquisa/);
  assert.match(card, /\{\{LULA_PCT\}\}/);
  assert.match(card, /\{\{FLAVIO_PCT\}\}/);
  assert.match(card, /\{\{LEADER\}\}/);
  assert.match(card, /\{\{HL\}\}/);
  assert.doesNotMatch(card, /51,6%/);
  assert.doesNotMatch(card, /recência 15d/);
  assert.match(render, /DEFAULT_HALF_LIFE/);
  assert.match(render, /public\/og\.jpg/);
  assert.match(pkg, /render-og\.mjs/);
  assert.match(pkg, /"prebuild": "node scripts\/render-og\.mjs/);
});

test("BTG/Nexus BR-04076 carries transcribed 2T 47×46", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const poll = polls.find((p) => p.id === "nexus-btg-09-14-04076");
  assert.ok(poll);
  assert.equal(poll.source.tseProtocol, "BR-04076/2026");
  assert.deepEqual(poll.firstRound, {
    lula: 42,
    flavio: 37,
    cury: 6,
    caiado: 5,
    renan: 2,
    zema: 1,
  });
  assert.deepEqual(poll.secondRound, { lula: 47, flavio: 46 });
});

test("shortHouseName is shared by visit-delta and chance-marks", () => {
  const visit = readFileSync("src/lib/visit-delta.ts", "utf8");
  const marks = readFileSync("src/lib/chance-marks.ts", "utf8");
  assert.match(marks, /export function shortHouseName/);
  assert.match(visit, /from "\.\/chance-marks\.ts"/);
  assert.match(visit, /shortHouseName/);
  assert.doesNotMatch(visit, /name\.split\("\/"\)\[0\]/);
});

test("chance series copy says replay, not publicada", () => {
  const messages = readFileSync("src/lib/i18n/messages.ts", "utf8");
  assert.match(messages, /seriesChanceMeta: "replay · 5"/);
  assert.doesNotMatch(messages, /seriesChanceMeta: "publicada"/);
  assert.doesNotMatch(messages, /chanceKicker: "Chance publicada"/);
  assert.match(
    messages,
    /[Rr]ecálculo retroativo|[Rr]eplay|retrospective replay/,
  );
});
