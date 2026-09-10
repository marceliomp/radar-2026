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

test("CE AtlasIntel 04/09 president is state, not national", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((poll) => poll.id === "atlas-ce-09-03");
  assert.ok(row, "atlas-ce-09-03 missing");
  assert.equal(row.national, false);
  assert.equal(row.uf, "CE");
  assert.equal(row.sample, 1834);
  assert.equal(row.firstRound.lula, 51.6);
  assert.equal(row.firstRound.flavio, 25.7);
  assert.equal(row.secondRound.lula, 54.6);
  assert.equal(row.source.tseProtocol, "BR-07411/2026");
  assert.equal(
    polls.some((poll) => poll.id === "atlasintel-09-03-07411"),
    false,
  );
});

test("AtlasIntel/Bloomberg 10/09 national is in polls.json", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((poll) => poll.id === "atlas-09-10-01452");
  assert.ok(row, "atlas-09-10-01452 missing");
  assert.equal(row.national, true);
  assert.equal(row.institute, "AtlasIntel/Bloomberg");
  assert.equal(row.date, "2026-09-10");
  assert.equal(row.fieldStart, "2026-09-04");
  assert.equal(row.fieldEnd, "2026-09-09");
  assert.equal(row.sample, 5000);
  assert.equal(row.moe, 1);
  assert.equal(row.mode, "online");
  assert.equal(row.firstRound.lula, 43);
  assert.equal(row.firstRound.flavio, 37.4);
  assert.equal(row.firstRound.cury, 6.6);
  assert.equal(row.firstRound.renan, 6.5);
  assert.equal(row.firstRound.zema, 2.1);
  assert.equal(row.firstRound.caiado, 1.1);
  assert.equal(row.secondRound.lula, 46.2);
  assert.equal(row.secondRound.flavio, 46.4);
  const vsZema = row.secondPairs.find((pair) => pair.b === "zema");
  assert.equal(vsZema.aPct, 46);
  assert.equal(vsZema.bPct, 46.2);
  const vsCaiado = row.secondPairs.find((pair) => pair.b === "caiado");
  assert.equal(vsCaiado.aPct, 45.7);
  assert.equal(vsCaiado.bPct, 45.7);
  const vsCury = row.secondPairs.find((pair) => pair.b === "cury");
  assert.equal(vsCury.aPct, 43.8);
  assert.equal(vsCury.bPct, 41.1);
  const vsRenan = row.secondPairs.find((pair) => pair.b === "renan");
  assert.equal(vsRenan.aPct, 46);
  assert.equal(vsRenan.bPct, 33.8);
  assert.equal(row.source.tseProtocol, "BR-01452/2026");
  assert.equal(row.firstRound.marcal, undefined);
  assert.doesNotMatch(row.notes, /\u2014/);
  const later = polls.filter(
    (poll) =>
      poll.national !== false &&
      String(poll.institute ?? poll.id).toLowerCase().includes("atlas") &&
      poll.date > "2026-08-31",
  );
  assert.deepEqual(later.map((poll) => poll.id), ["atlas-09-10-01452"]);
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
