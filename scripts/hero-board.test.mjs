import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/hero-board.ts");
}

test("lula and flavio under 100% get an Outros remainder from rounded screen %", async () => {
  const { buildHeroBoard } = await load();
  const board = buildHeroBoard({
    lulaWinsElection: 0.4674,
    flavioWinsElection: 0.5216,
    curyWinsElection: 0.006,
    caiadoWinsElection: 0.003,
    renanWinsElection: 0.001,
    zemaWinsElection: 0.001,
  });
  assert.equal(board.length, 3);
  assert.equal(board[0].key, "flavio");
  assert.equal(board[1].key, "lula");
  assert.equal(board[2].key, "outros");
  const { round } = await import("../src/lib/format.ts");
  const flavio = round(board[0].p * 100, 1);
  const lula = round(board[1].p * 100, 1);
  const outros = round(board[2].p * 100, 1);
  assert.equal(flavio, 52.2);
  assert.equal(lula, 46.7);
  assert.equal(outros, 1.1);
  assert.equal(round(flavio + lula + outros, 1), 100);
});

test("a named extra at 1% takes the third slot, no Outros", async () => {
  const { buildHeroBoard } = await load();
  const board = buildHeroBoard({
    lulaWinsElection: 0.48,
    flavioWinsElection: 0.47,
    curyWinsElection: 0.02,
    caiadoWinsElection: 0.015,
  });
  const keys = board.map((row) => row.key);
  assert.ok(keys.includes("cury"));
  assert.equal(keys.includes("outros"), false);
  assert.equal(board.length, 3);
});

test("zero remainder does not invent Outros", async () => {
  const { buildHeroBoard } = await load();
  const board = buildHeroBoard({
    lulaWinsElection: 0.5,
    flavioWinsElection: 0.5,
  });
  assert.equal(board.length, 2);
  assert.deepEqual(
    board.map((row) => row.key),
    ["lula", "flavio"],
  );
});

test("lead pair order ignores Outros and tracks who is on the left", async () => {
  const { leadPairOrder } = await load();
  assert.equal(leadPairOrder(["flavio", "lula", "outros"]), "flavio|lula");
  assert.equal(leadPairOrder(["lula", "flavio"]), "lula|flavio");
  assert.equal(
    leadPairOrder(["flavio", "lula"]) === leadPairOrder(["lula", "flavio"]),
    false,
  );
});
