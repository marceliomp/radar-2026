import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { upsertPoint } from "./chance-history.mjs";

test("history has 60 daily points covering the window through 14/09", () => {
  const file = JSON.parse(readFileSync("src/data/chance-history.json", "utf8"));
  assert.equal(file.windowDays, 60);
  assert.equal(file.points.length, 60);
  assert.equal(file.points[0].date, "2026-07-17");
  assert.equal(file.points.at(-1).date, "2026-09-14");
  assert.equal(file.points.at(-1).source, "promote");
  assert.ok(file.points.slice(0, -1).every((p) => p.source === "replay"));
  // consecutive calendar days
  for (let i = 1; i < file.points.length; i++) {
    const prev = new Date(`${file.points[i - 1].date}T12:00:00Z`).getTime();
    const cur = new Date(`${file.points[i].date}T12:00:00Z`).getTime();
    assert.equal(cur - prev, 86_400_000);
  }
});

test("key September replay dates are engine outputs, not invented votes", () => {
  const file = JSON.parse(readFileSync("src/data/chance-history.json", "utf8"));
  const byDate = Object.fromEntries(file.points.map((p) => [p.date, p]));
  assert.equal(byDate["2026-09-10"].lula, 51.6);
  assert.equal(byDate["2026-09-10"].flavio, 48.4);
  assert.equal(byDate["2026-09-11"].lula, 52.8);
  assert.equal(byDate["2026-09-11"].flavio, 47.2);
  assert.equal(byDate["2026-09-12"].lula, 52.8);
  assert.equal(byDate["2026-09-12"].flavio, 47.2);
  assert.equal(byDate["2026-09-13"].lula, 52.8);
  assert.equal(byDate["2026-09-13"].flavio, 47.2);
  assert.equal(byDate["2026-09-14"].lula, 51.5);
  assert.equal(byDate["2026-09-14"].flavio, 48.5);
});

test("upsertPoint replaces same date and sorts", () => {
  const file = {
    version: 1,
    windowDays: 60,
    points: [
      { date: "2026-09-12", lula: 51.6, flavio: 48.4, source: "replay" },
    ],
  };
  const next = upsertPoint(file, {
    date: "2026-09-12",
    lula: 52.0,
    flavio: 48.0,
    source: "replay",
  });
  assert.equal(next.points.length, 1);
  assert.equal(next.points[0].lula, 52);
  assert.equal(next.points[0].source, "replay");
  const two = upsertPoint(next, {
    date: "2026-09-13",
    lula: 53.1,
    flavio: 46.9,
    source: "replay",
  });
  assert.deepEqual(
    two.points.map((p) => p.date),
    ["2026-09-12", "2026-09-13"],
  );
});

test("step series holds chance across days from daily replay points", async () => {
  const {
    buildChanceStepSeries,
    pointsInWindow,
    CHANCE_HISTORY_DAYS,
  } = await import("../src/lib/chance-history.ts");
  const points = [
    { date: "2026-09-10", lula: 51.6, flavio: 48.4, source: "replay" },
    { date: "2026-09-11", lula: 52.8, flavio: 47.2, source: "replay" },
  ];
  assert.equal(pointsInWindow(points, "2026-09-13", CHANCE_HISTORY_DAYS).length, 2);
  const series = buildChanceStepSeries(points, "2026-09-13", CHANCE_HISTORY_DAYS);
  assert.ok(series.length >= 4);
  assert.equal(series[0].date, "2026-09-10");
  assert.equal(series[0].flavio, 48.4);
  const on11 = series.find((r) => r.date === "2026-09-11");
  assert.equal(on11.lula, 52.8);
  assert.equal(series.at(-1).date, "2026-09-13");
  assert.equal(series.at(-1).lula, 52.8);
  assert.equal(series.at(-1).publishedOn, "2026-09-11");
});

test("growth curve toggles Média|Chance on #curva with step line", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /id="curva"/);
  assert.match(curve, /m\.curve\.seriesAvg/);
  assert.match(curve, /m\.curve\.seriesChance/);
  assert.match(curve, /setSeries\("avg"\)/);
  assert.match(curve, /setSeries\("chance"\)/);
  assert.match(curve, /stepAfter/);
  assert.match(curve, /step=\{chanceMode\}/);
  assert.match(curve, /m\.curve\.chanceLede/);
  assert.match(curve, /Não é pesquisa|chanceLede/);
});

test("publish-polls appends chance history when polls move", () => {
  const publish = readFileSync("scripts/publish-polls.mjs", "utf8");
  assert.match(publish, /chance-history\.json/);
  assert.match(publish, /appendPublishedChance/);
  assert.doesNotMatch(publish, /crm|meta-ads|invent/i);
});

test("backfill script replays engine and labels source replay", () => {
  const backfill = readFileSync("scripts/backfill-chance-history.mjs", "utf8");
  assert.match(backfill, /source: "replay"/);
  assert.match(backfill, /halfLifeDays: HALF_LIFE/);
  assert.match(backfill, /HALF_LIFE = 15/);
  assert.match(backfill, /runForecast/);
  assert.doesNotMatch(backfill, /source: "promote"/);
});
