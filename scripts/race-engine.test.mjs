import assert from "node:assert/strict";
import { test } from "node:test";

async function importRace() {
  return import("../src/lib/forecast/race-engine.ts");
}

const GOV_CANDS = [
  { slug: "tarcisio", name: "Tarcisio", party: "REP" },
  { slug: "haddad", name: "Haddad", party: "PT" },
  { slug: "marcal", name: "Marcal", party: "PRTB" },
];

const SEN_CANDS = [
  { slug: "a", name: "Alpha", party: "A" },
  { slug: "b", name: "Beta", party: "B" },
  { slug: "c", name: "Gamma", party: "C" },
];

test("governador lider folgado P(win) > 0.85", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "sp-gov-1",
      office: "governor",
      uf: "SP",
      institute: "Datafolha",
      date: "2026-08-20",
      fieldEnd: "2026-08-20",
      sample: 2400,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 58, haddad: 22, marcal: 8 },
    },
  ];
  const snap = runRaceForecast(polls, GOV_CANDS, {
    office: "governor",
    uf: "SP",
    asOf: "2026-08-29",
    simulations: 4000,
  });
  assert.ok(
    snap.probs.tarcisio > 0.85,
    `P(tarcisio)=${snap.probs.tarcisio} esperado >0.85`,
  );
  assert.ok(typeof snap.goesToSecond === "number");
  assert.equal(snap.rows.length, 1);
});

test("senador top-2 somam P(cadeira) alta e 3o baixa", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "sp-sen-1",
      office: "senator",
      uf: "SP",
      institute: "Datafolha",
      date: "2026-08-20",
      fieldEnd: "2026-08-20",
      sample: 2400,
      moe: 2,
      mode: "presencial",
      firstRound: { a: 38, b: 30, c: 8 },
    },
  ];
  const snap = runRaceForecast(polls, SEN_CANDS, {
    office: "senator",
    uf: "SP",
    asOf: "2026-08-29",
    simulations: 4000,
  });
  assert.ok(
    snap.probs.a > 0.85,
    `P(a cadeira)=${snap.probs.a} esperado alto`,
  );
  assert.ok(
    snap.probs.b > 0.85,
    `P(b cadeira)=${snap.probs.b} esperado alto`,
  );
  assert.ok(
    snap.probs.c < 0.25,
    `P(c cadeira)=${snap.probs.c} esperado baixo`,
  );
  assert.equal(snap.goesToSecond, undefined);
});

test("poll de outro UF nao entra", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "sp-gov-1",
      office: "governor",
      uf: "SP",
      institute: "Datafolha",
      date: "2026-08-20",
      fieldEnd: "2026-08-20",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 55, haddad: 20 },
    },
    {
      id: "rj-gov-1",
      office: "governor",
      uf: "RJ",
      institute: "Quaest",
      date: "2026-08-20",
      fieldEnd: "2026-08-20",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 10, haddad: 50 },
    },
  ];
  const snap = runRaceForecast(polls, GOV_CANDS, {
    office: "governor",
    uf: "SP",
    asOf: "2026-08-29",
    simulations: 1000,
  });
  assert.equal(snap.rows.length, 1);
  assert.equal(snap.rows[0].poll.uf, "SP");
  assert.equal(snap.rows[0].poll.id, "sp-gov-1");
  assert.ok(
    snap.first.tarcisio.mean > 50,
    `media SP nao pode misturar RJ: ${snap.first.tarcisio.mean}`,
  );
  assert.ok(snap.first.haddad.mean < 30);
});

