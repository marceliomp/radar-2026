import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("CE AtlasIntel 03/09 is in the race file", () => {
  const file = JSON.parse(readFileSync("src/data/race-polls.json", "utf8"));
  const row = file.polls.find((poll) => poll.id === "atlas-ce-gov-09-03");
  assert.ok(row, "atlas-ce-gov-09-03 missing");
  assert.equal(row.uf, "CE");
  assert.equal(row.office, "governor");
  assert.equal(row.institute, "AtlasIntel/Focus");
  assert.equal(row.sample, 1834);
  assert.equal(row.moe, 2);
  assert.equal(row.firstRound.cirogomes, 48.4);
  assert.equal(row.firstRound.elmanodefreitas, 45.8);
  assert.equal(row.secondRound.cirogomes, 50);
  assert.equal(row.secondRound.elmanodefreitas, 46.1);
  assert.match(row.notes, /CE-02357\/2026/);
  assert.doesNotMatch(row.notes, /\u2014/);
});
