import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ELECTION_2022 } from "../../data/election-2022.ts";
import { priorSd, projectRunoff, type FirstRoundUf } from "./projection.ts";
import type { CountResult, TseCount } from "./tse.ts";

// 2022 no papel de 2026: Bolsonaro ocupa a vaga de Flávio (22), Lula é 13.
const base2022: Record<string, FirstRoundUf> = Object.fromEntries(
  Object.values(ELECTION_2022).map((r) => [
    r.uf,
    { flavio: r.votes1.bolsonaro, lula: r.votes1.lula, validVotes: r.votes1.bolsonaro + r.votes1.lula },
  ]),
);
const prior2022 = { flavioShare: 0.47, flavioChance: 0.25 };

function count(flavio: number, lula: number, frac: number): TseCount {
  const total = 10_000;
  return {
    status: "ok",
    pctApurado: "",
    pctApuradoExact: String(frac * 100),
    sectionsCounted: Math.round(total * frac),
    sectionsTotal: total,
    updatedAt: null,
    leader: null,
    tie: false,
    candidates: [
      { name: "F", number: "22", party: "", votes: Math.round(flavio), pct: "", pctExact: "", tseElected: false },
      { name: "L", number: "13", party: "", votes: Math.round(lula), pct: "", pctExact: "", tseElected: false },
    ],
    seats: 1,
    proportional: false,
    remainingVotes: null,
    validVotes: Math.round(flavio + lula),
  };
}

/** 2º turno de 2022 com `frac(uf)` das seções apuradas, voto proporcional. */
function snapshot2022(frac: (uf: string) => number): Record<string, CountResult> {
  return Object.fromEntries(
    Object.values(ELECTION_2022).map((r) => {
      const f = frac(r.uf);
      return [
        r.uf,
        f > 0 ? count(r.votes2.bolsonaro * f, r.votes2.lula * f, f) : { status: "aguardando" as const },
      ];
    }),
  );
}

const final2022 = (() => {
  let b = 0;
  let l = 0;
  for (const r of Object.values(ELECTION_2022)) {
    b += r.votes2.bolsonaro;
    l += r.votes2.lula;
  }
  return b / (b + l);
})();

test("nada apurado: sem projeção", () => {
  assert.equal(projectRunoff(snapshot2022(() => 0), base2022, prior2022), null);
});

test("tudo apurado: projeção é a urna, chance 0 ou 1", () => {
  const p = projectRunoff(snapshot2022(() => 1), base2022, prior2022)!;
  assert.ok(Math.abs(p.flavioShare - final2022) < 1e-9);
  assert.equal(p.sd, 0);
  assert.equal(p.flavioChance, 0);
  assert.equal(p.counted, 1);
});

test("só Sul e Sudeste apurados: placar parcial engana, projeção não", () => {
  const early = new Set(["SP", "RJ", "MG", "PR", "SC", "RS", "ES"]);
  const byUf = snapshot2022((uf) => (early.has(uf) ? 1 : 0));
  let b = 0;
  let l = 0;
  for (const uf of early) {
    b += ELECTION_2022[uf].votes2.bolsonaro;
    l += ELECTION_2022[uf].votes2.lula;
  }
  assert.ok(b / (b + l) > 0.53, "parcial mostra Bolsonaro bem na frente");
  const p = projectRunoff(byUf, base2022, prior2022)!;
  assert.ok(p.flavioShare < 0.5, `projeção ${p.flavioShare}`);
  assert.ok(Math.abs(p.flavioShare - final2022) < 0.01, `erro ${p.flavioShare - final2022}`);
});

test("30% em cada UF: projeção a menos de 0,3 ponto da urna", () => {
  const p = projectRunoff(snapshot2022(() => 0.3), base2022, prior2022)!;
  assert.ok(Math.abs(p.flavioShare - final2022) < 0.003, `erro ${p.flavioShare - final2022}`);
  assert.ok(p.flavioChance < 0.5);
});

test("chance cai junto com o voto que falta", () => {
  const a = projectRunoff(snapshot2022((uf) => (uf === "SP" ? 0.2 : 0)), base2022, prior2022)!;
  const b = projectRunoff(snapshot2022(() => 0.8), base2022, prior2022)!;
  assert.ok(a.sd > b.sd);
  assert.ok(b.flavioChance < a.flavioChance || a.flavioChance < 0.5);
});

test("priorSd reproduz a chance publicada", () => {
  const sd = priorSd({ flavioShare: 0.51, flavioChance: 0.7 });
  assert.ok(Math.abs(sd - 0.01 / 0.5244) < 1e-3);
  assert.equal(priorSd({ flavioShare: 0.51, flavioChance: 0.3 }), 0.02);
});

test("1º turno 2026 lido como 2º: fatia = 1º turno, virada ~0", () => {
  const base = JSON.parse(
    readFileSync(new URL("../../data/first-round-2026.json", import.meta.url), "utf8"),
  ) as Record<string, FirstRoundUf>;
  let f = 0;
  let l = 0;
  for (const b of Object.values(base)) {
    f += b.flavio;
    l += b.lula;
  }
  const byUf = Object.fromEntries(
    Object.entries(base).map(([uf, b]) => [uf, count(b.flavio, b.lula, 1)]),
  );
  const p = projectRunoff(byUf, base, { flavioShare: f / (f + l), flavioChance: 0.6 })!;
  assert.ok(Math.abs(p.flavioShare - f / (f + l)) < 1e-9);
  assert.ok(Math.abs(p.swing) < 0.001, `virada ${p.swing}`);
});