test("uma pesquisa 50x17 nao da P(win) 1.0", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "sc-gov-1",
      office: "governor",
      uf: "SC",
      institute: "Quaest",
      date: "2026-08-24",
      fieldEnd: "2026-08-23",
      sample: 804,
      moe: 3,
      mode: "presencial",
      firstRound: { tarcisio: 50, haddad: 17, marcal: 4 },
      secondRound: { tarcisio: 56, haddad: 24 },
    },
  ];
  const snap = runRaceForecast(polls, GOV_CANDS, {
    office: "governor",
    uf: "SC",
    asOf: "2026-08-29",
    simulations: 4000,
  });
  // Criterio: 1º ~50 nao vira fato 100/0. Favorito segue alto; 2o nao zera.
  assert.ok(
    snap.first.tarcisio.mean === 50,
    `1o mean tarcisio=${snap.first.tarcisio.mean}`,
  );
  assert.ok(
    snap.first.haddad.mean === 17,
    `1o mean haddad=${snap.first.haddad.mean}`,
  );
  assert.ok(
    snap.probs.tarcisio < 0.995,
    `P(tarcisio)=${snap.probs.tarcisio} nao pode ser ~1.0 com n=1`,
  );
  assert.ok(
    snap.probs.tarcisio > 0.85,
    `P(tarcisio)=${snap.probs.tarcisio} favorito 56x24 ainda alto`,
  );
  assert.ok(
    snap.probs.haddad > 0.005,
    `P(haddad)=${snap.probs.haddad} nao pode ser 0.0 com n=1`,
  );
  assert.ok(
    snap.probs.haddad < 0.15,
    `P(haddad)=${snap.probs.haddad} 17 no 1o nao e favorito`,
  );
});



test("missing firstRound key is not treated as 0", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "sp-gov-asked",
      office: "governor",
      uf: "SP",
      institute: "Datafolha",
      date: "2026-08-20",
      fieldEnd: "2026-08-20",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 50, haddad: 22, marcal: 8 },
    },
    {
      id: "sp-gov-omit",
      office: "governor",
      uf: "SP",
      institute: "Quaest",
      date: "2026-08-25",
      fieldEnd: "2026-08-24",
      sample: 2000,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 48, haddad: 24 },
    },
  ];
  const snap = runRaceForecast(polls, GOV_CANDS, {
    office: "governor",
    uf: "SP",
    asOf: "2026-08-29",
    simulations: 500,
    useTrackRecord: false,
  });
  assert.ok(
    snap.first.marcal.mean > 7 && snap.first.marcal.mean < 9,
    "marcal mean " + snap.first.marcal.mean + " was diluted toward 0",
  );
});

test("senado P(top-2) soma ~2; governador P(win) soma ~1", async () => {
  const { runRaceForecast } = await importRace();
  const gov = runRaceForecast(
    [
      {
        id: "sp-gov-1",
        office: "governor",
        uf: "SP",
        institute: "Datafolha",
        date: "2026-08-20",
        fieldEnd: "2026-08-20",
        sample: 2400,
        moe: 2,
        mode: "presencial",
        firstRound: { tarcisio: 58, haddad: 22, marcal: 8 },
      },
    ],
    GOV_CANDS,
    { office: "governor", uf: "SP", asOf: "2026-08-29", simulations: 2000 },
  );
  const sen = runRaceForecast(
    [
      {
        id: "sp-sen-1",
        office: "senator",
        uf: "SP",
        institute: "Datafolha",
        date: "2026-08-20",
        fieldEnd: "2026-08-20",
        sample: 2400,
        moe: 2,
        mode: "presencial",
        firstRound: { a: 38, b: 30, c: 8 },
      },
    ],
    SEN_CANDS,
    { office: "senator", uf: "SP", asOf: "2026-08-29", simulations: 2000 },
  );
  const sumGov = Object.values(gov.probs).reduce((s, p) => s + p, 0);
  const sumSen = Object.values(sen.probs).reduce((s, p) => s + p, 0);
  assert.ok(sumGov > 0.97 && sumGov < 1.03, "gov P(win) soma " + sumGov);
  assert.ok(sumSen > 1.9 && sumSen < 2.1, "sen P(top-2) soma " + sumSen);
  assert.equal(gov.goesToSecond != null, true);
  assert.equal(sen.goesToSecond, undefined);
});

