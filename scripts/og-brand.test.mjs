import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("share card shows live chance, not stale intention, and disclaims poll", () => {
  const card = readFileSync("scripts/og-card.html", "utf8");
  const publish = readFileSync("scripts/publish-polls.mjs", "utf8");
  const theme = readFileSync("src/lib/chart-theme.ts", "utf8");
  assert.doesNotMatch(card, /alvo/i);
  assert.doesNotMatch(theme, /alvo/i);
  assert.doesNotMatch(publish, /alvobrimobiliaria/i);
  assert.match(publish, /radar-ingest@brasilradar\.com\.br/);
  assert.match(card, /Não é pesquisa/);
  assert.match(card, /Chance de ser presidente|Chance de ganhar/);
  assert.match(card, /51,6%/);
  assert.match(card, /48,4%/);
  assert.doesNotMatch(card, /as-of 28 ago/);
  assert.doesNotMatch(card, /39,5%/);
});
