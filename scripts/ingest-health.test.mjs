import assert from "node:assert/strict";
import { test } from "node:test";
import { ingestHealthIssues } from "./ingest-health.mjs";

function stub(partial) {
  return {
    id: "x",
    institute: "Casa",
    date: "2026-09-03",
    fieldEnd: "2026-09-02",
    national: true,
    firstRound: { lula: 37, flavio: 34 },
    secondRound: { lula: 44, flavio: 45 },
    ...partial,
  };
}

test("future race date is an issue", () => {
  const issues = ingestHealthIssues({
    polls: [stub({})],
    races: { polls: [{ id: "ba-gov", date: "2026-09-08", fieldEnd: "2026-09-07" }] },
    today: "2026-09-03",
  });
  assert.ok(issues.some((row) => /ba-gov: data futura/.test(row)));
});

test("latest national without 2T is an issue", () => {
  const issues = ingestHealthIssues({
    polls: [stub({ secondRound: undefined })],
    races: { polls: [] },
    today: "2026-09-03",
  });
  assert.ok(issues.some((row) => /2T ausente/.test(row)));
});

test("current PoderData-like file is clean", () => {
  const issues = ingestHealthIssues({
    polls: [stub({})],
    races: { polls: [{ id: "sp-gov", date: "2026-09-03", fieldEnd: "2026-09-02" }] },
    today: "2026-09-03",
  });
  assert.deepEqual(issues, []);
});
