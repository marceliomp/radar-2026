import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  normalizeProtocol,
  isPresidente,
  isNationalRow,
  matchAllowlist,
  matchHouse,
  parseBrDate,
  inferMode,
  estimateMoe,
  parseAllowlistArticle,
  processPending,
  rowToPoll,
  resultsFromJsonl,
  coverageFromRow,
  isChallengeHtml,
  searchUrlsForProtocols,
} from "./process-pending.mjs";

test("normalizeProtocol pads TSE ids", () => {
  assert.equal(normalizeProtocol("BR078452026"), "BR-07845/2026");
  assert.equal(normalizeProtocol("br-4974/2026"), "BR-04974/2026");
  assert.equal(normalizeProtocol("BR-04974/2026"), "BR-04974/2026");
});

test("presidente filter is exact", () => {
  assert.equal(isPresidente("Presidente"), true);
  assert.equal(isPresidente("Governador, Senador"), false);
  assert.equal(isPresidente("Governador"), false);
});

test("alias table is names, not a house gate", () => {
  const poder = matchAllowlist({
    NR_CNPJ_EMPRESA: "29.550.908/0001-50",
    NM_EMPRESA: "PODERDATA",
    NM_EMPRESA_FANTASIA: "PODERDATA",
  });
  assert.equal(poder?.id, "poderdata");
  const veritaRow = {
    NR_CNPJ_EMPRESA: "00654576000172",
    NM_EMPRESA: "INSTITUTO VERITA LTDA",
    NM_EMPRESA_FANTASIA: "VERITA",
  };
  assert.equal(matchAllowlist(veritaRow)?.id, "verita");
  assert.equal(matchHouse(veritaRow)?.institute, "Veritá");
});

test("strict HTML parser reads 1T and refuses missing TSE", () => {
  const html = `<html><title>PoderData/Aya: Lula tem 38% contra 35% de Flávio no 1º turno</title>
  <p>A pesquisa está registrada no TSE sob o nº BR-04974/2026. Margem de erro de 2 pontos.</p>
  <p>No 2º turno o petista registra 45% das intenções de voto, ante 44% do congressista.</p>
  <p>Caiado registra 4%. Renan Santos tem 4%. Zema marca 2%.</p></html>`;
  const parsed = parseAllowlistArticle(html);
  assert.equal(parsed.tse, "BR-04974/2026");
  assert.equal(parsed.firstRound.lula, 38);
  assert.equal(parsed.firstRound.flavio, 35);
  assert.equal(parsed.secondRound.lula, 45);
  assert.equal(parsed.secondRound.flavio, 44);
  assert.equal(parsed.moe, 2);
  assert.equal(parseAllowlistArticle(html, "BR-00001/2026"), null);
});

test("parser does not invent votes from methodology prose", () => {
  const html = `<p>TSE BR-07847/2026. Amostra com 53% mulheres e 47% homens. Erro 12.9%.</p>`;
  assert.equal(parseAllowlistArticle(html), null);
});

const poderRow = {
  NR_PROTOCOLO_REGISTRO: "BR049742026",
  DS_CARGO: "Presidente",
  SG_UF: "BR",
  NM_UE: "BRASIL",
  NR_CNPJ_EMPRESA: "29550908000150",
  NM_EMPRESA: "PODERDATA",
  NM_EMPRESA_FANTASIA: "PODERDATA",
  QT_ENTREVISTADO: "2400",
  DT_FIM_PESQUISA: "2026-08-26 00:00:00",
  DT_DIVULGACAO: "2026-08-27 00:00:00",
  DS_METODOLOGIA_PESQUISA: "ligações para celulares, sistema URA",
};

test("rowToPoll refuses missing firstRound", () => {
  const house = matchAllowlist(poderRow);
  assert.equal(rowToPoll(poderRow, {}, house), null);
  assert.equal(rowToPoll(poderRow, { firstRound: { lula: 38 } }, house), null);
});

