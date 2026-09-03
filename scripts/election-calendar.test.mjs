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

test("poll time axis is proportional to election day, not equal blocks", async () => {
  const { pollTimeAxis } = await load();
  const polls = [
    { national: true, date: "2026-06-18", fieldEnd: "2026-06-17", institute: "Datafolha" },
    { national: true, date: "2026-08-31", fieldEnd: "2026-08-30", institute: "AtlasIntel/Bloomberg" },
    { national: true, date: "2026-08-31", fieldEnd: "2026-08-30", institute: "Nexus/BTG" },
    { national: true, date: "2026-09-03", fieldEnd: "2026-09-02", institute: "PoderData/Aya" },
  ];
  const view = pollTimeAxis(polls, "2026-09-03");
  assert.equal(view.start, "2026-06-18");
  assert.equal(view.end, "2026-10-25");
  assert.ok(view.fill > 40 && view.fill < 80, `fill ${view.fill} should sit mid-axis`);
  const first = view.ticks[0];
  const last = view.ticks.at(-1);
  assert.ok((first?.left ?? 1) < (last?.left ?? 0));
  assert.ok((last?.left ?? 0) <= view.fill);
  assert.match(last?.title ?? "", /PoderData\/Aya/);
  assert.equal(
    view.ticks.some((tick) => tick.houses.includes("AtlasIntel/Bloomberg") && tick.houses.includes("Nexus/BTG")),
    true,
  );
  const one = view.labels.find((lab) => lab.text === "1º 04/10");
  const two = view.labels.find((lab) => lab.text === "2º 25/10");
  assert.ok((one?.left ?? 0) > view.fill);
  assert.equal(two?.left, 100);
  const cut = pollTimeAxis(polls, "2026-08-15");
  assert.equal(cut.ticks.some((tick) => tick.iso >= "2026-08-31"), false);
});
