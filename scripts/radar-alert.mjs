#!/usr/bin/env node
/**
 * Alerta Telegram do pipeline Radar 2026.
 *   node scripts/radar-alert.mjs failure  -> pipeline falhou (OnFailure do radar-ingest.service)
 *   node scripts/radar-alert.mjs stall    -> polls.json sem commit há mais de STALL_HOURS
 *   node scripts/radar-alert.mjs held     -> pesquisa presa pela trava da manchete (só as novas)
 * Credenciais: RADAR_TG_TOKEN + RADAR_TG_CHAT (EnvironmentFile da unit). Sem elas, só imprime.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HELD_REASON } from "./process-pending.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const STALL_HOURS = 48;

export function hoursSince(iso, now = new Date()) {
  return (now.getTime() - new Date(iso).getTime()) / 36e5;
}

/** Pesquisas nacionais paradas no inbox com campo encerrado há 2+ dias. */
export function stuckNational(pendingRows, now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 864e5).toISOString().slice(0, 10);
  return pendingRows
    .filter((row) => /^BR-/.test(row.tse ?? "") && row.fieldEnd && row.fieldEnd <= cutoff)
    .sort((a, b) => (a.fieldEnd < b.fieldEnd ? 1 : -1));
}

export function stallMessage({ lastCommitIso, pendingRows = [], now = new Date(), hours = STALL_HOURS }) {
  const age = hoursSince(lastCommitIso, now);
  if (age <= hours) return null;
  const stuck = stuckNational(pendingRows, now);
  const lines = [
    `Radar 2026: nenhuma pesquisa nova no site há ${Math.floor(age)}h.`,
    `Último commit em polls.json: ${lastCommitIso.slice(0, 16).replace("T", " ")} UTC.`,
  ];
  if (stuck.length) {
    lines.push(`Nacionais no inbox sem número (${stuck.length}), mais recentes:`);
    for (const row of stuck.slice(0, 8)) {
      lines.push(`· ${row.institute} ${row.tse} campo até ${row.fieldEnd}`);
    }
    lines.push("Se alguma já saiu na imprensa: npm run polls:promote.");
  }
  return lines.join("\n");
}

const fmtPair = (p) => (p ? `F ${p.flavio} x L ${p.lula}` : "sem número");

/** Pesquisas presas pela trava da manchete que ainda não foram avisadas. */
export function heldMessage(pendingRows, alerted = []) {
  const seen = new Set(alerted);
  const fresh = pendingRows.filter((row) => row.reason === HELD_REASON && !seen.has(row.tse));
  if (!fresh.length) return { text: null, tse: [] };
  const lines = [`Radar 2026: ${fresh.length} pesquisa(s) presa(s), conferir antes de entrar no site:`];
  for (const row of fresh) {
    lines.push(
      `· ${row.institute} ${row.tse} campo até ${row.fieldEnd}: lido ${fmtPair(row.parsed)}, manchete ${fmtPair(row.headline)}`,
    );
    if (row.url) lines.push(`  ${row.url}`);
  }
  return { text: lines.join("\n"), tse: fresh.map((row) => row.tse) };
}

function sh(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readPending() {
  const file = join(ROOT, "data/inbox/pending.jsonl");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function send(text) {
  const token = process.env.RADAR_TG_TOKEN;
  const chat = process.env.RADAR_TG_CHAT;
  process.stdout.write(`${text}\n`);
  if (!token || !chat) {
    process.stdout.write("[radar-alert] sem RADAR_TG_TOKEN/RADAR_TG_CHAT, não enviado\n");
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`telegram http ${res.status}`);
}

async function main(mode) {
  if (mode === "failure") {
    let tail = "";
    try {
      tail = sh("journalctl", ["-u", "radar-ingest.service", "-n", "12", "--no-pager", "-o", "cat"]);
    } catch {
      tail = "(journal indisponível)";
    }
    await send(`Radar 2026: pipeline FALHOU. O site não atualiza até corrigir.\n\n${tail.slice(-1500)}`);
    return;
  }
  if (mode === "stall") {
    try {
      sh("git", ["fetch", "-q", "origin", "main"]);
    } catch {
      /* commit velho já denuncia o problema */
    }
    const lastCommitIso = sh("git", ["log", "-1", "--format=%cI", "origin/main", "--", "src/data/polls.json"]);
    const text = stallMessage({ lastCommitIso, pendingRows: readPending() });
    if (text) await send(text);
    else process.stdout.write("[radar-alert] ok, polls.json recente\n");
    return;
  }
  if (mode === "held") {
    const stateFile = join(ROOT, "data/inbox/held-alerted.json");
    let alerted = [];
    try {
      alerted = JSON.parse(readFileSync(stateFile, "utf8"));
    } catch {
      /* primeiro aviso */
    }
    const { text, tse } = heldMessage(readPending(), alerted);
    if (!text) {
      process.stdout.write("[radar-alert] nenhuma pesquisa presa nova\n");
      return;
    }
    // Aviso não derruba o pipeline: falha do Telegram só fica no log e tenta de novo na próxima hora.
    try {
      await send(text);
      writeFileSync(stateFile, JSON.stringify([...alerted, ...tse]));
    } catch (err) {
      process.stderr.write(`[radar-alert] held não enviado: ${err instanceof Error ? err.message : err}\n`);
    }
    return;
  }
  if (mode === "test") {
    await send("Radar 2026: teste do canal de alerta. Se chegou, está ligado.");
    return;
  }
  throw new Error(`modo desconhecido: ${mode} (failure|stall|held|test)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv[2]).catch((err) => {
    process.stderr.write(`[radar-alert] ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  });
}