test("processPending skips governor and never returns a published dataset", () => {
  const polls = [
    {
      id: "keep",
      institute: "Datafolha",
      notes: "TSE BR-04496/2026",
      firstRound: { lula: 40, flavio: 30 },
    },
  ];
  const pending = [
    { tse: "SP-00001/2026" },
    { tse: "BR-04974/2026" },
    { tse: "BR-04496/2026" },
  ];
  const tseRows = [
    {
      NR_PROTOCOLO_REGISTRO: "SP-00001/2026",
      DS_CARGO: "Governador",
      SG_UF: "SP",
      NM_UE: "SÃO PAULO",
    },
    poderRow,
  ];
  const out = processPending({
    pending,
    polls,
    tseRows,
    resultsByTse: {},
  });
  assert.equal(out.report.notPresidente, 1);
  assert.equal(out.report.alreadyInPolls, 1);
  assert.equal(out.report.noVotes, 1);
  assert.equal(out.ready.length, 0);
  assert.equal("polls" in out, false);
});

test("processPending prepares TSE poll when votes exist", () => {
  const out = processPending({
    pending: [{ tse: "BR-04974/2026" }],
    polls: [{ id: "keep", notes: "" }],
    tseRows: [poderRow],
    resultsByTse: resultsFromJsonl([
      {
        tse: "BR-04974/2026",
        firstRound: { lula: 38, flavio: 35, caiado: 4 },
        secondRound: { lula: 45, flavio: 44 },
        moe: 2,
      },
    ]),
  });
  assert.equal(out.report.ready, 1);
  assert.equal(out.ready.length, 1);
  const added = out.ready[0];
  assert.equal(added.institute, "PoderData/Aya");
  assert.equal(added.national, true);
  assert.equal(added.sample, 2400);
  assert.equal(added.mode, "telefone");
  assert.equal(added.firstRound.lula, 38);
  assert.equal(added.secondRound.flavio, 44);
  assert.equal(added.source.tseProtocol, "BR-04974/2026");
});

test("dates and moe helpers", () => {
  assert.equal(parseBrDate("27/08/2026"), "2026-08-27");
  assert.equal(parseBrDate("2026-08-26 00:00:00"), "2026-08-26");
  assert.equal(inferMode("pesquisa presencial em domicílio"), "presencial");
  assert.equal(estimateMoe(2400), 2);
  assert.equal(isNationalRow(poderRow), true);
});

test("coverageFromRow flags Datafolha state samples", async () => {
  const { coverageFromRow } = await import("./process-pending.mjs");
  const state = coverageFromRow({
    DS_PLANO_AMOSTRAL: "Universo: Eleitorado do estado do Ceará Tamanho da amostra: 816",
    QT_ENTREVISTADO: "816",
    NR_CNPJ_EMPRESA: "07630546000175",
    NM_EMPRESA: "DATAFOLHA",
  });
  assert.equal(state, "state");
  const nat = coverageFromRow({
    DS_PLANO_AMOSTRAL: "Universo: eleitoras e eleitores com 16 anos. 2400 entrevistas.",
    QT_ENTREVISTADO: "2400",
    NR_CNPJ_EMPRESA: "29550908000150",
    NM_EMPRESA: "PODERDATA",
    NM_EMPRESA_FANTASIA: "PODERDATA",
  });
  assert.equal(nat, "national");
  const gerp = coverageFromRow({
    DS_PLANO_AMOSTRAL: "2000 entrevistas, universo considerado infinito",
    QT_ENTREVISTADO: "2000",
    NR_CNPJ_EMPRESA: "05270800000146",
    NM_EMPRESA: "GRUPO GERP",
    NM_EMPRESA_FANTASIA: "GERP",
  });
  assert.equal(gerp, "national");
});

