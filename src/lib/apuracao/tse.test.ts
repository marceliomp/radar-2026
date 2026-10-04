import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { UF_ORDER } from "../../data/candidates.ts";
import { messages } from "../i18n/messages.ts";
import {
  AGUARDANDO,
  APURACAO_LABEL,
  APURACAO_REFRESH_MS,
  countTargets,
  countUrl,
  displayName,
  fetchCount,
  parseCount,
} from "./tse.ts";

const file = {
  dt: "04/10/2026",
  ht: "18:00:00",
  s: { pst: "10,00", pstn: "10,000000000", ts: "100", st: "10" },
  e: { pest: "99,99", pestn: "99,990000000" },
  v: { pvv: "80,00", tv: "140" },
  carg: [
    {
      agr: [
        {
          par: [
            {
              sg: "AA",
              cand: [
                {
                  n: "22",
                  nmu: "ALFA TESTE",
                  nm: "ALFA NOME COMPLETO",
                  vap: "100",
                  pvap: "60,00",
                  pvapn: "60,000000000",
                  dvt: "Válido",
                  seq: "1",
                },
              ],
            },
            {
              sg: "BB",
              cand: [
                {
                  n: "13",
                  nmu: "BETA TESTE",
                  vap: "40",
                  pvap: "40,00",
                  pvapn: "40,000000000",
                  dvt: "Válido",
                  seq: "2",
                },
              ],
            },
            {
              sg: "CC",
              cand: [
                {
                  n: "99",
                  nmu: "NULO",
                  vap: "5",
                  pvap: "3,00",
                  dvt: "Anulado",
                  seq: "3",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test("parser reads official pst and pvap and ignores other percents", () => {
  const parsed = parseCount(file);
  assert.equal(parsed.status, "ok");
  if (parsed.status !== "ok") return;
  assert.equal(parsed.pctApurado, "10,00");
  assert.equal(parsed.pctApuradoExact, "10,000000000");
  assert.notEqual(parsed.pctApurado, "99,99");
  assert.equal(parsed.leader?.name, "ALFA TESTE");
  assert.equal(parsed.leader?.pct, "60,00");
  assert.equal(parsed.leader?.pctExact, "60,000000000");
  assert.equal(parsed.leader?.votes, 100);
  assert.equal(parsed.leader?.party, "AA");
  assert.equal(parsed.tie, false);
  assert.equal(parsed.updatedAt, "04/10/2026 18:00:00");
  assert.ok(parsed.candidates.every((c) => c.name !== "NULO"));
  assert.equal(parsed.candidates.length, 2);
});

test("equal votes are a tie, not a chosen winner", () => {
  const tied = structuredClone(file);
  const cands = tied.carg[0]!.agr[0]!.par;
  cands[0]!.cand[0]!.vap = "40";
  cands[0]!.cand[0]!.pvap = "50,00";
  const parsed = parseCount(tied);
  assert.equal(parsed.status, "ok");
  if (parsed.status !== "ok") return;
  assert.equal(parsed.tie, true);
  assert.equal(parsed.leader, null);
  assert.equal(parsed.candidates[0]?.votes, 40);
  assert.equal(parsed.candidates[1]?.votes, 40);
});

test("missing file, empty body and a body without s.pst stay aguardando", () => {
  assert.deepEqual(parseCount(null), { status: "aguardando" });
  assert.deepEqual(parseCount({}), { status: "aguardando" });
  assert.deepEqual(parseCount({ e: { pest: "50,00" }, v: { pvv: "50,00" } }), {
    status: "aguardando",
  });
  assert.deepEqual(parseCount({ s: { ts: "10", st: "10" } }), { status: "aguardando" });
});

test("a candidate without pvap does not get a computed percent", () => {
  const parsed = parseCount({
    s: { pst: "10,00", pstn: "10,000000000" },
    e: { pest: "99,99" },
    v: { pvv: "80,00" },
    carg: [
      {
        agr: [
          {
            par: [
              {
                sg: "AA",
                cand: [{ n: "22", nmu: "ALFA TESTE", vap: "100", dvt: "Válido", seq: "1" }],
              },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(parsed.status, "ok");
  if (parsed.status !== "ok") return;
  assert.equal(parsed.leader?.votes, 100);
  assert.equal(parsed.leader?.pct, "");
  assert.equal(parsed.leader?.pctExact, "");
});

test("count URLs are the live EA20 files", () => {
  assert.equal(
    countUrl("presidente", "BR"),
    "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json",
  );
  assert.equal(
    countUrl("presidente", "sp"),
    "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/sp/sp-c0001-e006257-u.json",
  );
  assert.equal(
    countUrl("governador", "SP"),
    "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/sp/sp-c0003-e006259-u.json",
  );
  assert.equal(
    countUrl("senador", "rj"),
    "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rj/rj-c0005-e006259-u.json",
  );
  assert.equal(
    countUrl("deputado-federal", "mg"),
    "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/mg/mg-c0006-e006259-u.json",
  );
  assert.equal(
    countUrl("deputado-estadual", "ba"),
    "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/ba/ba-c0007-e006259-u.json",
  );
  assert.equal(
    countUrl("deputado-estadual", "DF"),
    "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/df/df-c0008-e006259-u.json",
  );
  assert.equal(countUrl("presidente", "BR").includes("dados-simplificados"), false);
  assert.equal(countUrl("presidente", "BR").endsWith("-r.json"), false);
});

test("state races do not request the national candidate file", () => {
  for (const cargo of ["governador", "senador", "deputado-federal", "deputado-estadual"] as const) {
    const targets = countTargets(cargo);
    assert.equal(
      targets.some((t) => t.scope === "BR"),
      false,
    );
    assert.equal(targets.length, UF_ORDER.length);
    assert.equal(
      targets.some((t) => t.url.includes("/br/br-")),
      false,
    );
  }
  const pres = countTargets("presidente");
  assert.equal(pres[0]?.scope, "BR");
  assert.equal(pres.length, UF_ORDER.length + 1);
});

test("fetch turns HTTP errors into aguardando and does not invent a body", async () => {
  const missing = await fetchCount("https://resultados.tse.jus.br/missing", async () => {
    return new Response("nope", { status: 404 });
  });
  assert.deepEqual(missing, { status: "aguardando" });

  const thrown = await fetchCount("https://resultados.tse.jus.br/down", async () => {
    throw new Error("network");
  });
  assert.deepEqual(thrown, { status: "aguardando" });
});

test("labels and the 10s refresh are the product contract", () => {
  assert.equal(APURACAO_REFRESH_MS, 10_000);
  assert.equal(APURACAO_LABEL, "Apuração TSE");
  assert.equal(AGUARDANDO, "Aguardando apuração");
  const pt = messages("pt");
  assert.equal(pt.nav.apuracao, "Apuração TSE");
  assert.equal(pt.apuracao.label, "Apuração TSE");
  assert.equal(pt.apuracao.waiting, "Aguardando apuração");
  const page = readFileSync("src/features/apuracao/apuracao-page.tsx", "utf8");
  const map = readFileSync("src/features/apuracao/apuracao-map.tsx", "utf8");
  assert.match(page, /APURACAO_REFRESH_MS/);
  assert.match(map, /BrazilMapSvg/);
  assert.doesNotMatch(
    `${page}\n${map}`,
    /runForecast|polls\.json|chance|dados-simplificados|\.pest/,
  );
  assert.equal(displayName("TARCÍSIO"), "Tarcísio");
});
