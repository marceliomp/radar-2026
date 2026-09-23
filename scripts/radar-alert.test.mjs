import assert from "node:assert/strict";
import { test } from "node:test";
import { stallMessage, stuckNational } from "./radar-alert.mjs";

const now = new Date("2026-09-23T15:00:00Z");

test("recent polls.json is silent", () => {
  assert.equal(stallMessage({ lastCommitIso: "2026-09-22T12:00:00Z", now }), null);
});

test("48h+ without a poll alerts with the stuck national list", () => {
  const text = stallMessage({
    lastCommitIso: "2026-09-21T13:00:00Z",
    now,
    pendingRows: [
      { tse: "BR-08886/2026", institute: "Quaest", fieldEnd: "2026-09-20" },
      { tse: "BR-00304/2026", institute: "Datafolha", fieldEnd: "2026-09-24" },
      { tse: "SC-07754/2026", institute: "Estadual", fieldEnd: "2026-08-28" },
    ],
  });
  assert.match(text, /há 50h/);
  assert.match(text, /Quaest BR-08886\/2026/);
  assert.doesNotMatch(text, /Datafolha/);
  assert.doesNotMatch(text, /SC-07754/);
});

test("stuckNational keeps BR rows whose field ended 2+ days ago, newest first", () => {
  const rows = stuckNational(
    [
      { tse: "BR-1", fieldEnd: "2026-09-10" },
      { tse: "BR-2", fieldEnd: "2026-09-21" },
      { tse: "BR-3", fieldEnd: "2026-09-22" },
    ],
    now,
  );
  assert.deepEqual(rows.map((r) => r.tse), ["BR-2", "BR-1"]);
});