test("parser reads Lula tem X% e Flávio, Y% no 1º turno", async () => {
  const { parseAllowlistArticle } = await import("./process-pending.mjs");
  const html = `<title>Lula tem 40% e Flávio, 34% no 1º turno</title>
  <p>registrada no TSE sob o nº BR-00059/2026. Margem de erro de 2 pontos.</p>`;
  const parsed = parseAllowlistArticle(html);
  assert.equal(parsed.tse, "BR-00059/2026");
  assert.equal(parsed.firstRound.lula, 40);
  assert.equal(parsed.firstRound.flavio, 34);
});

test("processPending skips Datafolha state president poll", async () => {
  const { processPending } = await import("./process-pending.mjs");
  const out = processPending({
    pending: [{ tse: "BR-05068/2026" }],
    polls: [{ id: "keep", notes: "" }],
    tseRows: [
      {
        NR_PROTOCOLO_REGISTRO: "BR050682026",
        DS_CARGO: "Presidente",
        SG_UF: "BR",
        NM_UE: "BRASIL",
        NR_CNPJ_EMPRESA: "07630546000175",
        NM_EMPRESA: "DATAFOLHA",
        QT_ENTREVISTADO: "816",
        DT_FIM_PESQUISA: "2026-03-18",
        DT_DIVULGACAO: "2026-03-23",
        DS_PLANO_AMOSTRAL: "Universo: População com 16 anos ou mais, do estado do Ceará",
      },
    ],
    resultsByTse: {},
  });
  assert.equal(out.report.notNational, 1);
  assert.equal(out.ready.length, 0);
});
test("parser reads Gerp Flávio-first 1T", () => {
  const html = `<title>Gerp: Flávio tem 38% e Lula, 37% no 1º turno</title>
  <p>registrada no TSE sob o protocolo BR-08045/2026.</p>
  <p>No 2º turno Flávio Bolsonaro aparece com 45% das intenções de voto, enquanto Lula registra 43%.</p>`;
  const parsed = parseAllowlistArticle(html);
  assert.equal(parsed.tse, "BR-08045/2026");
  assert.equal(parsed.firstRound.flavio, 38);
  assert.equal(parsed.firstRound.lula, 37);
  assert.equal(parsed.secondRound.flavio, 45);
  assert.equal(parsed.secondRound.lula, 43);
});
test("2T-only article does not become firstRound", () => {
  const html = `<title>Gerp: Flávio tem 45% no 2º turno; Lula, 43%</title>
  <p>TSE BR-08045/2026. No segundo turno Flávio Bolsonaro aparece com 45%, Lula registra 43%.</p>`;
  const parsed = parseAllowlistArticle(html);
  assert.equal(parsed.firstRound, null);
  assert.equal(parsed.secondRound.flavio, 45);
  assert.equal(parsed.secondRound.lula, 43);
});

test("alias table still names RTBD Palver Futura; Veritá enters via matchHouse", () => {
  const rtbd = matchAllowlist({
    NM_EMPRESA: "REAL TIME BIG DATA LTDA",
    NM_EMPRESA_FANTASIA: "REAL TIME BIG DATA",
  });
  assert.equal(rtbd?.id, "realtime");
  const verita = {
    NR_CNPJ_EMPRESA: "00654576000172",
    NM_EMPRESA: "INSTITUTO VERITA LTDA",
    NM_EMPRESA_FANTASIA: "VERITA",
  };
  assert.equal(matchAllowlist(verita)?.id, "verita");
  assert.equal(matchHouse(verita)?.institute, "Veritá");
  const palver = matchAllowlist({
    NM_EMPRESA: "PALVER",
    NM_EMPRESA_FANTASIA: "PALVER",
  });
  assert.equal(palver?.id, "palver");
  const futura = matchAllowlist({
    NR_CNPJ_EMPRESA: "52908063000144",
    NM_EMPRESA: "100% CIDADES PARTICIPACOES LTDA",
    NM_EMPRESA_FANTASIA: "100 CIDADES",
  });
  assert.equal(futura?.id, "futura");
  const futuraName = matchAllowlist({
    NM_EMPRESA: "FUTURA INTELIGENCIA",
    NM_EMPRESA_FANTASIA: "FUTURA/APEX",
  });
  assert.equal(futuraName?.id, "futura");
});

