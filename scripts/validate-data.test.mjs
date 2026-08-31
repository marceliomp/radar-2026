import assert from "node:assert/strict";
import { test } from "node:test";
import { validatePolls } from "./validate-data.mjs";

function validPoll(id = "poll-1", protocol = "BR-00001/2026") {
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

test("validatePolls aceita registro completo", () => {
  assert.deepEqual(validatePolls([validPoll()]), []);
});

test("validatePolls recusa fonte ausente, percentual inválido e duplicatas", () => {
  const first = validPoll();
  const duplicate = validPoll("poll-1", "BR-00001/2026");
  duplicate.firstRound.lula = 101;
  delete duplicate.source;
  const errors = validatePolls([first, duplicate]);
  assert.ok(errors.some((error) => error.includes("id duplicado")));
  assert.ok(errors.some((error) => error.includes("fora de 0..100")));
  assert.ok(errors.some((error) => error.includes("source estruturado ausente")));
});
