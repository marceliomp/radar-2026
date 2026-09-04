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
    poll("old", "2026-08-20", 50, 20, { lula: 55, flavio: 35 }),
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
  assert.match(curve, /CURVE_PERIOD_DAYS/);
  assert.match(curve, /Média do período/);
  assert.match(curve, /o dia e os últimos 2 dias/);
  assert.match(curve, /monotone/);
  assert.doesNotMatch(curve, /média das 3 últimas/);
  assert.doesNotMatch(curve, /rollingAverage/);
});

test("asOfDayAverages drops polls older than the window", async () => {
  const { asOfDayAverages, CURVE_PERIOD_DAYS } = await import("../src/lib/forecast/curve-series.ts");
  assert.equal(CURVE_PERIOD_DAYS, 2);
  const polls = [
    poll("old", "2026-08-20", 50, 20, { lula: 55, flavio: 35 }),
    poll("new", "2026-09-01", 40, 40, { lula: 45, flavio: 45 }),
  ];
  const week = asOfDayAverages(polls, "2026-09-03", 2, false);
  const last = week[week.length - 1];
  assert.equal(last.date, "2026-09-01");
  assert.equal(last.lula, 40);
});

test("window keeps this day plus 2 previous and drops the 3rd", async () => {
  const { asOfDayAverages } = await import("../src/lib/forecast/curve-series.ts");
  const polls = [
    poll("d3", "2026-08-31", 20, 50, { lula: 30, flavio: 60 }),
    poll("d2", "2026-09-01", 50, 20, { lula: 55, flavio: 35 }),
    poll("today", "2026-09-03", 40, 40, { lula: 45, flavio: 45 }),
  ];
  const days = asOfDayAverages(polls, "2026-09-03", 2, false);
  const last = days[days.length - 1];
  assert.equal(last.date, "2026-09-03");
  assert.ok(last.lula > 40 && last.lula < 50, "2-day-old poll still mixes");
  const onlyEdge = asOfDayAverages(
    [polls[0], polls[2]],
    "2026-09-03",
    2,
    false,
  );
  const lastEdge = onlyEdge[onlyEdge.length - 1];
  assert.equal(lastEdge.lula, 40, "3-day-old poll must drop");
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
  assert.match(curve, /axisTicks/);
  assert.match(curve, /cursor=\{\{ stroke: CHART.axis/);
  assert.doesNotMatch(curve, /cursor=\{false\}/);
  assert.doesNotMatch(curve, /data=\{daily\}/);
  assert.doesNotMatch(curve, /tickCount: 7/);
});

test("tooltip puts period average above the houses", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const avgAt = curve.indexOf("Média do período");
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
  assert.match(curve, /showOthers/);
  assert.match(curve, /\[0, 50\]/);
  assert.match(curve, /Cury/);
  assert.match(curve, /connectNulls/);
});
