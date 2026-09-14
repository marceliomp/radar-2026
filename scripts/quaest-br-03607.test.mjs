import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Quaest national BR-03607/2026 is in polls.json with G1 votes only", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((poll) => poll.id === "quaest-09-14-03607");
  assert.ok(row, "quaest-09-14-03607 missing");
  assert.equal(row.national, true);
  assert.equal(row.institute, "Genial/Quaest");
  assert.equal(row.date, "2026-09-14");
  assert.equal(row.fieldStart, "2026-09-10");
  assert.equal(row.fieldEnd, "2026-09-13");
  assert.equal(row.sample, 2004);
  assert.equal(row.moe, 2);
  assert.equal(row.mode, "presencial");
  assert.deepEqual(row.firstRound, {
    lula: 36,
    flavio: 31,
    cury: 7,
    renan: 4,
    caiado: 4,
    zema: 1,
  });
  assert.deepEqual(row.secondRound, { flavio: 42, lula: 40 });
  assert.equal(row.source.tseProtocol, "BR-03607/2026");
  assert.match(row.source.url, /quaest-pesquisa-presidente/);
  assert.equal(polls.filter((p) => p.source?.tseProtocol === "BR-03607/2026").length, 1);
});