test("parser reads Futura 1T with protocol BR-02322", () => {
  const html = `<title>Futura: Lula tem 39,2% das intenções de voto no 1º turno; Flávio, 33,6%</title>
  <p>A pesquisa está registrada no TSE sob o protocolo BR-02322/2026. Margem de erro de 2,2 pontos percentuais.</p>
  <p>No 1º turno Lula alcança 39,2%, seguido de Flávio Bolsonaro, que soma 33,6%. Augusto Cury tem 6,9%.</p>`;
  const parsed = parseAllowlistArticle(html);
  assert.equal(parsed.tse, "BR-02322/2026");
  assert.equal(parsed.firstRound.lula, 39.2);
  assert.equal(parsed.firstRound.flavio, 33.6);
  assert.equal(parsed.firstRound.cury, 6.9);
  assert.equal(parsed.moe, 2.2);
});

test("processPending prepares Futura/100 Cidades when votes exist", () => {
  const out = processPending({
    pending: [{ tse: "BR-02322/2026" }],
    polls: [{ id: "keep", notes: "" }],
    tseRows: [{
      NR_PROTOCOLO_REGISTRO: "BR023222026",
      DS_CARGO: "Presidente",
      SG_UF: "BR",
      NM_UE: "BRASIL",
      NR_CNPJ_EMPRESA: "52908063000144",
      NM_EMPRESA: "100% CIDADES PARTICIPACOES LTDA",
      NM_EMPRESA_FANTASIA: "100 CIDADES",
      QT_ENTREVISTADO: "2000",
      DT_INICIO_PESQUISA: "2026-09-04",
      DT_FIM_PESQUISA: "2026-09-09",
      DT_DIVULGACAO: "2026-09-10",
      DS_METODOLOGIA_PESQUISA: "questionário realizado por meio telefônico",
    }],
    resultsByTse: {
      "BR-02322/2026": {
        firstRound: { lula: 39.2, flavio: 33.6, cury: 6.9 },
        moe: 2.2,
        url: "https://www.cnnbrasil.com.br/eleicoes/futura-lula-tem-392-das-intencoes-de-voto-no-1o-turno-flavio-336/",
        publisher: "cnnbrasil.com.br",
      },
    },
  });
  assert.equal(out.report.ready, 1);
  assert.equal(out.ready[0].institute, "Futura/Apex");
  assert.equal(out.ready[0].source.tseProtocol, "BR-02322/2026");
  assert.equal(out.ready[0].firstRound.lula, 39.2);
  assert.equal(out.ready[0].sample, 2000);
  assert.equal(out.ready[0].moe, 2.2);
  const gap = out.ready[0].firstRound.lula - out.ready[0].firstRound.flavio;
  assert.ok(gap > out.ready[0].moe, "Lula-Flávio gap is larger than the house margin");
});

test("processPending promotes TSE house that was not in the alias table", () => {
  const out = processPending({
    pending: [{ tse: "BR-05888/2026" }],
    polls: [{ id: "keep", notes: "" }],
    tseRows: [{
      NR_PROTOCOLO_REGISTRO: "BR058882026",
      DS_CARGO: "Presidente",
      SG_UF: "BR",
      NM_UE: "BRASIL",
      NR_CNPJ_EMPRESA: "00654576000172",
      NM_EMPRESA: "INSTITUTO VERITA LTDA",
      NM_EMPRESA_FANTASIA: "VERITA",
      QT_ENTREVISTADO: "2000",
      DT_FIM_PESQUISA: "2026-08-20",
      DT_DIVULGACAO: "2026-08-21",
      DS_METODOLOGIA_PESQUISA: "telefone",
    }],
    resultsByTse: {
      "BR-05888/2026": {
        firstRound: { lula: 40, flavio: 32 },
        url: "https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/verita.ghtml",
        publisher: "g1.globo.com",
      },
    },
  });
  assert.equal(out.report.ready, 1);
  assert.equal(out.ready[0].institute, "Veritá");
  assert.equal(out.ready[0].source.tseProtocol, "BR-05888/2026");
  assert.doesNotMatch(out.ready[0].notes, /Allowlist/i);
});

