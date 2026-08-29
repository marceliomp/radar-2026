import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { POLLS_2022_CLOSE, POLLS_BLOWOUT } from "./polls-2022-fixture.mjs";

test("close 2022-style 2T does not fake 99% and still favors the leader", async () => {
  const { runForecast, DEFAULT_CONFIG } = await importEngine();
  const snap = runForecast(POLLS_2022_CLOSE, {
    ...DEFAULT_CONFIG,
    asOf: "2022-10-29",
    simulations: 4000,
  });
  assert.ok(snap.probs.goesToSecond > 0.9, "1º apertado vai a 2º");
  assert.ok(
    snap.probs.lulaWinsElection > 0.45 && snap.probs.lulaWinsElection < 0.88,
    `P(Lula) ${snap.probs.lulaWinsElection} fora da faixa calibrada`,
  );
  assert.ok(
    snap.probs.lulaWinsElection > snap.probs.flavioWinsElection,
    "líder no 2º deve ter P(eleição) maior",
  );
});

test("blowout 2T P(win) approaches 100%", async () => {
  const { runForecast, DEFAULT_CONFIG } = await importEngine();
  const snap = runForecast(POLLS_BLOWOUT, {
    ...DEFAULT_CONFIG,
    asOf: "2026-08-28",
    simulations: 4000,
  });
  assert.ok(
    snap.probs.lulaWinsElection > 0.97,
    `esperado ~99%, veio ${snap.probs.lulaWinsElection}`,
  );
  assert.ok(snap.probs.lulaWinsElection + snap.probs.flavioWinsElection > 0.99);
});

test("P(win) sobe quando o gap two-way sobe", async () => {
  const { runForecast, DEFAULT_CONFIG } = await importEngine();
  const tight = runForecast(POLLS_2022_CLOSE, {
    ...DEFAULT_CONFIG,
    asOf: "2022-10-29",
    simulations: 3000,
  });
  const wide = runForecast(POLLS_BLOWOUT, {
    ...DEFAULT_CONFIG,
    asOf: "2026-08-28",
    simulations: 3000,
  });
  assert.ok(wide.probs.lulaWinsElection > tight.probs.lulaWinsElection + 0.1);
});

test("goesToSecond is not clamped to 0.55", async () => {
  const { runForecast, DEFAULT_CONFIG } = await importEngine();
  const snap = runForecast(POLLS_BLOWOUT, {
    ...DEFAULT_CONFIG,
    asOf: "2026-08-28",
    simulations: 2000,
  });
  assert.ok(snap.probs.goesToSecond !== 0.55);
  assert.ok(snap.probs.goesToSecond <= 1);
});

test("casas que mais acertaram pesam mais", async () => {
  const { trackQuality } = await import("../src/lib/forecast/track-record.ts");
  assert.ok(trackQuality("Paraná Pesquisas") > trackQuality("Veritá"));
  assert.ok(trackQuality("Datafolha") > trackQuality("Ipec"));
  assert.ok(trackQuality("Datafolha") > trackQuality("Palver"));
  assert.ok(trackQuality("CNT/MDA") > trackQuality("Veritá"));
  assert.ok(trackQuality("Quaest/Globo") === trackQuality("Quaest"));
});

test("ingest atomic write does not wipe file on failure", async () => {
  const dir = mkdtempSync(join(tmpdir(), "radar-ingest-"));
  const target = join(dir, "polls.json");
  writeFileSync(target, JSON.stringify([{ id: "keep" }]));
  const { atomicWriteJson } = await import("./ingest-polls.mjs");
  try {
    atomicWriteJson(target, undefined);
    assert.fail("should throw");
  } catch {
    const kept = JSON.parse(readFileSync(target, "utf8"));
    assert.equal(kept[0].id, "keep");
  }
});

async function importEngine() {
  return import("../src/lib/forecast/engine.ts");
}
