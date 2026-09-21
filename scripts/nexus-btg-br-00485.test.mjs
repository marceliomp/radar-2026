import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Nexus/BTG BR-00485/2026 keeps CNN/Exame 1T+2T totals", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((p) => p.id === "nexus-btg-09-21-00485");
  assert.ok(row);
  assert.equal(row.source.tseProtocol, "BR-00485/2026");
  assert.equal(row.sample, 2006);
  assert.equal(row.mode, "telefone");
  assert.deepEqual(row.firstRound, {
    lula: 40,
    flavio: 37,
    cury: 6,
    caiado: 5,
    renan: 3,
    zema: 1,
  });
  assert.deepEqual(row.secondRound, { lula: 46, flavio: 45 });
});

test("Quaest BR-06004 teaser garbage is not in polls.json", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  assert.equal(
    polls.filter((p) => p.id === "quaest-09-21-06004").length,
    0,
  );
  assert.equal(
    polls.filter((p) => p.source?.tseProtocol === "BR-06004/2026").length,
    0,
  );
});
