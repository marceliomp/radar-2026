import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  nationalChanceMarks,
  shortHouseName,
} from "../src/lib/chance-marks.ts";

test("chance chart draws end labels and national marks including Datafolha/Quaest", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const messages = readFileSync("src/lib/i18n/messages.ts", "utf8");
  assert.match(curve, /nationalChanceMarks/);
  assert.match(curve, /from "@\/lib\/chance-marks"/);
  assert.match(curve, /chanceEndLabel/);
  assert.match(curve, /showEndLabels/);
  assert.match(curve, /ReferenceLine/);
  assert.match(curve, /LabelList/);
  assert.match(curve, /stepBefore/);
  assert.match(messages, /seriesChanceMeta: "replay · 5"/);
  assert.doesNotMatch(messages, /seriesChanceMeta: "publicada"/);
  assert.doesNotMatch(messages, /chanceKicker: "Chance publicada"/);
});

test("nationalChanceMarks labels Datafolha 11/09 and Quaest 14/09", () => {
  assert.equal(shortHouseName("Datafolha"), "Datafolha");
  assert.equal(shortHouseName("Genial/Quaest"), "Quaest");
  const polls = [
    {
      institute: "Datafolha",
      date: "2026-09-11",
      national: true,
    },
    {
      institute: "Genial/Quaest",
      date: "2026-09-14",
      national: true,
    },
    {
      institute: "Gerp",
      date: "2026-09-09",
      national: true,
    },
  ];
  const marks = nationalChanceMarks(polls, "2026-09-14", 60, "pt");
  const df = marks.find((m) => m.date === "2026-09-11");
  const q = marks.find((m) => m.date === "2026-09-14");
  const g = marks.find((m) => m.date === "2026-09-09");
  assert.ok(df);
  assert.equal(df.label, "Datafolha 11/09");
  assert.ok(q);
  assert.equal(q.label, "Quaest 14/09");
  assert.ok(g);
  assert.equal(g.label, null);
});
