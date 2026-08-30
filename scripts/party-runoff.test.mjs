import assert from "node:assert/strict";
import { test } from "node:test";

test("vermelho so PT; PDT e PSTU nao pegam vermelho", async () => {
  const { partyColor, partyTokens } = await import("../src/lib/chart-theme.ts");
  assert.equal(partyColor("PT"), "#ff6b6b");
  assert.equal(partyColor("FE Brasil (PT/PC do B/PV)"), "#ff6b6b");
  assert.equal(partyColor("PL"), "#7ec8f0");
  assert.ok(!partyTokens("PDT").includes("PT"));
  assert.notEqual(partyColor("PDT"), "#ff6b6b");
  assert.notEqual(partyColor("PSTU"), "#ff6b6b");
  assert.notEqual(partyColor("REPUBLICANOS"), "#ff6b6b");
});

test("2T: par perguntado traz numero; par so do 1º nao inventa %", async () => {
  const { buildRunoffScenarios } = await import(
    "../src/lib/forecast/runoff-scenarios.ts"
  );
  const first = {
    lula: { mean: 36, se: 1.5, nPolls: 20 },
    flavio: { mean: 22, se: 1.5, nPolls: 20 },
    renan: { mean: 20, se: 1.5, nPolls: 12 },
    caiado: { mean: 8, se: 1.5, nPolls: 10 },
    zema: { mean: 6, se: 1.5, nPolls: 10 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const second = {
    lula: { mean: 45.2, se: 1.2, nPolls: 30 },
    flavio: { mean: 43.7, se: 1.2, nPolls: 30 },
    renan: { mean: 0, se: 5, nPolls: 0 },
    caiado: { mean: 0, se: 5, nPolls: 0 },
    zema: { mean: 0, se: 5, nPolls: 0 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const polls = [
    { secondRound: { lula: 42, flavio: 47 } },
    { secondRound: { lula: 45, flavio: 44 } },
  ];
  const rows = buildRunoffScenarios({ first, second, polls, simulations: 3000 });
  const lf = rows.find((r) => r.pairKey === "flavio|lula");
  assert.ok(lf, "Lula x Flavio tem de aparecer");
  assert.equal(lf.asked, true);
  assert.equal(lf.nAsked, 2);
  assert.ok(lf.a2 != null && lf.b2 != null, "par perguntado traz 2T");
  const lr = rows.find((r) => r.pairKey === "lula|renan");
  assert.ok(lr, "1º apertado Flavio/Renan abre Lula x Renan");
  assert.equal(lr.asked, false);
  assert.equal(lr.a2, null);
  assert.equal(lr.b2, null);
  assert.ok(!rows.some((r) => r.pairKey.includes("cury")));
});

test("2T: 1º disparado nao lista 6 nomes sem pergunta", async () => {
  const { buildRunoffScenarios } = await import(
    "../src/lib/forecast/runoff-scenarios.ts"
  );
  const first = {
    lula: { mean: 38, se: 1.2, nPolls: 40 },
    flavio: { mean: 36, se: 1.2, nPolls: 40 },
    renan: { mean: 8, se: 1.5, nPolls: 20 },
    caiado: { mean: 5, se: 1.5, nPolls: 18 },
    zema: { mean: 4, se: 1.5, nPolls: 16 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const second = {
    lula: { mean: 45, se: 1, nPolls: 30 },
    flavio: { mean: 44, se: 1, nPolls: 30 },
    renan: { mean: 0, se: 5, nPolls: 0 },
    caiado: { mean: 0, se: 5, nPolls: 0 },
    zema: { mean: 0, se: 5, nPolls: 0 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const polls = [{ secondRound: { lula: 45, flavio: 44 } }];
  const rows = buildRunoffScenarios({ first, second, polls, simulations: 2500 });
  const keys = rows.map((r) => r.pairKey).sort();
  assert.ok(rows.some((r) => r.pairKey === "flavio|lula" && r.asked), "par perguntado");
  assert.ok(rows.some((r) => r.pairKey === "lula|renan" && !r.asked), "Renan disputa 2a vaga");
  assert.ok(rows.some((r) => r.pairKey === "caiado|lula" && !r.asked), "Caiado aberto no 1o");
  assert.ok(rows.some((r) => r.pairKey === "lula|zema" && !r.asked), "Zema aberto no 1o");
  assert.ok(!rows.some((r) => r.pairKey.includes("cury")), "Cury 0 some");
  assert.ok(!rows.some((r) => r.asked === false && r.a2 != null));
  assert.ok(rows.length >= 4, `esperava pares abertos, veio ${keys}`);
});

test("diferenca usa % da tela, nao float cru", async () => {
  const { shownGap, fmtNum } = await import("../src/lib/format.ts");
  assert.equal(shownGap(39.64, 34.99), 4.6);
  assert.equal(fmtNum(Math.abs(shownGap(39.64, 34.99))), "4,6");
  assert.equal(shownGap(45.17, 43.74), 1.5);
  assert.equal(fmtNum(Math.abs(shownGap(45.17, 43.74))), "1,5");
});


test("secondPairs conta confronto extra, nao some no schema lula/flavio", async () => {
  const { askedPairCounts, aggregatePairMeans, buildRunoffScenarios } = await import(
    "../src/lib/forecast/runoff-scenarios.ts"
  );
  const polls = [
    {
      secondRound: { lula: 43, flavio: 40 },
      secondPairs: [
        { a: "lula", b: "caiado", aPct: 44, bPct: 37 },
        { a: "lula", b: "zema", aPct: 45, bPct: 34 },
      ],
    },
    {
      secondRound: { lula: 47, flavio: 43 },
      secondPairs: [{ a: "lula", b: "caiado", aPct: 47, bPct: 40 }],
    },
  ];
  const n = askedPairCounts(polls);
  assert.equal(n.get("flavio|lula"), 2);
  assert.equal(n.get("caiado|lula"), 2);
  assert.equal(n.get("lula|zema"), 1);
  const means = aggregatePairMeans(polls);
  const lc = means.get("caiado|lula");
  assert.ok(lc);
  assert.equal(lc.n, 2);
  assert.ok(Math.abs(lc.aMean - 45.5) < 0.01 || Math.abs(lc.bMean - 45.5) < 0.01);
  const first = {
    lula: { mean: 38, se: 1.2, nPolls: 10 },
    flavio: { mean: 33, se: 1.2, nPolls: 10 },
    renan: { mean: 4, se: 1.5, nPolls: 8 },
    caiado: { mean: 4, se: 1.5, nPolls: 8 },
    zema: { mean: 2, se: 1.5, nPolls: 8 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const rows = buildRunoffScenarios({ first, second: null, polls, simulations: 800 });
  const caiado = rows.find((r) => r.pairKey === "caiado|lula");
  assert.ok(caiado?.asked);
  assert.ok(caiado.a2 != null && caiado.b2 != null);
});


test("empate tecnico recusa gap grande mesmo com SE inflado", async () => {
  const { isShownTie, shownGap } = await import("../src/lib/format.ts");
  assert.equal(shownGap(39.64, 34.99), 4.6);
  assert.equal(isShownTie(39.64, 34.99, 4.826), false);
  assert.equal(isShownTie(45.17, 43.74, 4.685), true);
  assert.equal(isShownTie(45.0, 43.0, 0.2), false);
});

test("mix: Lula x Caiado perguntado move P(presidente) vs so LxF", async () => {
  const { mixElectionProbs } = await import(
    "../src/lib/forecast/runoff-scenarios.ts"
  );
  const first = {
    lula: { mean: 38, se: 1.2, nPolls: 10 },
    flavio: { mean: 24, se: 1.2, nPolls: 10 },
    renan: { mean: 6, se: 1.5, nPolls: 6 },
    caiado: { mean: 20, se: 1.5, nPolls: 8 },
    zema: { mean: 3, se: 1.5, nPolls: 6 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const second = {
    lula: { mean: 52, se: 1.2, nPolls: 8 },
    flavio: { mean: 38, se: 1.2, nPolls: 8 },
    renan: { mean: 0, se: 5, nPolls: 0 },
    caiado: { mean: 0, se: 5, nPolls: 0 },
    zema: { mean: 0, se: 5, nPolls: 0 },
    cury: { mean: 0, se: 5, nPolls: 0 },
  };
  const onlyLF = mixElectionProbs({
    first,
    second,
    polls: [{ secondRound: { lula: 52, flavio: 38 }, weight: 1 }],
    pMajority: { lula: 0.02, flavio: 0 },
    pGoesToSecond: 0.98,
    sePair: 2,
  });
  const withCaiado = mixElectionProbs({
    first,
    second,
    polls: [
      { secondRound: { lula: 52, flavio: 38 }, weight: 1 },
      {
        secondPairs: [{ a: "lula", b: "caiado", aPct: 43, bPct: 48 }],
        weight: 1,
      },
    ],
    pMajority: { lula: 0.02, flavio: 0 },
    pGoesToSecond: 0.98,
    sePair: 2,
  });
  assert.ok(onlyLF.askedShare > 0);
  assert.ok(withCaiado.caiado > 0.01, `Caiado ${withCaiado.caiado}`);
  assert.ok(
    withCaiado.lula < onlyLF.lula,
    `Lula nao caiu: so LxF ${onlyLF.lula} vs mix ${withCaiado.lula}`,
  );
  assert.ok(withCaiado.lula + withCaiado.flavio + withCaiado.caiado > 0.9);
});