test("missing slug is not averaged as 0", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "mg-a",
      office: "governor",
      uf: "MG",
      institute: "Datafolha",
      date: "2026-08-21",
      fieldEnd: "2026-08-20",
      sample: 1204,
      moe: 3,
      mode: "presencial",
      firstRound: { tarcisio: 32, haddad: 12, marcal: 1 },
    },
    {
      id: "mg-b",
      office: "governor",
      uf: "MG",
      institute: "Quaest",
      date: "2026-08-25",
      fieldEnd: "2026-08-24",
      sample: 1506,
      moe: 3,
      mode: "presencial",
      firstRound: { tarcisio: 29, haddad: 11 },
    },
  ];
  const snap = runRaceForecast(polls, GOV_CANDS, {
    office: "governor",
    uf: "MG",
    asOf: "2026-08-29",
    simulations: 500,
  });
  assert.ok(
    snap.first.marcal.mean > 0.8 && snap.first.marcal.mean < 1.2,
    "marcal mean " + snap.first.marcal.mean + " was diluted toward 0",
  );
  assert.equal(
    snap.ordered.some((o) => o.slug === "ghost"),
    false,
  );
});

test("senate TSE ghost with no poll key does not steal seats", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "ce-sen-1",
      office: "senator",
      uf: "CE",
      institute: "Ipsos-Ipec",
      date: "2026-08-20",
      fieldEnd: "2026-08-17",
      sample: 800,
      moe: 3,
      mode: "presencial",
      firstRound: { a: 26, b: 19, c: 15 },
    },
  ];
  const cands = [
    ...SEN_CANDS,
    { slug: "ghost", name: "Ghost", party: "XX" },
  ];
  const snap = runRaceForecast(polls, cands, {
    office: "senator",
    uf: "CE",
    asOf: "2026-08-29",
    simulations: 2000,
  });
  assert.equal(snap.first.ghost.mean, 0);
  assert.equal(snap.first.ghost.se, 0);
  assert.ok(!snap.ordered.some((o) => o.slug === "ghost"));
  assert.equal(snap.probs.ghost ?? 0, 0);
});

test("half-life muda 1T em governador com duas pesquisas", async () => {
  const { runRaceForecast } = await importRace();
  const polls = [
    {
      id: "sp-gov-old",
      office: "governor",
      uf: "SP",
      institute: "Datafolha",
      date: "2026-08-21",
      fieldEnd: "2026-08-19",
      sample: 1610,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 45, haddad: 27 },
    },
    {
      id: "sp-gov-new",
      office: "governor",
      uf: "SP",
      institute: "Quaest",
      date: "2026-08-25",
      fieldEnd: "2026-08-24",
      sample: 1800,
      moe: 2,
      mode: "presencial",
      firstRound: { tarcisio: 40, haddad: 27 },
    },
  ];
  const cfg = {
    office: "governor",
    uf: "SP",
    asOf: "2026-08-29",
    simulations: 2000,
    useTrackRecord: false,
  };
  const short = runRaceForecast(polls, GOV_CANDS, { ...cfg, halfLifeDays: 5 });
  const long = runRaceForecast(polls, GOV_CANDS, { ...cfg, halfLifeDays: 40 });
  console.log("hl5 1T", short.first.tarcisio.mean, "P", short.probs.tarcisio);
  console.log("hl40 1T", long.first.tarcisio.mean, "P", long.probs.tarcisio);
  assert.notEqual(
    short.first.tarcisio.mean,
    long.first.tarcisio.mean,
    "1T tarcisio igual em hl=5 e hl=40",
  );
  assert.ok(
    short.first.tarcisio.mean < long.first.tarcisio.mean,
    "hl curto deveria puxar para a pesquisa nova (40), nao a velha (45)",
  );
});

