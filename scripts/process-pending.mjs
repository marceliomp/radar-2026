#!/usr/bin/env node
/**
 * Processa data/inbox/pending.jsonl contra o CSV TSE e a allowlist
 * (Poder360, Datafolha, Gerp, RTBD, Atlas, Nexus, Quaest, Vox). Produz ready.jsonl com
 * instituto + campo + n + protocolo TSE + firstRound parseado.
 * Nunca inventa voto e nunca altera a fonte pública polls.json.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POLLS_JSON = join(ROOT, "src/data/polls.json");
const INBOX = join(ROOT, "data/inbox/pending.jsonl");
const READY = join(ROOT, "data/inbox/ready.jsonl");
const SKIPPED = join(ROOT, "data/inbox/skipped.jsonl");
const RESULTS_JSONL = join(ROOT, "data/inbox/results.jsonl");
const LOG = join(ROOT, "data/inbox/process.log");

const CKAN_URL =
  process.env.TSE_CKAN_URL ??
  "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=pesquisas-eleitorais-2026";
const FETCH_MAX_BYTES = 12_000_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export const ALLOWLIST = [
  {
    id: "poderdata",
    institute: "PoderData/Aya",
    cnpj: "29550908000150",
    nameRe: /poderdata|poder\s*360/i,
    sources: ["poder360"],
  },
  {
    id: "datafolha",
    institute: "Datafolha",
    cnpj: "07630546000175",
    nameRe: /datafolha/i,
    sources: ["g1", "folha"],
  },
  {
    id: "gerp",
    institute: "Gerp",
    cnpj: "05270800000146",
    nameRe: /\bgerp\b/i,
    sources: ["cnn", "gerp"],
  },
  {
    id: "realtime",
    institute: "Real Time Big Data",
    nameRe: /real\s*time\s*big\s*data|\brtbd\b/i,
    sources: ["cnn", "poder360"],
  },
  {
    id: "atlasintel",
    institute: "AtlasIntel",
    nameRe: /atlas\s*intel/i,
    sources: ["poder360", "bloomberg"],
  },
  {
    id: "nexus",
    institute: "Nexus/BTG",
    nameRe: /\bnexus\b/i,
    sources: ["cnn"],
  },
  {
    id: "quaest",
    institute: "Quaest",
    nameRe: /quaest/i,
    sources: ["g1", "globo"],
  },
  {
    id: "vox",
    institute: "Vox Brasil",
    nameRe: /vox\s*brasil/i,
    sources: ["cnn", "exame"],
  },
];

export function normalizeProtocol(raw) {
  const s = String(raw ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  let m = s.match(/^([A-Z]{2})-?(\d{1,6})\/(\d{4})$/);
  if (m) return `${m[1]}-${m[2].padStart(5, "0")}/${m[3]}`;
  m = s.match(/^([A-Z]{2})(\d{5})(\d{4})$/);
  if (m) return `${m[1]}-${m[2]}/${m[3]}`;
  m = s.match(/^([A-Z]{2})-(\d{1,6})$/);
  if (m) return `${m[1]}-${m[2].padStart(5, "0")}/2026`;
  return s;
}

export function parseSemicolonCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;
  const src = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ";") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r") cur += ch;
  }
  if (cur.length || row.length) {
    row.push(cur);
    if (row.some((c) => c.trim())) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().replace(/^"|"$/g, ""));
  return rows.slice(1).map((cols) => {
    const o = {};
    headers.forEach((h, i) => {
      o[h] = (cols[i] ?? "").trim();
    });
    return o;
  });
}

export function isPresidente(cargo) {
  return /^presidente$/i.test(String(cargo ?? "").trim());
}

export function isNationalRow(row) {
  const uf = String(row.SG_UF ?? "").trim().toUpperCase();
  const ue = String(row.NM_UE ?? row.SG_UE ?? "")
    .trim()
    .toUpperCase();
  const proto = normalizeProtocol(row.NR_PROTOCOLO_REGISTRO ?? row._proto ?? "");
  return uf === "BR" && proto.startsWith("BR-") && /BRASIL/.test(ue);
}

export function coverageFromRow(row) {
  const plano = `${row.DS_PLANO_AMOSTRAL ?? ""} ${row.DS_METODOLOGIA_PESQUISA ?? ""}`;
  const n = parseSample(row.QT_ENTREVISTADO) ?? 0;
  if (
    /eleitorado do estado|popula[cç][aã]o.{0,80}do estado|universo:\s*[^.]{0,100}estado d|eleitorado do distrito federal/i.test(
      plano,
    ) &&
    !/27 unidades da federa|eleitorado brasileiro|todo o brasil/i.test(plano)
  ) {
    return "state";
  }
  const house = matchAllowlist(row);
  if (house?.id === "datafolha" && n > 0 && n < 1800) return "state";
  if (house?.id === "poderdata" && n >= 2000) return "national";
  if (house?.id === "gerp" && n >= 1800) return "national";
  if (n >= 2000) return "national";
  if (/27 unidades da federa|eleitorado brasileiro/i.test(plano)) return "national";
  return "unknown";
}

export function matchAllowlist(row) {
  const cnpj = String(row.NR_CNPJ_EMPRESA ?? "").replace(/\D/g, "");
  const blob = `${row.NM_EMPRESA ?? ""} ${row.NM_EMPRESA_FANTASIA ?? ""}`;
  for (const house of ALLOWLIST) {
    if (cnpj && cnpj === house.cnpj) return house;
    if (house.nameRe.test(blob)) return house;
  }
  return null;
}

export function parseBrDate(raw) {
  const s = String(raw ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export function inferMode(metodologia) {
  const t = String(metodologia ?? "").toLowerCase();
  if (/online|internet|painel web|whatsapp/.test(t)) return "online";
  if (/presencial|face a face|domiciliar|ponto de fluxo/.test(t))
    return "presencial";
  if (/telefon|ura|cati|celular|fixo/.test(t)) return "telefone";
  return "telefone";
}

export function estimateMoe(n) {
  const sample = Math.max(Number(n) || 0, 1);
  return Math.round(1.96 * Math.sqrt(0.25 / sample) * 1000) / 10;
}

export function parseSample(raw) {
  const n = Number(String(raw ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function parsePct(s) {
  const n = Number(String(s).replace(",", "."));
  if (!Number.isFinite(n) || n < 5 || n > 70) return null;
  return Math.round(n * 10) / 10;
}

export function pctAfterName(text, nameRe) {
  const re = new RegExp(
    nameRe.source + "[^0-9]{0,48}(\\d{1,2}(?:[.,]\\d)?)\\s*%",
    nameRe.flags.includes("i") ? "i" : "",
  );
  const m = String(text).match(re);
  return m ? parsePct(m[1]) : null;
}

export function firstRoundWindow(text) {
  const src = String(text);
  const before2 = src.split(/2[oº°]?\s*turno|segundo turno/i)[0];
  if (!/1[oº°]?\s*turno|primeiro turno/i.test(src)) return "";
  return before2.length > 40 ? before2 : src;
}

export function parseAllowlistArticle(html, expectedTse) {
  const text = htmlToText(html);
  const found = [
    ...text.matchAll(/\b([A-Z]{2})-(\d{1,6})\/2026\b/gi),
  ].map((m) => normalizeProtocol(m[0]));
  const want = expectedTse ? normalizeProtocol(expectedTse) : null;
  if (want && !found.includes(want)) return null;
  const tse = want || found[0];
  if (!tse) return null;

  const w1 = firstRoundWindow(text);
  let lula = pctAfterName(w1, /Lula/i);
  let flavio = pctAfterName(w1, /Fl[aá]vio(?:\s+Bolsonaro)?/i);
  const vs1 =
    text.match(
      /Lula\s+tem\s+(\d{1,2}(?:[.,]\d)?)\s*%\s*e\s+Fl[aá]vio,\s*(\d{1,2}(?:[.,]\d)?)\s*%[^.]{0,48}1[oº°]?\s*turno/i,
    ) ||
    text.match(
      /Lula\s+tem\s+(\d{1,2}(?:[.,]\d)?)\s*%[^.]{0,28}contra\s+(\d{1,2}(?:[.,]\d)?)\s*%[^.]{0,28}Fl[aá]vio[^.]{0,56}1[oº°]?\s*turno/i,
    );
  if (vs1) {
    lula = parsePct(vs1[1]) ?? lula;
    flavio = parsePct(vs1[2]) ?? flavio;
  }
  if (lula == null || flavio == null) return null;

  const extras = {};
  const extraRe =
    /(Caiado|Renan(?:\s+Santos)?|Zema|Cury)[^0-9]{0,24}(\d{1,2}(?:[.,]\d)?)\s*%/gi;
  let em;
  while ((em = extraRe.exec(w1))) {
    const who = em[1].toLowerCase();
    const pct = parsePct(em[2]);
    if (pct == null) continue;
    if (who.startsWith("caiado")) extras.caiado = pct;
    else if (who.startsWith("renan")) extras.renan = pct;
    else if (who.startsWith("zema")) extras.zema = pct;
    else if (who.startsWith("cury")) extras.cury = pct;
  }

  let secondRound;
  const vs2 =
    text.match(
      /Lula\s+tem\s+(\d{1,2}(?:[.,]\d)?)\s*%[^.]{0,28}contra\s+(\d{1,2}(?:[.,]\d)?)\s*%[^.]{0,28}Fl[aá]vio.{0,80}?2[oº°]?\s*turno/i,
    ) ||
    text.match(
      /2[oº°]?\s*turno.{0,160}?(?:petista|Lula).{0,40}?(\d{1,2}(?:[.,]\d)?)\s*%.{0,80}?(\d{1,2}(?:[.,]\d)?)\s*%/i,
    ) ||
    text.match(
      /petista\s+registra\s+(\d{1,2}(?:[.,]\d)?)\s*%.{0,80}?ante\s+(\d{1,2}(?:[.,]\d)?)\s*%/i,
    );
  if (vs2) {
    const a = parsePct(vs2[1]);
    const b = parsePct(vs2[2]);
    if (a != null && b != null) secondRound = { lula: a, flavio: b };
  }
  if (!secondRound) {
    const parts = text.split(/2[oº°]?\s*turno|segundo turno/i);
    const w2 = parts.slice(1).join(" ");
    const l2 = pctAfterName(w2, /Lula/i);
    const f2 = pctAfterName(w2, /Fl[aá]vio(?:\s+Bolsonaro)?/i);
    if (l2 != null && f2 != null) secondRound = { lula: l2, flavio: f2 };
  }

  const moeM = text.match(/margem de erro[^\d]{0,24}(\d+(?:[.,]\d)?)/i);
  const moe = moeM ? Number(String(moeM[1]).replace(",", ".")) : undefined;

  return {
    tse,
    firstRound: { lula, flavio, ...extras },
    secondRound,
    moe,
    source: "allowlist-html",
  };
}

export function knownProtocols(polls) {
  const set = new Set();
  for (const p of polls) {
    const structured = p.source?.tseProtocol;
    if (structured) set.add(normalizeProtocol(structured));
    const blob = `${p.notes ?? ""} ${p.tse ?? ""} ${p.id ?? ""}`;
    for (const m of blob.matchAll(/\b([A-Z]{2})-(\d{1,6})\/2026\b/gi)) {
      set.add(normalizeProtocol(m[0]));
    }
    if (p.tse) set.add(normalizeProtocol(p.tse));
  }
  return set;
}

export function loadJsonl(path) {
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* linha quebrada */
    }
  }
  return out;
}

