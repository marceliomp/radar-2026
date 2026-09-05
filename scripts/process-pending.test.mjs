import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeProtocol,
  isPresidente,
  isNationalRow,
  matchAllowlist,
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

test("allowlist matches CNPJ not Veritá", () => {
  const poder = matchAllowlist({
    NR_CNPJ_EMPRESA: "29.550.908/0001-50",
    NM_EMPRESA: "PODERDATA",
    NM_EMPRESA_FANTASIA: "PODERDATA",
  });
  assert.equal(poder?.id, "poderdata");
  const verita = matchAllowlist({
    NR_CNPJ_EMPRESA: "00654576000172",
    NM_EMPRESA: "INSTITUTO VERITA LTDA",
    NM_EMPRESA_FANTASIA: "VERITA",
  });
  assert.equal(verita, null);
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

test("processPending prepares allowlist poll when votes exist", () => {
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

test("allowlist includes RTBD and still rejects Veritá", () => {
  const rtbd = matchAllowlist({
    NM_EMPRESA: "REAL TIME BIG DATA LTDA",
    NM_EMPRESA_FANTASIA: "REAL TIME BIG DATA",
  });
  assert.equal(rtbd?.id, "realtime");
  const verita = matchAllowlist({
    NR_CNPJ_EMPRESA: "00654576000172",
    NM_EMPRESA: "INSTITUTO VERITA LTDA",
    NM_EMPRESA_FANTASIA: "VERITA",
  });
  assert.equal(verita, null);
});

test("Cloudflare challenge pages are skipped", () => {
  assert.equal(isChallengeHtml("<title>Just a moment...</title>"), true);
  assert.equal(isChallengeHtml("<html><p>Lula tem 40%</p></html>"), false);
});

test("protocol search targets G1 and CNN", () => {
  const urls = searchUrlsForProtocols(["BR-03490/2026"]);
  assert.equal(urls.length, 2);
  assert.match(urls[0], /g1\.globo\.com\/busca/);
  assert.match(urls[1], /cnnbrasil\.com\.br/);
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

