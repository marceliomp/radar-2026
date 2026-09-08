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

test("shorter half-life pulls the line toward the newest poll", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const polls = [
    poll("old", "2026-08-20", 50, 20, { lula: 55, flavio: 35 }),
    poll("new", "2026-09-01", 40, 40, { lula: 45, flavio: 45 }),
  ];
  const tight = asOfDayAverages(polls, "2026-09-03", 5, false);
  const long = asOfDayAverages(polls, "2026-09-03", 40, false);
  const lastTight = tight[tight.length - 1];
  const lastLong = long[long.length - 1];
  assert.equal(lastTight.date, "2026-09-01");
  assert.ok(lastTight.lula < lastLong.lula, "5d must sit closer to 40 than 40d");
  assert.ok(
    Math.abs(lastTight.lula - 40) < Math.abs(lastTight.lula - 50),
    "5d is closer to the new 40 than to the August 50, not a hard ignore",
  );
  assert.ok(lastLong.lula > 41, "40d still mixes the August poll");
});

test("poll series stays dots and the line is the period average", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const poll = curve.split('dataKey="lulaPoll"')[1].split('dataKey="flavioPoll"')[0];
  assert.match(poll, /stroke="none"/);
  assert.match(curve, /asOfDayAverages/);
  assert.match(curve, /halfLifeDays/);
  assert.doesNotMatch(curve, /CURVE_PERIOD_DAYS/);
  assert.match(curve, /Média · pesquisas novas pesam mais/);
  assert.match(curve, /linha: média do período/);
  assert.match(curve, /monotone/);
  assert.doesNotMatch(curve, /média das 3 últimas/);
  assert.doesNotMatch(curve, /2 últimos com pesquisa/);
  assert.doesNotMatch(curve, /rollingAverage/);
});

test("last curve point matches the chance mean", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const { runForecast, DEFAULT_CONFIG } = await import("../src/lib/forecast/engine.ts");
  const polls = [
    poll("old", "2026-08-20", 50, 20, { lula: 55, flavio: 35 }),
    poll("mid", "2026-09-01", 42, 38, { lula: 48, flavio: 42 }),
    poll("new", "2026-09-03", 40, 40, { lula: 45, flavio: 45 }),
  ];
  const asOf = "2026-09-03";
  const snap = runForecast(polls, {
    ...DEFAULT_CONFIG,
    asOf,
    halfLifeDays: 14,
    simulations: 200,
  });
  const days = asOfDayAverages(polls, asOf, 14, false);
  const last = days[days.length - 1];
  assert.equal(last.date, asOf);
  assert.equal(last.lula, snap.first.lula.mean);
  assert.equal(last.flavio, snap.first.flavio.mean);
  const days2 = asOfDayAverages(polls, asOf, 14, true);
  const last2 = days2[days2.length - 1];
  assert.equal(last2.lula, snap.second.lula.mean);
  assert.equal(last2.flavio, snap.second.flavio.mean);
});

test("curve still has a point on a gap calendar day", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const polls = [
    poll("gap", "2026-08-20", 50, 20, { lula: 55, flavio: 35 }),
    poll("new", "2026-09-01", 40, 40, { lula: 45, flavio: 45 }),
  ];
  const days = asOfDayAverages(polls, "2026-09-03", 14, false);
  const last = days[days.length - 1];
  assert.equal(last.date, "2026-09-01");
  assert.ok(last.lula > 40, "August poll still mixes under a 14d half-life");
});

test("axisTicks stays chronological and never puts 24/08 after 30/08", async () => {
  const { isoDayUtc } = await import("../src/lib/format.ts");
  const { axisTicks } = await import("../src/lib/forecast/curve-series.ts");
  const t24 = isoDayUtc("2026-08-24");
  const t30 = isoDayUtc("2026-08-30");
  const mixed = [
    isoDayUtc("2026-09-03"),
    t30,
    isoDayUtc("2026-06-18"),
    t24,
    t30,
    isoDayUtc("2026-08-26"),
  ];
  const ticks = axisTicks(mixed, 6);
  for (let i = 1; i < ticks.length; i++) {
    assert.ok(ticks[i] > ticks[i - 1], "ticks must increase");
  }
  const i24 = ticks.indexOf(t24);
  const i30 = ticks.indexOf(t30);
  if (i24 >= 0 && i30 >= 0) {
    assert.ok(i24 < i30, "24/08 cannot sit after 30/08");
  }
});

test("curve hover tracks the date on a vertical cursor", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /ticks=\{ticks\}/);
  assert.match(curve, /monthTicks/);
  assert.match(curve, /cursor=\{\{ stroke: CHART.axis/);
  assert.doesNotMatch(curve, /cursor=\{false\}/);
  assert.doesNotMatch(curve, /data=\{daily\}/);
  assert.doesNotMatch(curve, /tickCount: 7/);
});

test("tooltip puts period average above the houses", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const avgAt = curve.indexOf("Média · pesquisas novas pesam mais");
  const housesAt = curve.indexOf("{houses.map");
  assert.ok(avgAt > 0 && housesAt > avgAt, "average must sit above the house list");
});

