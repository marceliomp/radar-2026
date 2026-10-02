import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
const byId = (id) => polls.find((p) => p.id === id);

test("Datafolha BR-08039 keeps Folha totals, not válidos 45x40", () => {
  const row = byId("datafolha-10-01-08039");
  assert.deepEqual(row.firstRound, { lula: 42, flavio: 38 });
  assert.deepEqual(row.secondRound, { lula: 48, flavio: 45 });
});

test("Vox BR-00148 1T is Flávio 41,2 x Lula 40,4; 2T is not the Caiado scenario", () => {
  const row = byId("vox-brasil-10-02-00148");
  assert.deepEqual(row.firstRound, { lula: 40.4, flavio: 41.2 });
  assert.deepEqual(row.secondRound, { lula: 45.2, flavio: 48.2 });
});

test("Vox BR-00895 2T is not a copy of the 1T", () => {
  const row = byId("vox-brasil-09-29-00895");
  assert.deepEqual(row.secondRound, { lula: 44.7, flavio: 45.2 });
});

test("Gerp BR-03929 2T is Flávio 50 x Lula 43", () => {
  assert.deepEqual(byId("gerp-09-27-03929").secondRound, { lula: 43, flavio: 50 });
});

test("Futura/Apex BR-01122 drops Caiado rejection and unpublished 2T", () => {
  const row = byId("futura-apex-09-30-01122");
  assert.deepEqual(row.firstRound, { lula: 39.4, flavio: 42.2 });
  assert.equal(row.secondRound, undefined);
});

test("Real Time Big Data SP and RJ state polls stay out of the national file", () => {
  assert.equal(byId("real-time-big-data-09-29-09891"), undefined);
  assert.equal(byId("real-time-big-data-09-30-05193"), undefined);
});
