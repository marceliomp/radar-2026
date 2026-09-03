import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/election-calendar.ts");
}

test("3 set is 31 days before 1st round and fill is inside the bar", async () => {
  const { electionBarView } = await load();
  const view = electionBarView("2026-09-03");
  assert.match(view.label, /Faltam 31 dias para o 1º turno, 04\/10/);
  assert.ok(view.pct > 10 && view.pct < 90);
  assert.equal(view.marks.at(-1)?.text, "2º 25/10");
});

test("election day labels", async () => {
  const { electionBarView } = await load();
  assert.equal(electionBarView("2026-10-04").label, "1º turno hoje, 04/10");
  assert.equal(electionBarView("2026-10-25").label, "2º turno hoje, 25/10");
});