test("tooltip scores sit in a two-column grid", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /grid-cols-2/);
  assert.match(curve, /whitespace-nowrap/);
  assert.doesNotMatch(curve, /OthersLine/);
});

test("houseFilterKey groups Genial/Quaest as Quaest", async () => {
  const { houseFilterKey, houseFilterOptions } = await import("../src/lib/forecast/curve-series.ts");
  assert.equal(houseFilterKey("Genial/Quaest"), "Quaest");
  assert.equal(houseFilterKey("Quaest"), "Quaest");
  assert.equal(houseFilterKey("PoderData/Aya"), "PoderData");
  const opts = houseFilterOptions([
    { institute: "Genial/Quaest" },
    { institute: "Quaest" },
    { institute: "Datafolha" },
    { institute: "Palver" },
  ]);
  assert.deepEqual(opts, ["Quaest"]);
});

test("curve can filter by house inside the card", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /Filtrar por casa/);
  assert.match(curve, /Todas/);
  assert.match(curve, /houseFocus/);
  assert.match(curve, /prevPublished/);
});

test("modeFilterKey groups phone modes and keeps a stable order", async () => {
  const { modeFilterKey, modeFilterLabel, modeFilterOptions } = await import(
    "../src/lib/forecast/curve-series.ts"
  );
  assert.equal(modeFilterKey("telefone"), "telefone");
  assert.equal(modeFilterKey("remoto"), "telefone");
  assert.equal(modeFilterKey("presencial"), "presencial");
  assert.equal(modeFilterKey("online"), "online");
  assert.equal(modeFilterLabel("presencial"), "Presencial");
  assert.deepEqual(
    modeFilterOptions([
      { mode: "online" },
      { mode: "telefone" },
      { mode: "presencial" },
      { mode: "remoto" },
    ]),
    ["presencial", "telefone", "online"],
  );
});

test("curve can filter by poll mode", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /Filtrar por tipo de pesquisa/);
  assert.match(curve, /Todos os tipos/);
  assert.match(curve, /modeFilterKey/);
  assert.match(curve, /modeFilterLabel/);
  assert.match(curve, /setMode/);
});

test("asOfDayAverages does not treat a missing third name as 0", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const polls = [
    {
      id: "a",
      institute: "Datafolha",
      date: "2026-08-01",
      fieldEnd: "2026-08-01",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      national: true,
      firstRound: { lula: 40, flavio: 30 },
    },
    {
      id: "b",
      institute: "Datafolha",
      date: "2026-08-01",
      fieldEnd: "2026-08-01",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      national: true,
      firstRound: { lula: 40, flavio: 30, cury: 10 },
    },
  ];
  const days = asOfDayAverages(polls, "2026-08-02", 14, false);
  assert.equal(days.length, 1);
  assert.equal(days[0].cury, 10);
});

test("first-round curve plots the other names", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /curyAvg/);
  assert.match(curve, /const showOthers = active === "1";/);
  assert.match(curve, /splitOthers/);
  assert.match(curve, /kind="others"/);
  assert.match(curve, /Os outros/);
  assert.doesNotMatch(curve, /<Fragment>/);
  assert.equal((curve.match(/\{showRace \?/g) || []).length, 4);
  assert.match(curve, /paddedDomain/);
  assert.match(curve, /avgOnFirstOfDay/);
  assert.match(curve, /lulaLine/);
  assert.match(curve, /lula=\{row.lulaAvg\}/);
  assert.match(curve, /Cury/);
  assert.match(curve, /connectNulls/);
  assert.doesNotMatch(curve, /\[0, 50\]/);
});

test("paddedDomain zooms to the race and keeps a floor", async () => {
  const { paddedDomain } = await import("../src/lib/forecast/curve-series.ts");
  assert.deepEqual(paddedDomain([38, 29, 41, 33], [22, 52]), [26, 44]);
  assert.deepEqual(paddedDomain([48.8, 27.6], [22, 52]), [24, 52]);
  assert.deepEqual(paddedDomain([40], [22, 52]), [22, 52]);
});

test("home curve uses the slider half-life", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /asOfDayAverages\(focused, asOf, halfLifeDays, false\)/);
  assert.match(curve, /asOfDayAverages\(focused, asOf, halfLifeDays, true\)/);
  assert.match(curve, /halfLifeDays, house, mode/);
});

test("monthTicks covers January through asOf", async () => {
  const { isoDayUtc } = await import("../src/lib/format.ts");
  const { monthTicks } = await import("../src/lib/forecast/curve-series.ts");
  const ticks = monthTicks("2026-01-01", "2026-09-08");
  assert.equal(ticks[0], isoDayUtc("2026-01-01"));
  assert.equal(ticks[1], isoDayUtc("2026-02-01"));
  assert.equal(ticks.at(-1), isoDayUtc("2026-09-01"));
  assert.equal(ticks.length, 9);
});
