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

test("held: só avisa pesquisa presa nova, com lido x manchete e link", async () => {
  const { heldMessage } = await import("./radar-alert.mjs");
  const { HELD_REASON } = await import("./process-pending.mjs");
  const rows = [
    {
      tse: "BR-03835/2026",
      institute: "Gerp",
      fieldEnd: "2026-10-21",
      reason: HELD_REASON,
      parsed: { lula: 49, flavio: 46 },
      headline: { flavio: 53, lula: 47 },
      url: "https://exame.com/brasil/pesquisa-gerp-flavio-bolsonaro-tem-53-e-lula-47-no-2o-turno/",
    },
    { tse: "BR-09540/2026", institute: "Datafolha", fieldEnd: "2026-10-24", reason: "número ainda não extraído (TSE)" },
  ];
  const first = heldMessage(rows, []);
  assert.deepEqual(first.tse, ["BR-03835/2026"]);
  assert.match(first.text, /lido F 46 x L 49, manchete F 53 x L 47/);
  assert.match(first.text, /exame\.com/);
  assert.equal(heldMessage(rows, first.tse).text, null);
});
