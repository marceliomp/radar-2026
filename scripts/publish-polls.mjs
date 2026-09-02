#!/usr/bin/env node
/**
 * Publica polls.json no GitHub (Vercel puxa main).
 * Sem mudança no arquivo: exit 0. Falha de push: exit 1.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function sh(cmd) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function log(line) {
  process.stdout.write(`[publish] ${line}\n`);
}

const status = sh("git status --porcelain -- src/data/polls.json").trim();
if (!status) {
  log("polls.json unchanged");
  process.exit(0);
}

sh("git add -- src/data/polls.json");
const author =
  'git -c user.email=radar-ingest@alvobrimobiliaria.com.br -c user.name="radar-ingest"';
try {
  sh(`${author} commit -m "polls: auto-promote from TSE ingest"`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/nothing to commit/.test(msg)) {
    log("nothing to commit");
    process.exit(0);
  }
  throw err;
}
sh("git push origin main");
log("pushed src/data/polls.json to origin/main");