test("unknown TSE house without votes stays pending, not skipped as house", () => {
  const out = processPending({
    pending: [{ tse: "BR-05270/2026" }],
    polls: [{ id: "keep", notes: "" }],
    tseRows: [{
      NR_PROTOCOLO_REGISTRO: "BR052702026",
      DS_CARGO: "Presidente",
      SG_UF: "BR",
      NM_UE: "BRASIL",
      NM_EMPRESA: "INSTITUTO CONECTA DE PESQUISA",
      NM_EMPRESA_FANTASIA: "INSTITUTO CONECTA DE PESQUISA",
      QT_ENTREVISTADO: "2000",
      DT_FIM_PESQUISA: "2026-08-10",
      DT_DIVULGACAO: "2026-08-11",
    }],
    resultsByTse: {},
  });
  assert.equal(out.report.ready, 0);
  assert.equal(out.report.noVotes, 1);
  assert.match(out.remaining[0].reason, /número ainda não extraído/);
  assert.doesNotMatch(out.remaining[0].reason, /allowlist/i);
});

test("Futura 11/09 national is in polls.json", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((poll) => poll.id === "futura-apex-09-10-02322");
  assert.ok(row, "futura-apex-09-10-02322 missing");
  assert.equal(row.national, true);
  assert.equal(row.institute, "Futura/Apex");
  assert.equal(row.date, "2026-09-10");
  assert.equal(row.fieldStart, "2026-09-04");
  assert.equal(row.fieldEnd, "2026-09-09");
  assert.equal(row.sample, 2000);
  assert.equal(row.moe, 2.2);
  assert.equal(row.mode, "telefone");
  assert.equal(row.firstRound.lula, 39.2);
  assert.equal(row.firstRound.flavio, 33.6);
  assert.equal(row.firstRound.cury, 6.4);
  assert.equal(row.source.tseProtocol, "BR-02322/2026");
  assert.match(row.source.url, /exame\.com/);
  assert.doesNotMatch(row.notes, /—/);
  assert.doesNotMatch(row.notes, /Allowlist/i);
});

test("Palver 09/09 national is in polls.json", () => {
  const polls = JSON.parse(readFileSync("src/data/polls.json", "utf8"));
  const row = polls.find((poll) => poll.id === "palver-09-09-05420");
  assert.ok(row, "palver-09-09-05420 missing");
  assert.equal(row.national, true);
  assert.equal(row.institute, "Palver");
  assert.equal(row.date, "2026-09-09");
  assert.equal(row.fieldStart, "2026-09-04");
  assert.equal(row.fieldEnd, "2026-09-07");
  assert.equal(row.sample, 5000);
  assert.equal(row.moe, 3);
  assert.equal(row.mode, "online");
  assert.equal(row.firstRound.lula, 40);
  assert.equal(row.firstRound.flavio, 39);
  assert.equal(row.firstRound.renan, 11);
  assert.equal(row.firstRound.cury, 4);
  assert.equal(row.secondRound.lula, 44);
  assert.equal(row.secondRound.flavio, 46);
  assert.equal(row.source.tseProtocol, "BR-05420/2026");
  assert.doesNotMatch(row.notes, /—/);
});

test("Cloudflare challenge pages are skipped", () => {
  assert.equal(isChallengeHtml("<title>Just a moment...</title>"), true);
  assert.equal(isChallengeHtml("<html><p>Lula tem 40%</p></html>"), false);
});

