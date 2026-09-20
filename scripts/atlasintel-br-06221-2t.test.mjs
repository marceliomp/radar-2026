import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("AtlasIntel BR-06221 has CNN 2T totals F47.2×L46.8, not válidos", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((p) => p.id === "atlasintel-09-17-06221");
  assert.ok(row);
  assert.equal(row.source.tseProtocol, "BR-06221/2026");
  assert.deepEqual(row.firstRound, {
    lula: 44.1,
    flavio: 41.7,
    renan: 5.1,
    cury: 3.5,
    caiado: 1.7,
    zema: 1.1,
  });
  assert.deepEqual(row.secondRound, { lula: 46.8, flavio: 47.2 });
  assert.notDeepEqual(row.secondRound, { lula: 49.8, flavio: 50.2 });
  assert.notDeepEqual(row.secondRound, { lula: 20.9, flavio: 14.4 });
  assert.match(row.notes, /47[,.]2/);
  assert.match(row.notes, /46[,.]8/);
});