test("ondas anteriores: N_gov sobe fora do eixo SP/MG/RJ/RS", async () => {
  const { default: file } = await import("../src/data/race-polls.json", {
    with: { type: "json" },
  });
  const polls = file.polls;
  const nGov = (uf) =>
    polls.filter((p) => p.office === "governor" && p.uf === uf).length;
  for (const uf of ["BA", "CE", "GO", "PE", "PR"]) {
    assert.ok(nGov(uf) >= 2, `${uf} N_gov=${nGov(uf)} esperado >=2`);
  }
  assert.equal(nGov("SC"), 1, "SC segue com uma casa (sem onda anterior publicada)");
  const ids = new Set(polls.map((p) => p.id));
  assert.ok(ids.has("quaest-sc-gov-08-24"), "rodada atual SC nao pode sumir");
  assert.ok(ids.has("quaest-ba-gov-08-27"), "rodada atual BA nao pode sumir");
  assert.ok(ids.has("quaest-ba-gov-07-29"));
  const baDates = polls
    .filter((p) => p.office === "governor" && p.uf === "BA")
    .map((p) => p.date)
    .sort();
  assert.deepEqual(baDates, ["2026-07-29", "2026-08-27"]);
});

test("half-life diferencia duas ondas no mesmo estado", async () => {
  const { runRaceForecast } = await importRace();
  const cands = [
    { slug: "acmneto", name: "ACM", party: "UNI" },
    { slug: "jeronimo", name: "Jeronimo", party: "PT" },
  ];
  const { default: file } = await import("../src/data/race-polls.json", {
    with: { type: "json" },
  });
  const polls = file.polls.filter(
    (p) => p.office === "governor" && p.uf === "BA",
  );
  assert.ok(polls.length >= 2);
  const snap = runRaceForecast(polls, cands, {
    office: "governor",
    uf: "BA",
    asOf: "2026-08-29",
    halfLifeDays: 14,
    simulations: 800,
  });
  assert.equal(snap.rows.length, 2);
  const shares = Object.fromEntries(
    snap.rows.map((r) => [r.poll.id, r.weightShare]),
  );
  assert.ok(
    shares["quaest-ba-gov-08-27"] > shares["quaest-ba-gov-07-29"],
    `recente deve pesar mais: ${JSON.stringify(shares)}`,
  );
});

test("politica de evidencia usa institutos independentes, nao quantidade bruta", async () => {
  const { runRaceForecast } = await importRace();
  const makePoll = (id, institute, day) => ({
    id,
    office: "governor",
    uf: "SP",
    institute,
    date: `2026-08-${day}`,
    fieldEnd: `2026-08-${day}`,
    sample: 1200,
    moe: 3,
    mode: "presencial",
    firstRound: { tarcisio: 45, haddad: 30, marcal: 8 },
  });
  const cfg = {
    office: "governor",
    uf: "SP",
    asOf: "2026-08-31",
    simulations: 400,
    useTrackRecord: false,
  };

  const one = runRaceForecast([makePoll("a1", "Casa A", "20")], GOV_CANDS, cfg);
  assert.equal(one.evidence.grade, "insufficient");
  assert.equal(one.evidence.canPublishProbability, false);

  const sameHouse = runRaceForecast([
    makePoll("a1", "Casa A", "20"),
    makePoll("a2", "Casa A", "24"),
  ], GOV_CANDS, cfg);
  assert.equal(sameHouse.evidence.houses, 1);
  assert.equal(sameHouse.evidence.canPublishProbability, false);

  const twoHouses = runRaceForecast([
    makePoll("a1", "Casa A", "20"),
    makePoll("b1", "Casa B", "24"),
  ], GOV_CANDS, cfg);
  assert.equal(twoHouses.evidence.grade, "thin");
  assert.equal(twoHouses.evidence.canPublishProbability, true);

  const fourHouses = runRaceForecast([
    makePoll("a1", "Casa A", "20"),
    makePoll("b1", "Casa B", "22"),
    makePoll("c1", "Casa C", "24"),
    makePoll("d1", "Casa D", "26"),
  ], GOV_CANDS, cfg);
  assert.equal(fourHouses.evidence.grade, "established");
  assert.equal(fourHouses.evidence.houses, 4);
  assert.equal(fourHouses.evidence.canPublishProbability, true);
});
