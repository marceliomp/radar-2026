import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("CNT/MDA BR-06902 keeps Exame 2T totals, not válidos graphic", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((p) => p.id === "cnt-mda-09-15-06902");
  assert.ok(row);
  assert.equal(row.source.tseProtocol, "BR-06902/2026");
  assert.deepEqual(row.firstRound, {
    lula: 40.5,
    flavio: 30.4,
    cury: 6,
    caiado: 3,
    renan: 2.7,
    zema: 1,
  });
  assert.deepEqual(row.secondRound, { lula: 47.3, flavio: 40 });
  assert.notDeepEqual(row.secondRound, { lula: 54.2, flavio: 45.8 });
  assert.match(row.notes, /47[,.]3/);
  assert.match(row.notes, /não votos válidos|válidos 54/i);
});