export function pollId(institute, date, proto) {
  const slug = String(institute)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const parts = String(date).split("-");
  const mm = parts[1] ?? "00";
  const dd = parts[2] ?? "00";
  const num = (normalizeProtocol(proto).split("-")[1] ?? "").replace(/\D/g, "");
  return `${slug}-${mm}-${dd}-${num.slice(0, 5)}`;
}

export function rowToPoll(row, result, house) {
  const proto = normalizeProtocol(row.NR_PROTOCOLO_REGISTRO ?? row._proto);
  const sample = parseSample(row.QT_ENTREVISTADO);
  const fieldEnd = parseBrDate(row.DT_FIM_PESQUISA);
  const date =
    parseBrDate(row.DT_DIVULGACAO) || fieldEnd || parseBrDate(row.DT_INICIO_PESQUISA);
  const firstRound = result?.firstRound;
  if (!proto || !sample || !fieldEnd || !date || !house) return null;
  if (firstRound?.lula == null || firstRound?.flavio == null) return null;
  const moe =
    Number.isFinite(result?.moe) && result.moe > 0
      ? result.moe
      : estimateMoe(sample);
  const poll = {
    id: pollId(house.institute, date, proto),
    institute: house.institute,
    date,
    fieldEnd,
    sample,
    moe,
    mode: inferMode(row.DS_METODOLOGIA_PESQUISA),
    national: true,
    firstRound: { ...firstRound },
    source: {
      tseProtocol: proto,
      url: result?.url ?? null,
      publisher: result?.publisher ?? house.id,
      publishedAt: date,
      capturedAt: result?.capturedAt ?? new Date().toISOString(),
    },
    notes: `${sample} entrevistas. Allowlist ${house.id}.`,
  };
  if (result.secondRound?.lula != null && result.secondRound?.flavio != null) {
    poll.secondRound = {
      lula: result.secondRound.lula,
      flavio: result.secondRound.flavio,
    };
  }
  return poll;
}

function indexTseRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const proto = normalizeProtocol(row.NR_PROTOCOLO_REGISTRO ?? "");
    if (!proto || map.has(proto)) continue;
    map.set(proto, { ...row, _proto: proto });
  }
  return map;
}

export function processPending({
  pending,
  polls,
  tseRows,
  resultsByTse = {},
}) {
  const known = knownProtocols(polls);
  const ids = new Set(polls.map((p) => p.id));
  const tseIndex = indexTseRows(tseRows);
  const remaining = [];
  const skipped = [];
  const ready = [];
  const report = {
    pendingIn: pending.length,
    alreadyInPolls: 0,
    unmatched: 0,
    notPresidente: 0,
    notNational: 0,
    notAllowlist: 0,
    noVotes: 0,
    ready: 0,
  };

  const seen = new Set();
  for (const item of pending) {
    const proto = normalizeProtocol(item.tse);
    if (!proto || seen.has(proto)) continue;
    seen.add(proto);

    if (known.has(proto)) {
      report.alreadyInPolls += 1;
      skipped.push({
        ...item,
        tse: proto,
        reason: "já está em polls.json",
      });
      continue;
    }

    const row = tseIndex.get(proto);
    if (!row) {
      report.unmatched += 1;
      remaining.push({
        at: item.at ?? new Date().toISOString(),
        tse: proto,
        reason: "protocolo TSE não encontrado no CSV",
      });
      continue;
    }

    if (!isPresidente(row.DS_CARGO)) {
      report.notPresidente += 1;
      skipped.push({
        at: item.at ?? new Date().toISOString(),
        tse: proto,
        cargo: row.DS_CARGO,
        reason: "cargo não é Presidente",
      });
      continue;
    }

    const coverage = coverageFromRow(row);
    const n = parseSample(row.QT_ENTREVISTADO) ?? 0;
    if (!isNationalRow(row) || coverage === "state" || (coverage === "unknown" && n < 1800)) {
      report.notNational += 1;
      skipped.push({
        at: item.at ?? new Date().toISOString(),
        tse: proto,
        reason: "pesquisa estadual, fora do agregador nacional",
        n: parseSample(row.QT_ENTREVISTADO),
      });
      continue;
    }

    const house = matchAllowlist(row);
    if (!house) {
      report.notAllowlist += 1;
      remaining.push({
        at: item.at ?? new Date().toISOString(),
        tse: proto,
        empresa: row.NM_EMPRESA_FANTASIA || row.NM_EMPRESA,
        reason: "Presidente nacional fora da allowlist (Poder360, Datafolha, Gerp)",
      });
      continue;
    }

    const result = resultsByTse[proto];
    const poll = rowToPoll(row, result, house);
    if (!poll) {
      report.noVotes += 1;
      remaining.push({
        at: item.at ?? new Date().toISOString(),
        tse: proto,
        institute: house.institute,
        n: parseSample(row.QT_ENTREVISTADO),
        fieldEnd: parseBrDate(row.DT_FIM_PESQUISA),
        reason: "número ainda não extraído (allowlist)",
      });
      continue;
    }

    let id = poll.id;
    if (ids.has(id)) id = `${poll.id}-b`;
    poll.id = id;
    ids.add(id);
    known.add(proto);
    ready.push(poll);
    report.ready += 1;
  }

  return { remaining, skipped, ready, report };
}

