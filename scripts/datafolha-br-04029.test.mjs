import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Datafolha national BR-04029/2026 is in polls.json with G1 1T+2T totals", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((p) => p.id === "datafolha-09-17-04029");
  assert.ok(row, "missing datafolha-09-17-04029");
  assert.equal(row.institute, "Datafolha");
  assert.equal(row.source.tseProtocol, "BR-04029/2026");
  assert.equal(row.sample, 2002);
  assert.equal(row.moe, 2);
  assert.equal(row.mode, "presencial");
  assert.equal(row.fieldStart, "2026-09-15");
  assert.equal(row.fieldEnd, "2026-09-16");
  assert.equal(row.date, "2026-09-17");
  assert.deepEqual(row.firstRound, {
    lula: 39,
    flavio: 36,
    cury: 6,
    caiado: 4,
    renan: 3,
    zema: 2,
  });
  assert.deepEqual(row.secondRound, { lula: 46, flavio: 44 });
  assert.match(row.source.url, /datafolha-presidente-17-setembro/);
  assert.match(row.notes, /Samara/);
  assert.match(row.notes, /L46|46×F44|2T L46/);
});
