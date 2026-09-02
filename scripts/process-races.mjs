#!/usr/bin/env node
/**
 * Governador e senador: TSE + allowlist + artigo G1/CNN -> race-polls.json.
 * Não inventa voto. Sem >=2 nomes do catálogo com %, descarta.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  estimateMoe,
  fetchBuf,
  htmlToText,
  inferMode,
  isChallengeHtml,
  loadTseRows,
  matchAllowlist,
  normalizeProtocol,
  parseBrDate,
  parseSample,
} from "./process-pending.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RACE_JSON = join(ROOT, "src/data/race-polls.json");
const CAND_JSON = join(ROOT, "src/data/candidates.json");
const LOG = join(ROOT, "data/inbox/races.log");

const G1_UF = {
  AC: "ac/acre",
  AL: "al/alagoas",
  AM: "am/amazonas",
  AP: "ap/amapa",
  BA: "ba/bahia",
  CE: "ce/ceara",
  DF: "df/distrito-federal",
  ES: "es/espirito-santo",
  GO: "go/goias",
  MA: "ma/maranhao",
  MG: "mg/minas-gerais",
  MS: "ms/mato-grosso-do-sul",
  MT: "mt/mato-grosso",
  PA: "pa/para",
  PB: "pb/paraiba",
  PE: "pe/pernambuco",
  PI: "pi/piaui",
  PR: "pr/parana",
  RJ: "rj/rio-de-janeiro",
  RN: "rn/rio-grande-do-norte",
  RO: "ro/rondonia",
  RR: "rr/roraima",
  RS: "rs/rio-grande-do-sul",
  SC: "sc/santa-catarina",
  SE: "se/sergipe",
  SP: "sp/sao-paulo",
  TO: "to/tocantins",
};

const STOP = new Set(["das", "dos", "de", "da", "do", "e", "del", "van"]);
const RACE_HOUSES = new Set(["quaest", "datafolha", "realtime"]);

export function raceOfficesFromCargo(cargo) {
  const t = String(cargo ?? "");
  const out = [];
  if (/governador/i.test(t)) out.push("governor");
  if (/senador/i.test(t)) out.push("senator");
  return out;
}

export function foldName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function raceParsePct(raw) {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 1 || n > 80) return null;
  return Math.round(n * 10) / 10;
}

export function matchCandidatePercents(text, candidates) {
  const first = {};
  const ranked = [...candidates].sort((a, b) => b.name.length - a.name.length);
  for (const candidate of ranked) {
    if (first[candidate.slug] != null) continue;
    const folded = foldName(candidate.name);
    const parts = folded.split(" ").filter((w) => w.length >= 4 && !STOP.has(w));
    const last = parts.at(-1);
    const patterns = [candidate.name, last, candidate.slug].filter(Boolean);
    for (const pat of patterns) {
      const re = new RegExp(escapeRe(pat) + "[^0-9]{0,48}(\\d{1,2}(?:[.,]\\d)?)\\s*%", "i");
      const m = String(text).match(re);
      const pct = m ? raceParsePct(m[1]) : null;
      if (pct != null) {
        first[candidate.slug] = pct;
        break;
      }
    }
  }
  return first;
}

export function racePollId(institute, uf, office, date) {
  const slug = String(institute)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const short = office === "governor" ? "gov" : "sen";
  const parts = String(date).split("-");
  return `${slug}-${String(uf).toLowerCase()}-${short}-${parts[1] ?? "00"}-${parts[2] ?? "00"}`;
}

function log(line) {
  const row = `${new Date().toISOString()} ${line}\n`;
  writeFileSync(LOG, row, { flag: "a" });
  process.stdout.write(row);
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

function isRaceArticle(url) {
  const u = String(url).toLowerCase();
  if (/wp-json|\/tag\/|\/page\/|busca\?|\/author\//.test(u)) return false;
  if (!/g1\.globo\.com|cnnbrasil\.com\.br/.test(u)) return false;
  if (/presidente|lula-tem|flavio-bolsonaro/.test(u) && !/governador|senado|senador/.test(u)) {
    return false;
  }
  return /pesquisa|quaest|datafolha|governador|senador|senado|eleicoes\/2026/.test(u);
}

export function rowToRacePolls(row, house, percentsByOffice, url) {
  const uf = String(row.SG_UF ?? "").trim().toUpperCase();
  const proto = normalizeProtocol(row.NR_PROTOCOLO_REGISTRO ?? "");
  const sample = parseSample(row.QT_ENTREVISTADO);
  const fieldEnd = parseBrDate(row.DT_FIM_PESQUISA);
  const date =
    parseBrDate(row.DT_DIVULGACAO) || fieldEnd || parseBrDate(row.DT_INICIO_PESQUISA);
  if (!uf || !proto || !sample || !fieldEnd || !date || !house) return [];
  const polls = [];
  for (const office of raceOfficesFromCargo(row.DS_CARGO)) {
    const firstRound = percentsByOffice[office];
    if (!firstRound || Object.keys(firstRound).length < 2) continue;
    polls.push({
      id: racePollId(house.institute, uf, office, date),
      office,
      uf,
      institute: house.institute,
      date,
      fieldEnd,
      sample,
      moe: estimateMoe(sample),
      mode: inferMode(row.DS_METODOLOGIA_PESQUISA),
      firstRound,
      notes: `Auto ${house.id}. TSE ${proto}. ${url ?? ""}`.trim(),
    });
  }
  return polls;
}

function knownRaceKeys(polls) {
  const ids = new Set(polls.map((p) => p.id));
  const tse = new Set();
  for (const p of polls) {
    for (const m of String(p.notes ?? "").matchAll(/\b([A-Z]{2})-(\d{1,6})\/2026\b/gi)) {
      tse.add(normalizeProtocol(m[0]));
    }
  }
  return { ids, tse };
}

async function fetchRaceArticles(ufs) {
  const pages = new Set();
  const listings = [];
  for (const uf of ufs) {
    const path = G1_UF[uf];
    if (path) listings.push(`https://g1.globo.com/${path}/eleicoes/2026/`);
    listings.push(`https://www.cnnbrasil.com.br/?s=Quaest+governador+${uf}`);
    listings.push(`https://www.cnnbrasil.com.br/?s=Datafolha+governador+${uf}`);
  }
  listings.unshift("https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/");
  listings.unshift("https://g1.globo.com/sp/sao-paulo/eleicoes/2026/");
  listings.unshift("https://g1.globo.com/mg/minas-gerais/eleicoes/2026/");
  listings.unshift("https://g1.globo.com/rj/rio-de-janeiro/eleicoes/2026/");
  listings.unshift("https://g1.globo.com/ba/bahia/eleicoes/2026/");
  for (const listing of listings.slice(0, 24)) {
    try {
      const buf = await fetchBuf(listing, 2_000_000);
      const html = buf.toString("utf8");
      if (isChallengeHtml(html)) continue;
      for (const href of extractLinks(html, listing)) {
        if (isRaceArticle(href)) pages.add(href);
      }
    } catch (err) {
      log(`listing_fail ${listing} ${err instanceof Error ? err.message : err}`);
    }
  }
  const htmlByUrl = {};
  let fetched = 0;
  for (const url of pages) {
    if (fetched >= 40) break;
    try {
      const buf = await fetchBuf(url, 800_000);
      fetched += 1;
      const html = buf.toString("utf8");
      if (isChallengeHtml(html)) continue;
      htmlByUrl[url] = html;
    } catch (err) {
      log(`page_fail ${url} ${err instanceof Error ? err.message : err}`);
    }
  }
  log(`race_fetch pages=${fetched} keep=${Object.keys(htmlByUrl).length}`);
  return htmlByUrl;
}

function articleMatchesUf(html, url, uf) {
  const aliases = {
    AC: ["acre", "/ac/"], AL: ["alagoas", "/al/"], AM: ["amazonas", "/am/"], AP: ["amapa", "/ap/"],
    BA: ["bahia", "/ba/"], CE: ["ceara", "/ce/"], DF: ["distrito federal", "/df/"], ES: ["espirito santo", "/es/"],
    GO: ["goias", "/go/"], MA: ["maranhao", "/ma/"], MG: ["minas", "/mg/"], MS: ["mato grosso do sul", "/ms/"],
    MT: ["mato grosso", "/mt/"], PA: ["para", "/pa/"], PB: ["paraiba", "/pb/"], PE: ["pernambuco", "/pe/"],
    PI: ["piaui", "/pi/"], PR: ["parana", "/pr/"], RJ: ["rio de janeiro", "/rj/"], RN: ["rio grande do norte", "/rn/"],
    RO: ["rondonia", "/ro/"], RR: ["roraima", "/rr/"], RS: ["rio grande do sul", "/rs/"], SC: ["santa catarina", "/sc/"],
    SE: ["sergipe", "/se/"], SP: ["sao paulo", "/sp/"], TO: ["tocantins", "/to/"],
  };
  const keys = aliases[uf] || [String(uf).toLowerCase()];
  const blob = `${url} ${htmlToText(html)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return keys.some((k) => blob.includes(k));
}

function percentsFromArticle(html, candidates, office) {
  const text = htmlToText(html);
  if (office === "governor" && !/governador/i.test(text)) return null;
  if (office === "senator" && !/senador|senado/i.test(text)) return null;
  const first = matchCandidatePercents(text, candidates);
  return Object.keys(first).length >= 2 ? first : null;
}

export function mergeRacePolls(file, incoming) {
  const polls = [...(file.polls ?? [])];
  const { ids } = knownRaceKeys(polls);
  const added = [];
  for (const poll of incoming) {
    if (ids.has(poll.id)) continue;
    polls.push(poll);
    ids.add(poll.id);
    added.push(poll);
  }
  const asOf = polls.reduce((max, p) => (p.date > max ? p.date : max), file.asOf ?? "2026-01-01");
  return {
    file: {
      source: file.source,
      asOf,
      polls,
    },
    added,
  };
}

function writeJsonAtomic(path, value) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, path);
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const file = JSON.parse(readFileSync(RACE_JSON, "utf8"));
  const catalog = JSON.parse(readFileSync(CAND_JSON, "utf8")).candidates ?? [];
  const tseRows = await loadTseRows();
  const { ids, tse } = knownRaceKeys(file.polls ?? []);
  const ranked = [];
  for (const row of tseRows) {
    const proto = normalizeProtocol(row.NR_PROTOCOLO_REGISTRO ?? "");
    const uf = String(row.SG_UF ?? "").trim().toUpperCase();
    const offices = raceOfficesFromCargo(row.DS_CARGO);
    if (!proto || !G1_UF[uf] || !offices.length) continue;
    if (tse.has(proto)) continue;
    const house = matchAllowlist(row);
    if (!house || !RACE_HOUSES.has(house.id)) continue;
    ranked.push({
      row: { ...row, _proto: proto },
      house,
      uf,
      offices,
      fieldEnd: parseBrDate(row.DT_FIM_PESQUISA) || "",
    });
  }
  ranked.sort((a, b) => String(b.fieldEnd).localeCompare(String(a.fieldEnd)));
  const work = ranked.slice(0, 24);
  const ufs = [...new Set(work.map((w) => w.uf))].slice(0, 8);
  log(`race_need rows=${work.length} ufs=${ufs.join(",")}`);
  const articles = dry ? {} : await fetchRaceArticles(ufs);
  const incoming = [];
  for (const item of work) {
    for (const [url, html] of Object.entries(articles)) {
      if (!articleMatchesUf(html, url, item.uf)) continue;
      const percentsByOffice = {};
      for (const office of item.offices) {
        const people = catalog.filter(
          (c) => c.uf === item.uf && c.office === office,
        );
        const first = percentsFromArticle(html, people, office);
        if (first) percentsByOffice[office] = first;
      }
      const polls = rowToRacePolls(item.row, item.house, percentsByOffice, url);
      for (const poll of polls) {
        if (!ids.has(poll.id)) {
          incoming.push(poll);
          ids.add(poll.id);
        }
      }
    }
  }
  const merged = mergeRacePolls(file, incoming);
  log(`race_ready added=${merged.added.length} total=${merged.file.polls.length}`);
  if (dry || !merged.added.length) return;
  writeJsonAtomic(RACE_JSON, merged.file);
  for (const poll of merged.added) {
    log(`race_add ${poll.id} ${poll.uf} ${poll.office}`);
  }
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    log(`fatal ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
