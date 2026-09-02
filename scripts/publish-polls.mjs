#!/usr/bin/env node
/**
 * Publica polls.json e race-polls.json no GitHub (Vercel puxa main).
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATHS = ["src/data/polls.json", "src/data/race-polls.json"];

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

const dirty = PATHS.filter((path) => sh(`git status --porcelain -- ${path}`).trim());
if (!dirty.length) {
  log("no data changes");
  process.exit(0);
}

sh(`git add -- ${dirty.join(" ")}`);
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
log(`pushed ${dirty.join(" ")} to origin/main`);
