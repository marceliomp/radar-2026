#!/usr/bin/env node
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteJson } from "./ingest-polls.mjs";
import { normalizeProtocol } from "./process-pending.mjs";
import { validatePolls } from "./validate-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POLLS_JSON = join(ROOT, "src/data/polls.json");
const READY = join(ROOT, "data/inbox/ready.jsonl");

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`${path}:${index + 1} contém JSON inválido`);
      }
    });
}

function writeJsonlAtomic(path, rows) {
  const temporary = `${path}.${process.pid}.tmp`;
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(temporary, body ? `${body}\n` : "");
  renameSync(temporary, path);
}

export function promotePoll({ protocol, polls, ready }) {
  const wanted = normalizeProtocol(protocol);
  const index = ready.findIndex(
    (poll) => normalizeProtocol(poll.source?.tseProtocol) === wanted,
  );
  if (index < 0) throw new Error(`${wanted} não está em ready.jsonl`);
  const candidate = ready[index];
  const nextPolls = [...polls, candidate];
  const errors = validatePolls(nextPolls);
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    candidate,
    polls: nextPolls,
    ready: ready.filter((_, rowIndex) => rowIndex !== index),
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const protocol = argValue("--tse");
    if (!protocol) throw new Error("uso: npm run polls:promote -- --tse BR-00000/2026");
    const polls = JSON.parse(readFileSync(POLLS_JSON, "utf8"));
    const ready = readJsonl(READY);
    const promoted = promotePoll({ protocol, polls, ready });
    atomicWriteJson(POLLS_JSON, promoted.polls);
    writeJsonlAtomic(READY, promoted.ready);
    process.stdout.write(`[promote] ${promoted.candidate.id} validada e adicionada a polls.json\n`);
  } catch (error) {
    process.stderr.write(`[promote] ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}
