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
