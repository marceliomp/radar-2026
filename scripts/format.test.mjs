import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/format.ts");
}

test("field range is start to end, not a single day", async () => {
  const { fieldRangeLabel } = await load();
  assert.equal(fieldRangeLabel("2026-08-30", "2026-09-01"), "30/08 a 01/09");
  assert.equal(fieldRangeLabel("2026-09-01", "2026-09-01"), "01/09");
  assert.equal(fieldRangeLabel(undefined, "2026-09-01"), "até 01/09");
  assert.equal(fieldRangeLabel(null, "2026-09-01"), "até 01/09");
});

test("Quaest 42×41 ±2 is a lead inside the house margin", async () => {
  const { pairTightness, pairTightnessLine } = await load();
  const t = pairTightness(42, 41, 2);
  assert.equal(t.kind, "inside");
  assert.equal(t.gap, 1);
  assert.equal(t.leader, "a");
  const line = pairTightnessLine("Lula", "Flávio", 42, 41, 2);
  assert.match(line, /Lula 42,0%/);
  assert.match(line, /Flávio 41,0%/);
  assert.match(line, /dentro da margem/);
  assert.match(line, /2,0/);
  assert.doesNotMatch(line, /\u2014/);
  assert.doesNotMatch(line, /Allowlist/);
});

test("gap above moe is outside the house margin", async () => {
  const { pairTightness, pairTightnessLine } = await load();
  const t = pairTightness(45, 40, 2);
  assert.equal(t.kind, "outside");
  assert.equal(t.gap, 5);
  const line = pairTightnessLine("Lula", "Flávio", 45, 40, 2);
  assert.match(line, /fora da margem/);
  assert.doesNotMatch(line, /dentro da margem/);
});

test("equal percents are a tie in this house", async () => {
  const { pairTightness, pairTightnessLine } = await load();
  const t = pairTightness(44, 44, 2);
  assert.equal(t.kind, "tie");
  assert.equal(t.leader, "tie");
  const line = pairTightnessLine("Lula", "Flávio", 44, 44, 2);
  assert.match(line, /empate nesta casa/);
});
