import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ingestHealthIssues,
  partitionIngestHealthIssues,
} from "./ingest-health.mjs";

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

test("future race date is fatal", () => {
  const issues = ingestHealthIssues({
    polls: [stub({})],
    races: { polls: [{ id: "ba-gov", date: "2026-09-08", fieldEnd: "2026-09-07" }] },
    today: "2026-09-03",
  });
  const { fatal, warnings } = partitionIngestHealthIssues(issues);
  assert.ok(fatal.some((row) => /ba-gov: data futura/.test(row)));
  assert.equal(warnings.length, 0);
});

test("latest national without 2T is a warning, not fatal", () => {
  const issues = ingestHealthIssues({
    polls: [stub({ secondRound: undefined })],
    races: { polls: [] },
    today: "2026-09-03",
  });
  const { fatal, warnings } = partitionIngestHealthIssues(issues);
  assert.ok(warnings.some((row) => /2T ausente/.test(row)));
  assert.deepEqual(fatal, []);
});

test("current PoderData-like file is clean", () => {
  const issues = ingestHealthIssues({
    polls: [stub({})],
    races: { polls: [{ id: "sp-gov", date: "2026-09-03", fieldEnd: "2026-09-02" }] },
    today: "2026-09-03",
  });
  assert.deepEqual(partitionIngestHealthIssues(issues), { warnings: [], fatal: [] });
});
