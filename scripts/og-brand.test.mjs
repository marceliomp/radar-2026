import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("share card and ingest identity do not name Alvo BR", () => {
  const card = readFileSync("scripts/og-card.html", "utf8");
  const publish = readFileSync("scripts/publish-polls.mjs", "utf8");
  const theme = readFileSync("src/lib/chart-theme.ts", "utf8");
  assert.doesNotMatch(card, /alvo/i);
  assert.doesNotMatch(theme, /alvo/i);
  assert.doesNotMatch(publish, /alvobrimobiliaria/i);
  assert.match(publish, /radar-ingest@brasilradar\.com\.br/);
  assert.match(card, /Agregador eleitoral/);
});
