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
  callCount,
  parseCount,
  rollupPresident,
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

test("national rollup sums official UF votes when the BR file is behind", () => {
  const behind = parseCount({
    ...file,
    s: { ...file.s, pst: "64,81", pstn: "64,810000000", st: "100", ts: "200" },
    carg: [
      {
        agr: [
          {
            par: [
              {
                sg: "AA",
                cand: [{ n: "22", nmu: "ALFA TESTE", vap: "60", pvap: "60,00", dvt: "Válido" }],
              },
              {
                sg: "BB",
                cand: [{ n: "13", nmu: "BETA TESTE", vap: "40", pvap: "40,00", dvt: "Válido" }],
              },
            ],
          },
        ],
      },
    ],
  });
  const sp = parseCount({
    dt: "04/10/2026",
    ht: "19:25:40",
    s: { pst: "87,11", st: "80", ts: "100" },
    carg: [
      {
        agr: [
          {
            par: [
              {
                sg: "AA",
                cand: [{ n: "22", nmu: "ALFA TESTE", vap: "30", pvap: "30,00", dvt: "Válido" }],
              },
              {
                sg: "BB",
                cand: [{ n: "13", nmu: "BETA TESTE", vap: "70", pvap: "70,00", dvt: "Válido" }],
              },
            ],
          },
        ],
      },
    ],
  });
  const ba = parseCount({
    dt: "04/10/2026",
    ht: "19:32:00",
    s: { pst: "67,10", st: "50", ts: "100" },
    carg: [
      {
        agr: [
          {
            par: [
              {
                sg: "AA",
                cand: [{ n: "22", nmu: "ALFA TESTE", vap: "20", pvap: "40,00", dvt: "Válido" }],
              },
              {
                sg: "BB",
                cand: [{ n: "13", nmu: "BETA TESTE", vap: "30", pvap: "60,00", dvt: "Válido" }],
              },
            ],
          },
        ],
      },
    ],
  });
  const rolled = rollupPresident({ BR: behind, SP: sp, BA: ba, RJ: { status: "aguardando" } });
  assert.equal(rolled.status, "ok");
  if (rolled.status !== "ok") return;
  assert.equal(rolled.sectionsCounted, 130);
  assert.equal(rolled.pctApurado, "65,00");
  assert.equal(rolled.candidates.find((c) => c.number === "13")?.votes, 100);
  assert.equal(rolled.candidates.find((c) => c.number === "22")?.votes, 50);
  assert.equal(rolled.candidates.find((c) => c.number === "13")?.pct, "66,67");
  assert.notEqual(rolled.candidates.find((c) => c.number === "13")?.pct, "65,00");
  assert.equal(rolled.updatedAt, "04/10/2026 19:32:00");
  assert.equal(rolled.leader?.name, "BETA TESTE");
});

test("national file wins once it has caught the UF section count", () => {
  const ahead = parseCount({
    ...file,
    s: { ...file.s, st: "200", ts: "200", pst: "100,00" },
  });
  const uf = parseCount({
    ...file,
    s: { ...file.s, st: "50", ts: "100", pst: "50,00" },
  });
  const rolled = rollupPresident({ BR: ahead, SP: uf });
  assert.equal(rolled.status, "ok");
  if (rolled.status !== "ok" || ahead.status !== "ok") return;
  assert.equal(rolled.pctApurado, ahead.pctApurado);
  assert.equal(rolled.leader?.pct, "60,00");
});

test("fetch turns HTTP errors into aguardando and does not invent a body", async () => {
  let cacheMode: RequestCache | undefined;
  const missing = await fetchCount("https://resultados.tse.jus.br/missing", async (_url, init) => {
    cacheMode = init?.cache;
    return new Response("nope", { status: 404 });
  });
  assert.equal(cacheMode, "no-store");
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
  assert.match(page, /callCount/);
  assert.match(page, /apuracao-cargos/);
  assert.match(page, /cache: "no-store"|fetchCount/);
  assert.doesNotMatch(page, /SegGroup/);
  assert.match(map, /BrazilMapSvg/);
  assert.doesNotMatch(
    `${page}\n${map}`,
    /runForecast|polls\.json|chance|dados-simplificados|\.pest/,
  );
  assert.equal(displayName("TARCÍSIO"), "Tarcísio");
});

