import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/election-calendar.ts");
}

test("mondayOf snaps to Monday UTC", async () => {
  const { mondayOf } = await load();
  assert.equal(mondayOf("2026-09-03"), "2026-08-31");
  assert.equal(mondayOf("2026-08-31"), "2026-08-31");
});

test("poll week bar counts houses per week and ignores later asOf cuts", async () => {
  const { pollWeekBar } = await load();
  const polls = [
    { national: true, date: "2026-08-10", fieldEnd: "2026-08-09", institute: "Palver" },
    { national: true, date: "2026-08-11", fieldEnd: "2026-08-10", institute: "Gerp" },
    { national: true, date: "2026-08-31", fieldEnd: "2026-08-30", institute: "AtlasIntel/Bloomberg" },
    { national: true, date: "2026-08-31", fieldEnd: "2026-08-30", institute: "Nexus/BTG" },
    { national: true, date: "2026-09-03", fieldEnd: "2026-09-02", institute: "PoderData/Aya" },
  ];
  const view = pollWeekBar(polls, "2026-09-03");
  assert.match(view.label, /Pesquisas por semana/);
  assert.match(view.label, /10\/08 a 03\/09/);
  assert.ok(view.nWithPolls >= 2);
  const last = view.weeks.at(-1);
  assert.equal(last?.start, "2026-08-31");
  assert.equal(last?.count, 3);
  assert.deepEqual(last?.houses, ["AtlasIntel/Bloomberg", "Nexus/BTG", "PoderData/Aya"]);
  const cut = pollWeekBar(polls, "2026-08-15");
  assert.ok(cut.weeks.every((week) => week.start <= "2026-08-15"));
  assert.equal(cut.weeks.some((week) => week.start === "2026-08-31"), false);
});
