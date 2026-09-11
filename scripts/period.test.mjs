import assert from "node:assert/strict";
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

test("YTD from 1 jan to 8 set 2026 is 250 days", () => {
  assert.equal(yearToDateDays("2026-09-08"), 250);
});

test("YTD clamps to HL_MIN in the first days of January", () => {
  assert.equal(yearToDateDays("2026-01-01"), HL_MIN);
  assert.equal(yearToDateDays("2026-01-03"), HL_MIN);
});

test("clampHalfLife respects year-long window", () => {
  assert.equal(HL_MAX, 365);
  assert.equal(clampHalfLife(14), 14);
  assert.equal(clampHalfLife(40), 40);
  assert.equal(clampHalfLife(250), 250);
  assert.equal(clampHalfLife(400), 365);
  assert.equal(clampHalfLife(1), HL_MIN);
});