function race(opts: {
  nv?: string;
  qe?: string;
  esnt?: string | null;
  vv?: string;
  st?: string;
  ts?: string;
  parties: {
    sg: string;
    cand: { n: string; nmu: string; vap: string; e?: string; st?: string; pvap?: string }[];
  }[];
}) {
  return parseCount({
    dt: "04/10/2026",
    ht: "21:00:00",
    s: { pst: "80,00", pstn: "80,000000000", st: opts.st ?? "80", ts: opts.ts ?? "100" },
    e: opts.esnt == null ? {} : { esnt: opts.esnt },
    v: opts.vv == null ? {} : { vv: opts.vv },
    carg: [
      {
        ...(opts.nv ? { nv: opts.nv } : {}),
        ...(opts.qe ? { qe: opts.qe } : {}),
        agr: [{ par: opts.parties.map((party) => ({ sg: party.sg, cand: party.cand.map((cand) => ({ ...cand, dvt: "Válido" })) })) }],
      },
    ],
  });
}

test("TSE e and st are the eleito mark, unknown st is not", () => {
  const parsed = race({
    nv: "1",
    esnt: "0",
    vv: "100",
    st: "100",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "10", e: "s" },
          { n: "13", nmu: "BETA", vap: "9", e: "n", st: "" },
          { n: "15", nmu: "GAMA", vap: "8", e: "n", st: "Eleito" },
          { n: "12", nmu: "DELTA", vap: "7", e: "n", st: "Não eleito" },
          { n: "44", nmu: "EPSILON", vap: "6", e: "n", st: "Suplente" },
        ],
      },
    ],
  });
  assert.equal(parsed.status, "ok");
  if (parsed.status !== "ok") return;
  const byNumber = Object.fromEntries(parsed.candidates.map((cand) => [cand.number, cand.tseElected]));
  assert.equal(byNumber["22"], true);
  assert.equal(byNumber["13"], false);
  assert.equal(byNumber["15"], true);
  assert.equal(byNumber["12"], false);
  assert.equal(byNumber["44"], false);
  assert.equal(parsed.seats, 1);
  assert.equal(parsed.remainingVotes, 0);
  assert.equal(parsed.validVotes, 100);
  const call = callCount(parsed);
  assert.equal(call.kind, "eleito");
  assert.deepEqual(
    call.elected.map((cand) => cand.number).sort(),
    ["15", "22"],
  );
});

