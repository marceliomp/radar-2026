import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/visit-delta.ts");
}

test("first visit tells the truth about the file", async () => {
  const { visitView, fileStamp } = await load();
  const v = visitView(null, {
    pLula: 63.2,
    pFlavio: 36.8,
    hl: 14,
    newestId: "poderdata-08-26",
  });
  assert.equal(v.kind, "first");
  assert.match(v.line, /arquivo/);
  assert.match(
    fileStamp({ institute: "PoderData/Aya", fieldEnd: "2026-08-26" }),
    /PoderData 26\/08/,
  );
  assert.match(
    fileStamp({ institute: "PoderData/Aya", fieldEnd: "2026-08-26" }),
    /não entra número/,
  );
});

test("reload in the same session does not fake movement", async () => {
  const { visitView } = await load();
  const prev = {
    at: 1_000_000,
    pLula: 63.2,
    pFlavio: 36.8,
    hl: 14,
    newestId: "a",
  };
  const v = visitView(prev, {
    pLula: 63.2,
    pFlavio: 36.8,
    hl: 14,
    newestId: "a",
    nowMs: 1_000_000 + 5 * 60_000,
  });
  assert.equal(v.kind, "stale");
  assert.match(v.line, /Reload agora não muda/);
});

test("new poll in the file is the hook", async () => {
  const { visitView } = await load();
  const prev = {
    at: 1,
    pLula: 60,
    pFlavio: 40,
    hl: 14,
    newestId: "old",
  };
  const v = visitView(prev, {
    pLula: 62.4,
    pFlavio: 37.6,
    hl: 14,
    newestId: "new",
    nowMs: 1 + 36e5,
  });
  assert.equal(v.kind, "new-poll");
  assert.match(v.line, /Pesquisa nova/);
  assert.match(v.line, /Lula \+2,4/);
});

test("periodo change is named as memory, not as a new poll", async () => {
  const { visitView } = await load();
  const prev = {
    at: 1,
    pLula: 63.2,
    pFlavio: 36.8,
    hl: 14,
    newestId: "a",
  };
  const v = visitView(prev, {
    pLula: 58.1,
    pFlavio: 41.9,
    hl: 5,
    newestId: "a",
    nowMs: 1 + 60_000,
  });
  assert.equal(v.kind, "hl");
  assert.match(v.line, /Período 5/);
  assert.doesNotMatch(v.line, /Pesquisa nova/);
});
