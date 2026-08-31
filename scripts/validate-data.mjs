#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PATH = join(ROOT, "src/data/polls.json");

function normalizeProtocol(raw) {
  const value = String(raw ?? "").toUpperCase().replace(/\s+/g, "");
  const match = value.match(/^([A-Z]{2})-?(\d{1,6})\/(\d{4})$/);
  return match ? `${match[1]}-${match[2].padStart(5, "0")}/${match[3]}` : value;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function checkRound(errors, poll, round, label) {
  if (!round || typeof round !== "object" || Array.isArray(round)) {
    errors.push(`${poll.id}: ${label} ausente ou inválido`);
    return;
  }
  for (const [candidate, value] of Object.entries(round)) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors.push(`${poll.id}: ${label}.${candidate} fora de 0..100`);
    }
  }
}

export function validatePolls(polls) {
  const errors = [];
  if (!Array.isArray(polls)) return ["polls.json precisa ser um array"];
  const ids = new Set();
  const protocols = new Set();

  for (const [index, poll] of polls.entries()) {
    if (!poll || typeof poll !== "object" || Array.isArray(poll)) {
      errors.push(`posição ${index}: pesquisa inválida`);
      continue;
    }
    if (typeof poll.id !== "string" || !poll.id.trim()) {
      errors.push(`posição ${index}: id ausente`);
    } else if (ids.has(poll.id)) {
      errors.push(`${poll.id}: id duplicado`);
    } else {
      ids.add(poll.id);
    }
    if (!isIsoDate(poll.date) || !isIsoDate(poll.fieldEnd)) {
      errors.push(`${poll.id}: date/fieldEnd inválidos`);
    }
    if (!Number.isFinite(poll.sample) || poll.sample <= 0) {
      errors.push(`${poll.id}: amostra precisa ser positiva`);
    }
    if (!Number.isFinite(poll.moe) || poll.moe <= 0) {
      errors.push(`${poll.id}: margem de erro precisa ser positiva`);
    }
    checkRound(errors, poll, poll.firstRound, "firstRound");
    if (poll.secondRound != null) checkRound(errors, poll, poll.secondRound, "secondRound");
    for (const [pairIndex, pair] of (poll.secondPairs ?? []).entries()) {
      if (!pair || typeof pair.a !== "string" || typeof pair.b !== "string" ||
          !Number.isFinite(pair.aPct) || !Number.isFinite(pair.bPct) ||
          pair.aPct < 0 || pair.aPct > 100 || pair.bPct < 0 || pair.bPct > 100) {
        errors.push(`${poll.id}: secondPairs[${pairIndex}] incompleto`);
      }
    }

    const source = poll.source;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      errors.push(`${poll.id}: source estruturado ausente`);
      continue;
    }
    if (typeof source.publisher !== "string" || !source.publisher.trim()) {
      errors.push(`${poll.id}: source.publisher ausente`);
    }
    if (!isIsoDate(source.publishedAt)) {
      errors.push(`${poll.id}: source.publishedAt inválido`);
    }
    if (typeof source.capturedAt !== "string" || Number.isNaN(Date.parse(source.capturedAt))) {
      errors.push(`${poll.id}: source.capturedAt inválido`);
    }
    if (source.url !== null && (typeof source.url !== "string" || !/^https:\/\//.test(source.url))) {
      errors.push(`${poll.id}: source.url precisa ser HTTPS ou null`);
    }
    if (source.tseProtocol !== null) {
      const protocol = normalizeProtocol(source.tseProtocol);
      if (!/^[A-Z]{2}-\d{5}\/\d{4}$/.test(protocol)) {
        errors.push(`${poll.id}: protocolo TSE inválido`);
      } else if (protocols.has(protocol)) {
        errors.push(`${poll.id}: protocolo TSE duplicado ${protocol}`);
      } else {
        protocols.add(protocol);
      }
    }
  }
  return errors;
}

export function readAndValidate(path = DEFAULT_PATH) {
  const polls = JSON.parse(readFileSync(path, "utf8"));
  return { polls, errors: validatePolls(polls) };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { polls, errors } = readAndValidate(process.argv[2] ?? DEFAULT_PATH);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`[data] ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(`[data] ${polls.length} pesquisas válidas\n`);
}
