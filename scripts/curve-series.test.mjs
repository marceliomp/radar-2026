import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function poll(id, date, lula, flavio, second) {
  return {
    id,
    institute: "Datafolha",
    date,
    fieldEnd: date,
    sample: 2000,
    moe: 2,
    mode: "presencial",
    national: true,
    firstRound: { lula, flavio },
    secondRound: second,
  };
}

test("asOfDayAverages is one point per publication day", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const polls = [
    poll("a", "2026-08-01", 40, 30, { lula: 48, flavio: 40 }),
    poll("b", "2026-08-01", 42, 32, { lula: 49, flavio: 41 }),
    poll("c", "2026-09-01", 38, 34, { lula: 46, flavio: 44 }),
  ];
  const days = asOfDayAverages(polls, "2026-09-03", 14, false);
  assert.deepEqual(
    days.map((row) => row.date),
    ["2026-08-01", "2026-09-01"],
  );
  assert.equal(new Set(days.map((row) => row.t)).size, 2);
  assert.ok(days[0].lula > 39 && days[0].lula < 43);
});

test("short half-life moves the last day toward the newest house", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const polls = [
    poll("old", "2026-06-01", 50, 20, { lula: 55, flavio: 35 }),
    poll("new", "2026-09-01", 40, 40, { lula: 45, flavio: 45 }),
  ];
  const long = asOfDayAverages(polls, "2026-09-03", 40, false);
  const short = asOfDayAverages(polls, "2026-09-03", 5, false);
  const lastLong = long[long.length - 1];
  const lastShort = short[short.length - 1];
  assert.ok(lastShort.lula < lastLong.lula, "recent poll should weigh more with a short period");
});

test("poll series stays dots and the line is the period average", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const poll = curve.split('dataKey="lulaPoll"')[1].split('dataKey="flavioPoll"')[0];
  assert.match(poll, /stroke="none"/);
  assert.match(curve, /asOfDayAverages/);
  assert.match(curve, /média do período/);
  assert.match(curve, /type="monotone"/);
  assert.doesNotMatch(curve, /média das 3 últimas/);
  assert.doesNotMatch(curve, /rollingAverage/);
});
