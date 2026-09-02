import assert from "node:assert/strict";
import { test } from "node:test";
import { promotePoll, promoteReady } from "./promote-poll.mjs";

function poll(id, protocol) {
  return {
    id,
    institute: "Casa Teste",
    date: "2026-08-30",
    fieldEnd: "2026-08-29",
    sample: 1200,
    moe: 3,
    mode: "presencial",
    national: true,
    firstRound: { lula: 40, flavio: 35 },
    source: {
      tseProtocol: protocol,
      url: "https://example.com/pesquisa",
      publisher: "example.com",
      publishedAt: "2026-08-30",
      capturedAt: "2026-08-31T12:00:00.000Z",
    },
  };
}

test("promotePoll move uma proposta validada para a fonte pública", () => {
  const existing = poll("existing", "BR-00001/2026");
  const candidate = poll("candidate", "BR-00002/2026");
  const out = promotePoll({
    protocol: "BR000022026",
    polls: [existing],
    ready: [candidate],
  });
  assert.deepEqual(out.polls.map((row) => row.id), ["existing", "candidate"]);
  assert.deepEqual(out.ready, []);
});

test("promotePoll recusa protocolo duplicado antes de escrever", () => {
  const existing = poll("existing", "BR-00001/2026");
  const candidate = poll("candidate", "BR-00001/2026");
  assert.throws(
    () => promotePoll({ protocol: "BR-00001/2026", polls: [existing], ready: [candidate] }),
    /protocolo TSE duplicado/,
  );
});

test("promoteReady promove todas as propostas válidas", () => {
  const existing = poll("existing", "BR-00001/2026");
  const a = poll("a", "BR-00002/2026");
  const b = poll("b", "BR-00003/2026");
  const out = promoteReady({ polls: [existing], ready: [a, b] });
  assert.deepEqual(out.polls.map((row) => row.id), ["existing", "a", "b"]);
  assert.equal(out.ready.length, 0);
  assert.equal(out.promoted.length, 2);
  assert.equal(out.failed.length, 0);
});

test("promoteReady ignora protocolo duplicado e segue", () => {
  const existing = poll("existing", "BR-00001/2026");
  const dup = poll("dup", "BR-00001/2026");
  const ok = poll("ok", "BR-00004/2026");
  const out = promoteReady({ polls: [existing], ready: [dup, ok] });
  assert.deepEqual(out.polls.map((row) => row.id), ["existing", "ok"]);
  assert.equal(out.promoted.length, 1);
  assert.equal(out.failed.length, 1);
});
