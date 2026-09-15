#!/usr/bin/env node
/**
 * Keep the ingest worktree on origin/main before the pipeline runs.
 * Refuses agent branches so auto-publish never commits to the wrong tip.
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
  process.stdout.write(`[sync-main] ${line}\n`);
}

export function syncIngestMain({ allowDirtyTracked = false } = {}) {
  sh("git fetch origin main");
  const branch = sh("git rev-parse --abbrev-ref HEAD").trim();
  if (branch !== "main") {
    throw new Error(
      `FATAL: ingest worktree must be on main (got ${branch}). ` +
        `Point systemd at a dedicated main checkout, not an agent branch.`,
    );
  }
  const dirty = sh("git status --porcelain --untracked-files=no").trim();
  if (dirty && !allowDirtyTracked) {
    throw new Error(
      `FATAL: tracked dirty files before ingest sync:\n${dirty}\n` +
        `Reset or commit them outside the timer worktree.`,
    );
  }
  sh("git reset --hard origin/main");
  const head = sh("git rev-parse --short HEAD").trim();
  const origin = sh("git rev-parse --short origin/main").trim();
  if (head !== origin) {
    throw new Error(`FATAL: HEAD ${head} still != origin/main ${origin} after reset`);
  }
  log(`ok ${head}`);
  return head;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    syncIngestMain();
  } catch (err) {
    process.stderr.write(`[sync-main] ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  }
}
