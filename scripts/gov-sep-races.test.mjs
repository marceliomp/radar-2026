import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const file = JSON.parse(readFileSync("src/data/race-polls.json", "utf8"));
const byId = Object.fromEntries(file.polls.map((poll) => [poll.id, poll]));
const dash = /\u2014/;

test("RS AtlasIntel 03/09 is in the race file", () => {
  const row = byId["atlas-rs-gov-09-03"];
  assert.ok(row, "atlas-rs-gov-09-03 missing");
  assert.equal(row.uf, "RS");
  assert.equal(row.institute, "AtlasIntel");
  assert.equal(row.sample, 1783);
  assert.equal(row.moe, 2);
  assert.equal(row.firstRound.tenentecoronelzucco, 44.3);
  assert.equal(row.firstRound.julianabrizola, 37.5);
  assert.equal(row.secondRound.tenentecoronelzucco, 48.5);
  assert.equal(row.secondRound.julianabrizola, 43.9);
  assert.match(row.notes, /RS-00652\/2026/);
  assert.doesNotMatch(row.notes, dash);
});

test("GO AtlasIntel 03/09 is in the race file", () => {
  const row = byId["atlas-go-gov-09-03"];
  assert.ok(row, "atlas-go-gov-09-03 missing");
  assert.equal(row.uf, "GO");
  assert.equal(row.sample, 1214);
  assert.equal(row.moe, 3);
  assert.equal(row.firstRound.danielvilela, 43.5);
  assert.equal(row.firstRound.wildermorais, 20.1);
  assert.equal(row.secondRound.danielvilela, 53.7);
  assert.match(row.notes, /GO-05293\/2026/);
  assert.doesNotMatch(row.notes, dash);
});

test("PI AtlasIntel 03/09 is in the race file", () => {
  const row = byId["atlas-pi-gov-09-03"];
  assert.ok(row, "atlas-pi-gov-09-03 missing");
  assert.equal(row.uf, "PI");
  assert.equal(row.sample, 1622);
  assert.equal(row.firstRound.rafaelfonteles, 62.4);
  assert.equal(row.firstRound.joelrodrigues, 20.9);
  assert.equal(row.secondRound, undefined);
  assert.match(row.notes, /PI-03771\/2026/);
  assert.doesNotMatch(row.notes, dash);
});

test("RJ AtlasIntel 03/09 is in the race file", () => {
  const row = byId["atlas-rj-gov-09-03"];
  assert.ok(row, "atlas-rj-gov-09-03 missing");
  assert.equal(row.uf, "RJ");
  assert.equal(row.sample, 1784);
  assert.equal(row.firstRound.eduardopaes, 43.6);
  assert.equal(row.firstRound.douglasruas, 27.6);
  assert.equal(row.secondRound.eduardopaes, 51.9);
  assert.match(row.notes, /RJ-04067\/2026/);
  assert.doesNotMatch(row.notes, dash);
});

test("RJ RTBD 02/09 is in the race file", () => {
  const row = byId["rtbd-rj-gov-09-02"];
  assert.ok(row, "rtbd-rj-gov-09-02 missing");
  assert.equal(row.uf, "RJ");
  assert.equal(row.institute, "Real Time Big Data");
  assert.equal(row.sample, 2000);
  assert.equal(row.firstRound.eduardopaes, 35);
  assert.equal(row.firstRound.douglasruas, 21);
  assert.equal(row.secondRound.eduardopaes, 41);
  assert.match(row.notes, /RJ-08350\/2026/);
  assert.doesNotMatch(row.notes, dash);
});
