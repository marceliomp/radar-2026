import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  clampHalfLife,
  DEFAULT_HALF_LIFE,
  HL_MAX,
  HL_MIN,
  yearToDateDays,
} from "../src/lib/period.ts";

test("public default period is 15 days, not YTD", () => {
  assert.equal(DEFAULT_HALF_LIFE, 15);
  assert.equal(clampHalfLife(DEFAULT_HALF_LIFE), 15);
});

test("YTD from 1 jan to 8 set 2026 clamps to the 90-day cap", () => {
  assert.equal(yearToDateDays("2026-09-08"), 90);
});

test("YTD clamps to HL_MIN in the first days of January", () => {
  assert.equal(yearToDateDays("2026-01-01"), HL_MIN);
  assert.equal(yearToDateDays("2026-01-03"), HL_MIN);
});

test("clampHalfLife caps at 90 days", () => {
  assert.equal(HL_MAX, 90);
  assert.equal(clampHalfLife(14), 14);
  assert.equal(clampHalfLife(40), 40);
  assert.equal(clampHalfLife(90), 90);
  assert.equal(clampHalfLife(91), 90);
  assert.equal(clampHalfLife(250), 90);
  assert.equal(clampHalfLife(365), 90);
  assert.equal(clampHalfLife(400), 90);
  assert.equal(clampHalfLife(1), HL_MIN);
});

test("?hl= parser uses clampHalfLife so values above 90 become 90", () => {
  const src = readFileSync("src/lib/half-life.ts", "utf8");
  assert.match(src, /parseHalfLifeParam/);
  assert.match(src, /return clampHalfLife\(raw\)/);
  assert.match(src, /return clampHalfLife\(n\)/);
});
