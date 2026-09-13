import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { upsertPoint } from "./chance-history.mjs";

test("seed history has one citeable 2026-09-12 point at 51.6/48.4", () => {
  const file = JSON.parse(readFileSync("src/data/chance-history.json", "utf8"));
  assert.equal(file.windowDays, 60);
  assert.equal(file.points.length, 1);
  const [p] = file.points;
  assert.equal(p.date, "2026-09-12");
  assert.equal(p.lula, 51.6);
  assert.equal(p.flavio, 48.4);
  assert.equal(p.source, "og-card");
  assert.ok(p.commit);
});

test("upsertPoint replaces same date and sorts", () => {
  const file = {
    version: 1,
    windowDays: 60,
    points: [
      { date: "2026-09-12", lula: 51.6, flavio: 48.4, source: "og-card" },
    ],
  };
  const next = upsertPoint(file, {
    date: "2026-09-12",
    lula: 52.0,
    flavio: 48.0,
    source: "promote",
    commit: "abc",
  });
  assert.equal(next.points.length, 1);
  assert.equal(next.points[0].lula, 52);
  assert.equal(next.points[0].source, "promote");
  const two = upsertPoint(next, {
    date: "2026-09-13",
    lula: 53.1,
    flavio: 46.9,
    source: "promote",
  });
  assert.deepEqual(
    two.points.map((p) => p.date),
    ["2026-09-12", "2026-09-13"],
  );
});

test("step series holds published chance and does not invent Sep 10", async () => {
  const {
    buildChanceStepSeries,
    pointsInWindow,
    CHANCE_HISTORY_DAYS,
  } = await import("../src/lib/chance-history.ts");
  const points = [
    { date: "2026-09-12", lula: 51.6, flavio: 48.4, source: "og-card" },
  ];
  assert.equal(pointsInWindow(points, "2026-09-13", CHANCE_HISTORY_DAYS).length, 1);
  assert.equal(pointsInWindow(points, "2026-09-11", CHANCE_HISTORY_DAYS).length, 0);
  const series = buildChanceStepSeries(points, "2026-09-13", CHANCE_HISTORY_DAYS);
  assert.ok(series.length >= 2);
  assert.equal(series[0].date, "2026-09-12");
  assert.equal(series[0].lula, 51.6);
  assert.equal(series.at(-1).date, "2026-09-13");
  assert.equal(series.at(-1).lula, 51.6);
  assert.equal(series.at(-1).publishedOn, "2026-09-12");
  assert.ok(!series.some((row) => row.date === "2026-09-10"));
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
  assert.doesNotMatch(curve, /59%/);
});

test("publish-polls appends chance history when polls move", () => {
  const publish = readFileSync("scripts/publish-polls.mjs", "utf8");
  assert.match(publish, /chance-history\.json/);
  assert.match(publish, /appendPublishedChance/);
  assert.doesNotMatch(publish, /crm|meta-ads|invent/i);
});
