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


test("missing third-candidate key is not treated as 0", async () => {
  const { runForecast, DEFAULT_CONFIG } = await importEngine();
  const polls = [
    {
      id: "asked",
      institute: "Datafolha",
      date: "2026-08-21",
      fieldEnd: "2026-08-21",
      sample: 2058,
      moe: 2,
      mode: "presencial",
      national: true,
      firstRound: { lula: 39, flavio: 33, cury: 2 },
    },
    {
      id: "omitted",
      institute: "Gerp",
      date: "2026-08-26",
      fieldEnd: "2026-08-25",
      sample: 2400,
      moe: 2,
      mode: "telefone",
      national: true,
      firstRound: { lula: 37, flavio: 38 },
    },
  ];
  const snap = runForecast(polls, {
    ...DEFAULT_CONFIG,
    asOf: "2026-08-28",
    simulations: 200,
    useTrackRecord: false,
  });
  assert.equal(snap.first.cury.nPolls, 1);
  assert.ok(
    snap.first.cury.mean > 1.5 && snap.first.cury.mean < 2.5,
    "cury mean " + snap.first.cury.mean + " was diluted toward 0",
  );
  assert.equal(snap.first.renan.nPolls, 0);
  assert.equal(snap.first.renan.mean, 0);
});


test("1T com 4,6 pts nao e empate tecnico", async () => {
  const { runForecast, DEFAULT_CONFIG } = await importEngine();
  const polls = [
    {
      id: "a",
      institute: "Datafolha",
      date: "2026-08-21",
      fieldEnd: "2026-08-21",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      national: true,
      firstRound: { lula: 40, flavio: 32 },
      secondRound: { lula: 45, flavio: 44 },
    },
    {
      id: "b",
      institute: "Quaest",
      date: "2026-08-25",
      fieldEnd: "2026-08-24",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      national: true,
      firstRound: { lula: 39, flavio: 38 },
      secondRound: { lula: 45, flavio: 43 },
    },
  ];
  const snap = runForecast(polls, {
    ...DEFAULT_CONFIG,
    asOf: "2026-08-29",
    simulations: 1500,
    useTrackRecord: false,
  });
  const gap = Math.abs(snap.first.lula.mean - snap.first.flavio.mean);
  assert.ok(gap > 3, "fixture precisa de gap visivel, veio " + gap);
  assert.equal(snap.first.technicalTie, false);
  assert.equal(snap.second.technicalTie, true);
});

test("dedupe drops same house + field + n + 1T", async () => {
  const { dedupePolls } = await importEngine();
  const a = {
    id: "gerp-rich",
    institute: "Gerp",
    date: "2026-08-11",
    fieldEnd: "2026-08-10",
    sample: 2400,
    moe: 2,
    mode: "telefone",
    national: true,
    firstRound: { lula: 38, flavio: 38 },
    secondRound: { lula: 45, flavio: 44 },
    notes: "CNN. Rejeição.",
  };
  const b = {
    id: "gerp-clone",
    institute: "Gerp",
    date: "2026-08-10",
    fieldEnd: "2026-08-10",
    sample: 2400,
    moe: 2,
    mode: "telefone",
    national: true,
    firstRound: { lula: 38, flavio: 38 },
    notes: "TSE clone",
  };
  const out = dedupePolls([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "gerp-rich");
});

test("house cap stops one house from eating the average", async () => {
  const { runForecast, DEFAULT_CONFIG, housesInAverage } = await importEngine();
  const polls = [];
  for (let i = 0; i < 8; i++) {
    polls.push({
      id: `pd-${i}`,
      institute: "PoderData/Aya",
      date: `2026-08-${String(10 + i).padStart(2, "0")}`,
      fieldEnd: `2026-08-${String(10 + i).padStart(2, "0")}`,
      sample: 2400,
      moe: 2,
      mode: "telefone",
      national: true,
      firstRound: { lula: 40, flavio: 35 },
      secondRound: { lula: 48, flavio: 42 },
    });
  }
  const extras = [
    ["Datafolha", "presencial"],
    ["Quaest", "presencial"],
    ["Gerp", "telefone"],
    ["Nexus/BTG", "telefone"],
    ["Veritá", "telefone"],
  ];
  extras.forEach(([institute, mode], j) => {
    polls.push({
      id: `x-${j}`,
      institute,
      date: "2026-08-20",
      fieldEnd: "2026-08-20",
      sample: 2000,
      moe: 2,
      mode,
      national: true,
      firstRound: { lula: 39, flavio: 33 },
      secondRound: { lula: 47, flavio: 40 },
    });
  });
  const snap = runForecast(polls, {
    ...DEFAULT_CONFIG,
    asOf: "2026-08-28",
    simulations: 800,
    houseCap: 0.22,
  });
  const chips = housesInAverage(snap.rows);
  const pd = chips.find((c) => c.institute === "PoderData/Aya");
  assert.ok(pd, "PoderData no chip");
  assert.ok(pd.share <= 0.23, `cap falhou: ${pd.share}`);
});

test("chips da media nao listam casa ausente", async () => {
  const { runForecast, DEFAULT_CONFIG, housesInAverage } = await importEngine();
  const snap = runForecast(
    [
      {
        id: "df",
        institute: "Datafolha",
        date: "2026-08-20",
        fieldEnd: "2026-08-20",
        sample: 2000,
        moe: 2,
        mode: "presencial",
        national: true,
        firstRound: { lula: 39, flavio: 33 },
        secondRound: { lula: 47, flavio: 40 },
      },
    ],
    { ...DEFAULT_CONFIG, asOf: "2026-08-28", simulations: 400 },
  );
  const names = housesInAverage(snap.rows).map((c) => c.institute);
  assert.deepEqual(names, ["Datafolha"]);
  assert.ok(!names.includes("Paraná Pesquisas"));
});