test("protocol search prefers G1, Exame and Gazeta before CNN", () => {
  const urls = searchUrlsForProtocols(["BR-03490/2026"]);
  assert.equal(urls.length, 4);
  assert.match(urls[0], /g1\.globo\.com\/busca/);
  assert.match(urls[1], /exame\.com/);
  assert.match(urls[2], /gazetadopovo\.com\.br/);
  assert.match(urls[3], /cnnbrasil\.com\.br/);
});

test("unknown sample below 1800 is not national", () => {
  const out = processPending({
    pending: [{ tse: "BR-09140/2026" }],
    polls: [{ id: "keep", notes: "" }],
    tseRows: [{
      NR_PROTOCOLO_REGISTRO: "BR091402026",
      DS_CARGO: "Presidente",
      SG_UF: "BR",
      NM_UE: "BRASIL",
      NM_EMPRESA: "REAL TIME BIG DATA",
      QT_ENTREVISTADO: "1600",
      DT_FIM_PESQUISA: "2026-08-25",
      DT_DIVULGACAO: "2026-08-26",
      DS_PLANO_AMOSTRAL: "amostra 1600",
    }],
    resultsByTse: { "BR-09140/2026": { firstRound: { lula: 40, flavio: 39 } } },
  });
  assert.equal(out.report.notNational, 1);
  assert.equal(out.ready.length, 0);
});

test("2T da Quaest nao copia Atlas 1T de teaser na mesma pagina", () => {
  const html = `<title>Quaest: Lula tem 37% no 1o turno; Flavio, 30% e Cury, 10%</title>
  <p>registrada no TSE sob o n. BR-07065/2026. Margem de erro de 2 pontos.</p>
  <p>Mais Quaest: Lula tem 42% das intencoes de voto no 2o turno; Flavio, 41%</p>
  <p>Atlas: Lula tem 43,4% no 1o turno; Flavio, 33,7%; Cury, 7,8%</p>`;
  const parsed = parseAllowlistArticle(html);
  assert.equal(parsed.tse, "BR-07065/2026");
  assert.equal(parsed.firstRound.lula, 37);
  assert.equal(parsed.firstRound.flavio, 30);
  assert.equal(parsed.secondRound.lula, 42);
  assert.equal(parsed.secondRound.flavio, 41);
});

test("rowToPoll keeps TSE field start and end", () => {
  const house = matchAllowlist(poderRow);
  const poll = rowToPoll(
    { ...poderRow, DT_INICIO_PESQUISA: "2026-08-24 00:00:00" },
    { firstRound: { lula: 38, flavio: 32 } },
    house,
  );
  assert.equal(poll.fieldEnd, "2026-08-26");
  assert.equal(poll.fieldStart, "2026-08-24");
});

test("2T article with Flavio first still reads Lula 44 Flavio 45", () => {
  const html = `<p>TSE BR-07561/2026. Pesquisa PoderData segundo turno.
  Flávio marcando 45%, enquanto o petista registra 44% das intenções de voto.
  Margem de erro 1,8 ponto.</p>`;
  const parsed = parseAllowlistArticle(html, "BR-07561/2026");
  assert.equal(parsed.secondRound.lula, 44);
  assert.equal(parsed.secondRound.flavio, 45);
});

test("CNN CE Atlas URL is statewide, not national", async () => {
  const { articleLooksState } = await import("./process-pending.mjs");
  assert.equal(
    articleLooksState({
      url: "https://www.cnnbrasil.com.br/eleicoes/atlas-focus-lula-tem-516-no-1o-turno-no-ce-flavio-257/",
    }),
    true,
  );
  assert.equal(
    articleLooksState({
      url: "https://www.cnnbrasil.com.br/eleicoes/datafolha-lula-38-flavio-33/",
    }),
    false,
  );
});

