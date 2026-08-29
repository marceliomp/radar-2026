#!/usr/bin/env node
/**
 * Descobre protocolos TSE via CKAN package_show (não HTML da landing).
 * Recursos "CSV" do TSE vêm em ZIP; unzip + NR_PROTOCOLO_REGISTRO.
 * Novos vão para data/inbox/pending.jsonl. Nunca inventa firstRound/secondRound.
 * Nunca zera polls.json. CKAN vazio/403 = log honesto + exit 0.
 */
import {
  copyFileSync,
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
const SKIPPED = join(ROOT, "data/inbox/skipped.jsonl");
const LOG = join(ROOT, "data/inbox/ingest.log");

const CKAN_URL =
  process.env.TSE_CKAN_URL ??
  "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=pesquisas-eleitorais-2026";

const FETCH_MAX_BYTES = 12_000_000;

export function atomicWriteJson(path, value) {
  if (value === undefined) throw new Error("refuse to write undefined");
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  renameSync(tmp, path);
}

function log(line) {
  mkdirSync(dirname(LOG), { recursive: true });
  const row = `${new Date().toISOString()} ${line}\n`;
  writeFileSync(LOG, row, { flag: "a" });
  process.stdout.write(row);
}

function loadPolls() {
  if (!existsSync(POLLS_JSON)) return [];
  return JSON.parse(readFileSync(POLLS_JSON, "utf8"));
}

function extractProtocols(text) {
  if (!text) return [];
  const found = new Set();
  const src = String(text);
  for (const m of src.matchAll(/\b([A-Z]{2}-\d+\/2026)\b/gi)) {
    found.add(m[1].toUpperCase());
  }
  for (const m of src.matchAll(/\b([A-Z]{2})(\d{5})2026\b/g)) {
    found.add(`${m[1].toUpperCase()}-${m[2]}/2026`);
  }
  return [...found];
}

function knownProtocols(polls) {
  const set = new Set();
  for (const p of polls) {
    for (const proto of extractProtocols(p.notes ?? "")) set.add(proto);
    const m = String(p.notes ?? "").match(/TSE\s+([A-Z]{2}-\d+\/\d+)/i);
    if (m) set.add(m[1].toUpperCase());
    if (p.tse) set.add(String(p.tse).toUpperCase());
  }
  return set;
}

function loadSeenInboxTse() {
  const set = new Set();
  for (const path of [INBOX, SKIPPED]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line);
        if (o.tse) set.add(String(o.tse).toUpperCase());
      } catch {
        /* linha quebrada: ignora */
      }
    }
  }
  return set;
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

async function fetchBuf(url, maxBytes = FETCH_MAX_BYTES) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "radar-2026-ingest/1.0",
      accept: "application/zip,text/csv,application/json,*/*",
    },
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf;
}

function protocolsFromPayload(buf) {
  if (isZip(buf)) {
    const found = new Set();
    for (const text of unzipCsvTexts(buf)) {
      for (const p of extractProtocols(text)) found.add(p);
    }
    return [...found];
  }
  return extractProtocols(buf.toString("latin1"));
}

async function discoverTse() {
  try {
    const res = await fetch(CKAN_URL, {
      headers: {
        "user-agent": "radar-2026-ingest/1.0",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      log(`ckan_http ${res.status}`);
      return [];
    }
    const body = await res.text();
    let pkg;
    try {
      pkg = JSON.parse(body);
    } catch {
      log(`ckan_not_json bytes=${body.length}`);
      return [];
    }
    if (!pkg?.success || !pkg.result) {
      log(`ckan_empty success=${pkg?.success}`);
      return [];
    }
    const resources = pkg.result.resources ?? [];
    const found = new Set(extractProtocols(body));
    const targets = resources.filter(isPollRegistryResource);
    log(`ckan_ok resources=${resources.length} poll_files=${targets.length}`);
    for (const r of targets) {
      const url = String(r.url ?? "");
      if (!url) continue;
      try {
        const buf = await fetchBuf(url);
        for (const p of protocolsFromPayload(buf)) found.add(p);
      } catch (err) {
        log(`csv_fail ${url} ${err instanceof Error ? err.message : err}`);
      }
    }
    return [...found];
  } catch (err) {
    log(`ckan_fetch_fail ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function appendInbox(obj) {
  mkdirSync(dirname(INBOX), { recursive: true });
  writeFileSync(INBOX, JSON.stringify(obj) + "\n", { flag: "a" });
}

async function main() {
  mkdirSync(join(ROOT, "data/inbox"), { recursive: true });
  const polls = loadPolls();
  const backup = POLLS_JSON + ".bak";
  if (existsSync(POLLS_JSON)) copyFileSync(POLLS_JSON, backup);

  const known = knownProtocols(polls);
  const alreadyPending = loadSeenInboxTse();
  const discovered = await discoverTse();
  const fresh = discovered.filter(
    (p) => !known.has(p) && !alreadyPending.has(p),
  );

  if (!fresh.length) {
    log(
      `ok no_new_protocol known=${known.size} pending=${alreadyPending.size} scraped=${discovered.length}`,
    );
    return;
  }

  for (const tse of fresh) {
    appendInbox({
      at: new Date().toISOString(),
      tse,
      reason: "protocolo TSE novo; número ainda não extraído (allowlist)",
    });
  }
  log(`pending ${fresh.length} protocols=${fresh.slice(0, 8).join(",")}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    log(`fatal ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
