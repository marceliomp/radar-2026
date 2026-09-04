import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("PB AtlasIntel 03/09 president is in polls.json as state totals", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((poll) => poll.id === "atlas-pb-09-03");
  assert.ok(row, "atlas-pb-09-03 missing");
  assert.equal(row.national, false);
  assert.equal(row.uf, "PB");
  assert.equal(row.institute, "AtlasIntel");
  assert.equal(row.sample, 1207);
  assert.equal(row.moe, 3);
  assert.equal(row.mode, "online");
  assert.equal(row.fieldStart, "2026-08-28");
  assert.equal(row.fieldEnd, "2026-09-02");
  assert.equal(row.firstRound.lula, 51.8);
  assert.equal(row.firstRound.flavio, 28.1);
  assert.equal(row.firstRound.cury, 8.9);
  assert.equal(row.firstRound.renan, 4.5);
  assert.equal(row.firstRound.caiado, 1.3);
  assert.equal(row.firstRound.zema, 0.2);
  assert.equal(row.secondRound.lula, 56.3);
  assert.equal(row.secondRound.flavio, 33.4);
  const vsCaiado = row.secondPairs.find((p) => p.b === "caiado");
  assert.equal(vsCaiado.aPct, 56.1);
  assert.equal(vsCaiado.bPct, 25.9);
  assert.equal(row.source.tseProtocol, "BR-04083/2026");
  assert.match(row.notes, /nao validos/);
  assert.doesNotMatch(row.notes, /\u2014/);
});

test("no AtlasIntel national newer than 31/08", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const later = polls.filter(
    (poll) =>
      poll.national !== false &&
      String(poll.institute ?? poll.id).toLowerCase().includes("atlas") &&
      poll.date > "2026-08-31",
  );
  assert.deepEqual(later.map((p) => p.id), []);
  const wave = polls.find((poll) => poll.id === "atlas-08-31");
  assert.ok(wave);
  assert.equal(wave.national, true);
  assert.equal(wave.date, "2026-08-31");
});

test("PB AtlasIntel 03/09 governor is in the race file", () => {
  const file = JSON.parse(readFileSync("src/data/race-polls.json", "utf8"));
  const row = file.polls.find((poll) => poll.id === "atlas-pb-gov-09-03");
  assert.ok(row, "atlas-pb-gov-09-03 missing");
  assert.equal(row.uf, "PB");
  assert.equal(row.office, "governor");
  assert.equal(row.institute, "AtlasIntel");
  assert.equal(row.sample, 1207);
  assert.equal(row.moe, 3);
  assert.equal(row.firstRound.lucasribeiro14, 42.4);
  assert.equal(row.firstRound.efraimfilho, 30.9);
  assert.equal(row.firstRound.cicerolucena, 19.8);
  assert.equal(row.secondRound, undefined);
  assert.match(row.notes, /PB-01118\/2026/);
  assert.doesNotMatch(row.notes, /\u2014/);
});