function log(line) {
  mkdirSync(dirname(LOG), { recursive: true });
  const row = `${new Date().toISOString()} ${line}\n`;
  writeFileSync(LOG, row, { flag: "a" });
  process.stdout.write(row);
}

function writeJsonl(path, rows) {
  const tmp = `${path}.${process.pid}.tmp`;
  const body = rows.map((o) => JSON.stringify(o)).join("\n");
  writeFileSync(tmp, body ? body + "\n" : "");
  renameSync(tmp, path);
}

function appendJsonl(path, rows) {
  if (!rows.length) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    rows.map((o) => JSON.stringify(o)).join("\n") + "\n",
    { flag: "a" },
  );
}

function isZip(buf) {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

function unzipCsvTexts(u8) {
  const texts = [];
  let offset = 0;
  while (offset + 30 <= u8.length) {
    const sig = u8.readUInt32LE(offset);
    if (sig === 0x02014b50) break;
    if (sig !== 0x04034b50) break;
    const flags = u8.readUInt16LE(offset + 6);
    const method = u8.readUInt16LE(offset + 8);
    const compSize = u8.readUInt32LE(offset + 18);
    const nameLen = u8.readUInt16LE(offset + 26);
    const extraLen = u8.readUInt16LE(offset + 28);
    const name = u8.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = u8.subarray(dataStart, dataStart + compSize);
    if (name.toLowerCase().endsWith(".csv")) {
      let raw;
      if (method === 0) raw = data;
      else if (method === 8) raw = inflateRawSync(data);
      else {
        offset = dataStart + compSize;
        continue;
      }
      texts.push(Buffer.from(raw).toString("latin1"));
    }
    offset = dataStart + compSize;
    if (flags & 0x8) {
      offset += u8.readUInt32LE(offset) === 0x08074b50 ? 16 : 12;
    }
  }
  return texts;
}

export async function fetchBuf(url, maxBytes = FETCH_MAX_BYTES) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/zip,text/csv,text/html,application/json,*/*" },
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf;
}

function isPollRegistryResource(r) {
  const url = String(r.url ?? "").toLowerCase();
  const name = String(r.name ?? "").toLowerCase();
  const blob = `${url} ${name}`;
  if (/contratante|pagante|nota_fiscal|questionario|bairro/.test(blob)) return false;
  const fmt = String(r.format ?? "").toUpperCase();
  const mime = String(r.mimetype ?? "").toLowerCase();
  return (
    fmt === "CSV" ||
    url.endsWith(".csv") ||
    url.endsWith(".zip") ||
    mime.includes("csv") ||
    mime.includes("zip")
  );
}

export function tseRowsFromZipOrCsv(buf) {
  const texts = isZip(buf) ? unzipCsvTexts(buf) : [buf.toString("latin1")];
  const rows = [];
  for (const text of texts) rows.push(...parseSemicolonCsv(text));
  return rows;
}

export async function loadTseRows() {
  const zipPath = process.env.TSE_ZIP ?? "/tmp/pesquisa_eleitoral_2026.zip";
  if (existsSync(zipPath)) {
    return tseRowsFromZipOrCsv(readFileSync(zipPath));
  }
  try {
    const res = await fetch(CKAN_URL, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      log(`ckan_http ${res.status}`);
      return [];
    }
    const pkg = await res.json();
    const resources = pkg?.result?.resources ?? [];
    const targets = resources.filter(isPollRegistryResource);
    const rows = [];
    for (const r of targets) {
      const url = String(r.url ?? "");
      if (!url) continue;
      try {
        const buf = await fetchBuf(url);
        rows.push(...tseRowsFromZipOrCsv(buf));
      } catch (err) {
        log(`csv_fail ${url} ${err instanceof Error ? err.message : err}`);
      }
    }
    return rows;
  } catch (err) {
    log(`ckan_fetch_fail ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function extractLinks(html, base) {
  const out = new Set();
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (href.startsWith("/")) href = new URL(href, base).href;
    if (/^https?:\/\//i.test(href)) out.add(href.split("#")[0]);
  }
  return [...out];
}

function isVoteArticle(url) {
  const u = String(url);
  if (/wp-json|\/tag\/|\/page\/|oembed|busca\?|\/author\/|#comment/i.test(u)) return false;
  if (!/^https?:\/\/(www\.)?(poder360\.com\.br|g1\.globo\.com|www1\.folha\.uol\.com\.br|cnnbrasil\.com\.br)\//i.test(u)) return false;
  if (/amazonas|sao-paulo|sao_paulo|bahia|ceara|minas|parana|goias|pernambuco|paraiba|rio-grande|distrito-federal/i.test(u)) return false;
  return /lula|flavio|flávio|1o-turno|1º-turno|pesquisa-poderdata|datafolha|gerp|intencao|intenção|real-time|atlasintel|quaest|nexus/i.test(
    u,
  );
}

export function isChallengeHtml(html) {
  const head = String(html).slice(0, 2500);
  return /just a moment|cf-browser-verification|attention required|_cf_chl/i.test(head);
}

export function searchUrlsForProtocols(needTse) {
  const urls = [];
  for (const tse of [...needTse].slice(0, 8)) {
    const q = encodeURIComponent(tse);
    urls.push(`https://g1.globo.com/busca/?q=${q}`);
    urls.push(`https://www.cnnbrasil.com.br/?s=${q}`);
  }
  return urls;
}

function voteScore(url) {
  const u = String(url).toLowerCase();
  let s = 0;
  if (/1o-turno|primeiro-turno/.test(u)) s += 6;
  if (/lula-tem|lula-tem-/.test(u)) s += 5;
  if (/datafolha|gerp|poderdata/.test(u)) s += 4;
  if (/2o-turno|segundo-turno/.test(u)) s += 2;
  if (/rejeicao|aprovad|poderdatacast|ao-vivo/.test(u)) s -= 4;
  return s;
}

async function fetchAllowlistResults(needTse) {
  const byTse = {};
  if (!needTse.size) return byTse;
  const listings = [
    "https://www.poder360.com.br/poderdata/",
    "https://www.poder360.com.br/poderdata/lula-tem-40-e-flavio-34-no-1o-turno/",
    "https://www.poder360.com.br/poderdata/lula-tem-41-e-flavio-35-no-1o-turno/",
    "https://www.poder360.com.br/poderdata/leia-os-resultados-da-pesquisa-poderdata-aya-para-presidente/",
    "https://g1.globo.com/politica/",
    "https://g1.globo.com/politica/eleicoes/2026/",
    "https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/noticia/2026/07/24/datafolha-primeiro-turno-julho.ghtml",
    "https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/noticia/2026/06/20/datafolha-avaliacao-lula-junho.ghtml",
    "https://www.cnnbrasil.com.br/politica/",
    "https://www.cnnbrasil.com.br/eleicoes/",
    "https://www.cnnbrasil.com.br/eleicoes/gerp-flavio-tem-38-e-lula-37-no-1o-turno/",
    "https://www.cnnbrasil.com.br/eleicoes/gerp-flavio-tem-45-das-intencoes-de-voto-no-2o-turno-lula-43/",
    "https://www1.folha.uol.com.br/poder/",
  ];
  const pages = new Set(listings);
  for (const listing of [...listings, ...searchUrlsForProtocols(needTse)]) {
    try {
      const buf = await fetchBuf(listing, 2_000_000);
      const html = buf.toString("utf8");
      if (isChallengeHtml(html)) {
        log(`listing_cf ${listing}`);
        continue;
      }
      for (const href of extractLinks(html, listing)) {
        if (isVoteArticle(href) && !/ao-vivo|poderdatacast|busca\?/.test(href)) {
          pages.add(href);
        }
      }
    } catch (err) {
      log(`listing_fail ${listing} ${err instanceof Error ? err.message : err}`);
    }
  }
  const ordered = [...pages].sort((a, b) => voteScore(b) - voteScore(a));
  let fetched = 0;
  for (const url of ordered) {
    if (fetched >= 80) break;
    if (Object.keys(byTse).length >= needTse.size) break;
    try {
      const buf = await fetchBuf(url, 800_000);
      fetched += 1;
      const html = buf.toString("utf8");
      if (isChallengeHtml(html)) {
        log(`page_cf ${url}`);
        continue;
      }
      const parsed = parseAllowlistArticle(html);
      if (parsed && needTse.has(parsed.tse) && !byTse[parsed.tse]) {
        byTse[parsed.tse] = {
          ...parsed,
          url,
          publisher: new URL(url).hostname.replace(/^www\./, ""),
          capturedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      log(`page_fail ${url} ${err instanceof Error ? err.message : err}`);
    }
  }
  log(`allowlist_fetch pages=${fetched} hits=${Object.keys(byTse).length} need=${needTse.size}`);
  return byTse;
}

export function resultsFromJsonl(rows) {
  const map = {};
  for (const o of rows) {
    const tse = normalizeProtocol(o.tse);
    if (!tse || !o.firstRound) continue;
    if (o.firstRound.lula == null || o.firstRound.flavio == null) continue;
    map[tse] = {
      tse,
      firstRound: o.firstRound,
      secondRound: o.secondRound,
      moe: o.moe,
      source: o.source ?? "results.jsonl",
      url: o.url ?? null,
      publisher: o.publisher ?? "results.jsonl",
      capturedAt: o.capturedAt ?? new Date().toISOString(),
    };
  }
  return map;
}

async function main() {
  mkdirSync(join(ROOT, "data/inbox"), { recursive: true });
  const dry = process.argv.includes("--dry-run");
  const offline = process.argv.includes("--offline") || process.env.OFFLINE === "1";
  const polls = existsSync(POLLS_JSON)
    ? JSON.parse(readFileSync(POLLS_JSON, "utf8"))
    : [];
  if (!Array.isArray(polls)) throw new Error("polls.json não é array");
  const existingReady = loadJsonl(READY);

  const pending = loadJsonl(INBOX);
  const overlay = resultsFromJsonl(loadJsonl(RESULTS_JSONL));
  const tseRows = await loadTseRows();
  log(`tse_rows=${tseRows.length} pending=${pending.length} overlay=${Object.keys(overlay).length}`);

  const tseIndex = indexTseRows(tseRows);
  const need = new Set();
  if (!offline) {
    const known = knownProtocols([...polls, ...existingReady]);
    const ranked = [];
    for (const item of pending) {
      const proto = normalizeProtocol(item.tse);
      const row = tseIndex.get(proto);
      if (!row || known.has(proto) || overlay[proto]) continue;
      if (!isPresidente(row.DS_CARGO) || !isNationalRow(row)) continue;
      const coverage = coverageFromRow(row);
      const n = parseSample(row.QT_ENTREVISTADO) ?? 0;
      if (coverage === "state" || (coverage === "unknown" && n < 1800)) continue;
      if (!matchAllowlist(row)) continue;
      ranked.push({ proto, fieldEnd: parseBrDate(row.DT_FIM_PESQUISA) || "" });
    }
    ranked.sort((a, b) => String(b.fieldEnd).localeCompare(String(a.fieldEnd)));
    for (const row of ranked) need.add(row.proto);
  }
  const fetched = offline ? {} : await fetchAllowlistResults(need);
  const resultsByTse = { ...overlay, ...fetched };
  if (!offline && !dry && Object.keys(fetched).length) {
    const merged = { ...overlay, ...fetched };
    writeJsonl(
      RESULTS_JSONL,
      Object.values(merged).map((row) => ({
        tse: row.tse,
        firstRound: row.firstRound,
        secondRound: row.secondRound,
        moe: row.moe,
        url: row.url ?? null,
        publisher: row.publisher ?? null,
        capturedAt: row.capturedAt,
        source: row.source ?? "allowlist-html",
      })),
    );
  }

  const out = processPending({
    pending,
    polls: [...polls, ...existingReady],
    tseRows,
    resultsByTse,
  });
  log(
    `ok pending_in=${out.report.pendingIn} ready=${out.report.ready} remain=${out.remaining.length} skipped=${out.skipped.length} already=${out.report.alreadyInPolls} no_votes=${out.report.noVotes}`,
  );

  if (dry) {
    log(`dry-run ids=${out.ready.map((p) => p.id).join(",")}`);
    return;
  }

  writeJsonl(READY, [...existingReady, ...out.ready]);
  writeJsonl(INBOX, out.remaining);
  appendJsonl(SKIPPED, out.skipped);
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    log(`fatal ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
