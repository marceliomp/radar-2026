import assert from "node:assert/strict";
import { test } from "node:test";
import { mapRoundView } from "../src/lib/forecast/map-round.ts";

const base = {
  n: 3,
  n2: 0,
  first: { lula: 40, flavio: 45, se: 1.5 },
  second: null,
  pFlavio1: 0.93,
  pFlavio2: 0.5,
};

test("2T without asked runoff uses 1T two-way, not mute", () => {
  const v = mapRoundView(base, 2);
  assert.equal(v.polled, true);
  assert.equal(v.implied, true);
  assert.ok(Math.abs(v.lula - (40 / 85) * 100) < 1e-6);
  assert.ok(Math.abs(v.flavio - (45 / 85) * 100) < 1e-6);
  assert.equal(v.pFlavio, 0.93);
});

test("2T with asked runoff keeps real second", () => {
  const v = mapRoundView(
    {
      ...base,
      n2: 2,
      second: { lula: 42, flavio: 47, se: 1.2 },
    },
    2,
  );
  assert.equal(v.implied, false);
  assert.equal(v.lula, 42);
  assert.equal(v.flavio, 47);
  assert.equal(v.n, 2);
  assert.equal(v.pFlavio, 0.5);
});

test("1T is never implied", () => {
  const v = mapRoundView(base, 1);
  assert.equal(v.implied, false);
  assert.equal(v.lula, 40);
  assert.equal(v.flavio, 45);
});

test("shareBarPct leaves the rest of the bar empty", async () => {
  const { shareBarPct } = await import("../src/lib/forecast/map-round.ts");
  const bar = shareBarPct(50, 17);
  assert.equal(bar.lula, 50);
  assert.equal(bar.flavio, 17);
  assert.ok(bar.lula + bar.flavio < 100);
  const tight = shareBarPct(46, 44);
  assert.equal(tight.lula + tight.flavio, 90);
});