test("majority locks only above half, runoff only when the top two cannot change", () => {
  const locked = race({
    nv: "1",
    esnt: "10",
    vv: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "60", e: "n" },
          { n: "13", nmu: "BETA", vap: "40", e: "n" },
        ],
      },
    ],
  });
  assert.equal(locked.status, "ok");
  if (locked.status !== "ok") return;
  assert.equal(callCount(locked).kind, "eleito");
  assert.equal(callCount(locked).elected[0]?.number, "22");

  const open = race({
    nv: "1",
    esnt: "10",
    vv: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "55", e: "n" },
          { n: "13", nmu: "BETA", vap: "45", e: "n" },
        ],
      },
    ],
  });
  assert.equal(open.status, "ok");
  if (open.status !== "ok") return;
  assert.equal(callCount(open).kind, "na-frente");
  assert.equal(callCount(open).elected.length, 0);
  assert.equal(callCount(open).leading?.number, "22");

  const runoff = race({
    nv: "1",
    esnt: "10",
    vv: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "40", e: "n" },
          { n: "13", nmu: "BETA", vap: "35", e: "n" },
          { n: "15", nmu: "GAMA", vap: "10", e: "n" },
        ],
      },
    ],
  });
  assert.equal(runoff.status, "ok");
  if (runoff.status !== "ok") return;
  assert.equal(callCount(runoff).kind, "segundo-turno");
  assert.deepEqual(
    callCount(runoff).runoff.map((cand) => cand.number),
    ["22", "13"],
  );

  const stillOpen = race({
    nv: "1",
    esnt: "10",
    vv: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "40", e: "n" },
          { n: "13", nmu: "BETA", vap: "35", e: "n" },
          { n: "15", nmu: "GAMA", vap: "30", e: "n" },
        ],
      },
    ],
  });
  assert.equal(stillOpen.status, "ok");
  if (stillOpen.status !== "ok") return;
  assert.equal(callCount(stillOpen).kind, "na-frente");

  const tied = race({
    nv: "1",
    esnt: "0",
    vv: "100",
    st: "100",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "50", e: "n" },
          { n: "13", nmu: "BETA", vap: "50", e: "n" },
        ],
      },
    ],
  });
  assert.equal(tied.status, "ok");
  if (tied.status !== "ok") return;
  assert.equal(callCount(tied).kind, "empate");
  assert.equal(callCount(tied).elected.length, 0);

  const unknown = race({
    nv: "1",
    esnt: null,
    vv: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "90", e: "n" },
          { n: "13", nmu: "BETA", vap: "10", e: "n" },
        ],
      },
    ],
  });
  assert.equal(unknown.status, "ok");
  if (unknown.status !== "ok") return;
  assert.equal(unknown.remainingVotes, null);
  assert.equal(callCount(unknown).kind, "na-frente");
  assert.equal(callCount(unknown).elected.length, 0);
});

test("senate seats come from nv and both locked names are eleito", () => {
  const parsed = race({
    nv: "2",
    esnt: "10",
    vv: "230",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "222", nmu: "ALFA", vap: "100", e: "n" },
          { n: "444", nmu: "BETA", vap: "80", e: "n" },
          { n: "555", nmu: "GAMA", vap: "50", e: "n" },
        ],
      },
    ],
  });
  assert.equal(parsed.status, "ok");
  if (parsed.status !== "ok") return;
  assert.equal(parsed.seats, 2);
  assert.equal(parsed.proportional, false);
  const call = callCount(parsed);
  assert.equal(call.kind, "eleito");
  assert.deepEqual(
    call.elected.map((cand) => cand.number),
    ["222", "444"],
  );

  const cutoff = race({
    nv: "2",
    esnt: "0",
    vv: "160",
    st: "100",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "222", nmu: "ALFA", vap: "80", e: "n" },
          { n: "444", nmu: "BETA", vap: "80", e: "n" },
          { n: "555", nmu: "GAMA", vap: "80", e: "n" },
        ],
      },
    ],
  });
  assert.equal(cutoff.status, "ok");
  if (cutoff.status !== "ok") return;
  assert.equal(callCount(cutoff).elected.length, 0);
  assert.equal(callCount(cutoff).kind, "aberto");
});

