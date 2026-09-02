import assert from "node:assert/strict";
import { test } from "node:test";
import {
  foldName,
  matchCandidatePercents,
  mergeRacePolls,
  raceOfficesFromCargo,
  racePollId,
  rowToRacePolls,
} from "./process-races.mjs";

test("cargo misto vira governor e senator", () => {
  assert.deepEqual(raceOfficesFromCargo("Governador, Senador"), [
    "governor",
    "senator",
  ]);
  assert.deepEqual(raceOfficesFromCargo("Deputado Federal"), []);
});

test("matchCandidatePercents liga nome do catálogo ao percentual", () => {
  const text =
    "Tarcísio tem 40% das intenções. Fernando Haddad marca 27%. Vera Lúcia 4%.";
  const first = matchCandidatePercents(text, [
    { slug: "tarcisio", name: "Tarcísio" },
    { slug: "fernandohaddad", name: "Fernando Haddad" },
    { slug: "vera", name: "Vera Lúcia" },
  ]);
  assert.equal(first.tarcisio, 40);
  assert.equal(first.fernandohaddad, 27);
  assert.equal(first.vera, 4);
});

test("rowToRacePolls exige dois nomes", () => {
  const row = {
    NR_PROTOCOLO_REGISTRO: "SP-06946/2026",
    DS_CARGO: "Governador",
    SG_UF: "SP",
    QT_ENTREVISTADO: "1800",
    DT_FIM_PESQUISA: "2026-08-24",
    DT_DIVULGACAO: "2026-08-25",
    DS_METODOLOGIA_PESQUISA: "presencial",
  };
  const house = { id: "quaest", institute: "Quaest/Globo" };
  assert.equal(
    rowToRacePolls(row, house, { governor: { tarcisio: 40 } }, "https://g1.globo.com/x").length,
    0,
  );
  const polls = rowToRacePolls(
    row,
    house,
    { governor: { tarcisio: 40, fernandohaddad: 27 } },
    "https://g1.globo.com/x",
  );
  assert.equal(polls.length, 1);
  assert.equal(polls[0].office, "governor");
  assert.equal(polls[0].uf, "SP");
  assert.equal(polls[0].sample, 1800);
  assert.equal(polls[0].id, "quaest-globo-sp-gov-08-25");
});

test("mergeRacePolls nao duplica id", () => {
  const existing = {
    source: "test",
    asOf: "2026-08-01",
    polls: [{ id: "quaest-globo-sp-gov-08-25", date: "2026-08-25" }],
  };
  const incoming = [
    { id: "quaest-globo-sp-gov-08-25", date: "2026-08-25" },
    { id: "datafolha-sp-gov-08-21", date: "2026-08-21" },
  ];
  const out = mergeRacePolls(existing, incoming);
  assert.equal(out.added.length, 1);
  assert.equal(out.file.polls.length, 2);
  assert.equal(out.file.asOf, "2026-08-25");
});

test("foldName tira acento", () => {
  assert.equal(foldName("Tarcísio"), "tarcisio");
  assert.equal(racePollId("Datafolha", "RJ", "senator", "2026-08-22"), "datafolha-rj-sen-08-22");
});
