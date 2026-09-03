import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("poll series has no connecting stroke", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const poll = curve.split('dataKey="lulaPoll"')[1].split('dataKey="flavioPoll"')[0];
  const flavio = curve.split('dataKey="flavioPoll"')[1].split('dataKey="lulaAvg"')[0];
  assert.match(poll, /stroke="none"/);
  assert.match(flavio, /stroke="none"/);
  assert.doesNotMatch(poll, /strokeOpacity/);
  assert.match(curve, /lastRowPerDay/);
  assert.match(curve, /data=\{daily\}/);
});

test("average line collapses same-day rows", () => {
  const src = readFileSync("src/lib/forecast/trends.ts", "utf8");
  assert.match(src, /export function lastRowPerDay/);
  assert.match(src, /prev\.t === row\.t/);
  assert.match(src, /out\[out\.length - 1\] = row/);
});