test("deputies stay a ranking until a quotient seat cannot change", () => {
  const oneSeat = race({
    nv: "2",
    qe: "50",
    esnt: "0",
    vv: "100",
    st: "100",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22111", nmu: "ALFA", vap: "50", e: "n" },
          { n: "22222", nmu: "BETA", vap: "30", e: "n" },
        ],
      },
      { sg: "BB", cand: [{ n: "13111", nmu: "GAMA", vap: "20", e: "n" }] },
    ],
  });
  assert.equal(oneSeat.status, "ok");
  if (oneSeat.status !== "ok") return;
  assert.equal(oneSeat.proportional, true);
  assert.equal(oneSeat.seats, 2);
  const call = callCount(oneSeat);
  assert.deepEqual(
    call.elected.map((cand) => cand.number),
    ["22111"],
  );
  assert.equal(call.rest.some((cand) => cand.number === "22222"), true);

  const catchable = race({
    nv: "2",
    qe: "40",
    esnt: "10",
    vv: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22111", nmu: "ALFA", vap: "40", e: "n" },
          { n: "22222", nmu: "BETA", vap: "35", e: "n" },
        ],
      },
    ],
  });
  assert.equal(catchable.status, "ok");
  if (catchable.status !== "ok") return;
  assert.equal(callCount(catchable).elected.length, 0);
  assert.equal(callCount(catchable).kind, "aberto");

  const marked = race({
    nv: "8",
    qe: "999999",
    esnt: "5000",
    vv: "100",
    parties: [{ sg: "AA", cand: [{ n: "22111", nmu: "ALFA", vap: "40", e: "s" }] }],
  });
  assert.equal(marked.status, "ok");
  if (marked.status !== "ok") return;
  assert.equal(callCount(marked).elected[0]?.number, "22111");
});

test("president rollup does not inherit one UF eleito mark", () => {
  const marked = race({
    nv: "1",
    esnt: "10",
    vv: "100",
    st: "40",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "60", e: "s" },
          { n: "13", nmu: "BETA", vap: "40", e: "n" },
        ],
      },
    ],
  });
  const open = race({
    nv: "1",
    esnt: "10",
    vv: "100",
    st: "40",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "50", e: "n" },
          { n: "13", nmu: "BETA", vap: "50", e: "n" },
        ],
      },
    ],
  });
  const behind = race({
    nv: "1",
    esnt: "80",
    vv: "40",
    st: "20",
    ts: "200",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "20", e: "n" },
          { n: "13", nmu: "BETA", vap: "20", e: "n" },
        ],
      },
    ],
  });
  assert.equal(marked.status, "ok");
  assert.equal(open.status, "ok");
  assert.equal(behind.status, "ok");
  if (marked.status !== "ok" || open.status !== "ok" || behind.status !== "ok") return;
  const rolled = rollupPresident({ BR: behind, SP: marked, BA: open });
  assert.equal(rolled.status, "ok");
  if (rolled.status !== "ok") return;
  assert.equal(rolled.candidates.find((cand) => cand.number === "22")?.tseElected, false);
  assert.equal(rolled.remainingVotes, 20);
  assert.equal(callCount(rolled).kind === "eleito", false);

  const nationalMark = race({
    nv: "1",
    esnt: "80",
    vv: "40",
    st: "20",
    ts: "200",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "20", e: "s" },
          { n: "13", nmu: "BETA", vap: "20", e: "n" },
        ],
      },
    ],
  });
  assert.equal(nationalMark.status, "ok");
  if (nationalMark.status !== "ok") return;
  const overlaid = rollupPresident({ BR: nationalMark, SP: marked, BA: open });
  assert.equal(overlaid.status, "ok");
  if (overlaid.status !== "ok") return;
  assert.equal(overlaid.candidates.find((cand) => cand.number === "22")?.tseElected, true);
  assert.equal(callCount(overlaid).elected[0]?.number, "22");

  const missing = race({
    nv: "1",
    esnt: null,
    vv: "100",
    st: "40",
    ts: "100",
    parties: [
      {
        sg: "AA",
        cand: [
          { n: "22", nmu: "ALFA", vap: "90", e: "n" },
          { n: "13", nmu: "BETA", vap: "10", e: "n" },
        ],
      },
    ],
  });
  assert.equal(missing.status, "ok");
  if (missing.status !== "ok") return;
  const noMath = rollupPresident({ BR: behind, SP: marked, RJ: missing });
  assert.equal(noMath.status, "ok");
  if (noMath.status !== "ok") return;
  assert.equal(noMath.remainingVotes, null);
  assert.equal(callCount(noMath).elected.length, 0);
});
