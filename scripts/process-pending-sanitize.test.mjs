import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeFirstRound } from "./process-pending.mjs";

test("sanitizeFirstRound drops rejection-sized extras that break 100%", () => {
  const out = sanitizeFirstRound({
    lula: 40.5,
    flavio: 30.4,
    cury: 6,
    caiado: 36.1,
  });
  assert.equal(out.lula, 40.5);
  assert.equal(out.flavio, 30.4);
  assert.equal(out.cury, 6);
  assert.equal(out.caiado, undefined);
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  assert.ok(sum <= 100.5);
});

test("sanitizeFirstRound keeps a valid CNT-like 1T", () => {
  const out = sanitizeFirstRound({
    lula: 40.5,
    flavio: 30.4,
    cury: 6,
    caiado: 3,
    renan: 2.7,
    zema: 1,
  });
  assert.deepEqual(out, {
    lula: 40.5,
    flavio: 30.4,
    cury: 6,
    caiado: 3,
    renan: 2.7,
    zema: 1,
  });
});
