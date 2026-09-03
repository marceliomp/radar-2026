import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/latest-day.ts");
}

function stub(partial) {
  return {
    id: "x",
    institute: "Casa",
    date: "2026-08-31",
    fieldEnd: "2026-08-30",
    sample: 1000,
    moe: 2,
    mode: "presencial",
    national: true,
    firstRound: { lula: 40, flavio: 30 },
    source: {
      tseProtocol: null,
      url: null,
      publisher: "test",
      publishedAt: "2026-08-31",
      capturedAt: "2026-08-31T00:00:00.000Z",
    },
    ...partial,
  };
}

test("same publication day returns every house, each with its own field", async () => {
  const { pollsOnLatestDay } = await load();
  const atlas = stub({
    id: "atlas-08-31",
    institute: "AtlasIntel/Bloomberg",
    date: "2026-08-31",
    fieldStart: "2026-08-28",
    fieldEnd: "2026-08-30",
  });
  const nexus = stub({
    id: "nexus-08-31",
    institute: "Nexus/BTG",
    date: "2026-08-31",
    fieldStart: "2026-08-29",
    fieldEnd: "2026-08-30",
  });
  const older = stub({
    id: "quaest-08-30",
    institute: "Quaest",
    date: "2026-08-30",
    fieldEnd: "2026-08-29",
  });
  const rows = pollsOnLatestDay([older, nexus, atlas], "2026-09-02");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.institute), ["AtlasIntel/Bloomberg", "Nexus/BTG"]);
  assert.equal(rows[0].fieldStart, "2026-08-28");
  assert.equal(rows[1].fieldStart, "2026-08-29");
});

test("a later day replaces the previous bundle", async () => {
  const { pollsOnLatestDay } = await load();
  const pair = [
    stub({ id: "a", institute: "A", date: "2026-08-31", fieldEnd: "2026-08-30" }),
    stub({ id: "b", institute: "B", date: "2026-08-31", fieldEnd: "2026-08-30" }),
  ];
  const newer = stub({
    id: "quaest-09-02",
    institute: "Quaest",
    date: "2026-09-02",
    fieldStart: "2026-08-30",
    fieldEnd: "2026-09-01",
  });
  const rows = pollsOnLatestDay([...pair, newer], "2026-09-02");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].institute, "Quaest");
});

test("pollsOnDate returns every house that published that day", async () => {
  const { pollsOnDate } = await load();
  const atlas = stub({
    id: "atlas-08-31",
    institute: "AtlasIntel/Bloomberg",
    date: "2026-08-31",
    fieldStart: "2026-08-28",
    fieldEnd: "2026-08-30",
  });
  const nexus = stub({
    id: "nexus-08-31",
    institute: "Nexus/BTG",
    date: "2026-08-31",
    fieldStart: "2026-08-29",
    fieldEnd: "2026-08-30",
  });
  const quaest = stub({
    id: "quaest-09-02",
    institute: "Quaest",
    date: "2026-09-02",
    fieldStart: "2026-08-30",
    fieldEnd: "2026-09-01",
  });
  const rows = pollsOnDate([atlas, nexus, quaest], "2026-08-31", "2026-09-03");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.institute), ["AtlasIntel/Bloomberg", "Nexus/BTG"]);
  const later = pollsOnDate([atlas, nexus, quaest], "2026-09-02", "2026-09-03");
  assert.equal(later.length, 1);
  assert.equal(later[0].institute, "Quaest");
});
