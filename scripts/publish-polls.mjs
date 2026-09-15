#!/usr/bin/env node
/**
 * Commit + push polls (and race/chance files) to origin/main.
 * Always publishes from a synced main tip so timer runs do not non-FF.
 * Auth is expected (marceliomp). Failures are loud (exit 1).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATHS = ["src/data/polls.json", "src/data/race-polls.json"];
const HISTORY = "src/data/chance-history.json";

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

function fatal(message) {
  process.stderr.write(`[publish] FATAL: ${message}\n`);
  process.exit(1);
}

export function snapshotPaths(paths, root = ROOT) {
  const saved = new Map();
  for (const path of paths) {
    const abs = join(root, path);
    if (existsSync(abs)) saved.set(path, readFileSync(abs, "utf8"));
  }
  return saved;
}

export function restoreSnapshot(saved, root = ROOT) {
  for (const [path, body] of saved) {
    writeFileSync(join(root, path), body);
  }
}

/** Put in-memory data files on top of origin/main before commit. */
export function restackOnOriginMain(saved, run = sh) {
  const branch = run("git rev-parse --abbrev-ref HEAD").trim();
  if (branch !== "main") {
    throw new Error(`refuses to publish from branch ${branch}; expected main`);
  }
  run("git fetch origin main");
  run("git reset --hard origin/main");
  restoreSnapshot(saved);
  return { restored: saved.size, head: run("git rev-parse --short HEAD").trim() };
}

function commitStaged(staged, run = sh) {
  run(`git add -- ${staged.join(" ")}`);
  const author =
    'git -c user.email=radar-ingest@brasilradar.com.br -c user.name="radar-ingest"';
  try {
    run(`${author} commit -m "polls: auto-promote from TSE ingest"`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/nothing to commit/.test(msg)) return false;
    throw new Error(`commit failed: ${msg}`);
  }
}

function pushMain(run = sh) {
  try {
    run("git push origin main");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git push origin main failed: ${msg}`);
  }
}

export async function publishPolls({ run = sh } = {}) {
  const dirty = PATHS.filter((path) => run(`git status --porcelain -- ${path}`).trim());
  if (!dirty.length) {
    log("no data changes");
    return { pushed: false, reason: "no-data-changes" };
  }

  const { appendPublishedChance } = await import(
    pathToFileURL(join(ROOT, "scripts/chance-history.mjs")).href
  );
  try {
    const point = await appendPublishedChance();
    log(`chance-history ${point.date} Lula ${point.lula} Flávio ${point.flavio}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`chance-history skip: ${msg}`);
  }

  const payloadPaths = [...PATHS, HISTORY];
  const payload = snapshotPaths(payloadPaths);
  if (!payload.size) {
    log("nothing to publish");
    return { pushed: false, reason: "empty-payload" };
  }

  const authorCommit = () => {
    const staged = payloadPaths.filter((path) =>
      run(`git status --porcelain -- ${path}`).trim(),
    );
    if (!staged.length) return false;
    return commitStaged(staged, run);
  };

  try {
    const stacked = restackOnOriginMain(payload, run);
    log(`restacked on origin/main@${stacked.head} files=${stacked.restored}`);
    if (!authorCommit()) {
      log("nothing to commit after restack");
      return { pushed: false, reason: "nothing-to-commit" };
    }
    pushMain(run);
  } catch (first) {
    log(
      `first publish attempt failed; retry once (${first instanceof Error ? first.message : first})`,
    );
    const stacked = restackOnOriginMain(payload, run);
    log(`retry restack origin/main@${stacked.head}`);
    if (!authorCommit()) throw new Error("retry had nothing to commit");
    pushMain(run);
  }

  run("git fetch origin main");
  const head = run("git rev-parse HEAD").trim();
  const origin = run("git rev-parse origin/main").trim();
  if (head !== origin) {
    throw new Error(
      `after push HEAD ${head.slice(0, 7)} != origin/main ${origin.slice(0, 7)}`,
    );
  }
  log(`pushed ${[...payload.keys()].join(" ")} to origin/main`);
  // TODO(A6): post on X and WhatsApp when the file moves. Needs credentials. Do not auto-post without them.
  return { pushed: true, head };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    await publishPolls();
  } catch (err) {
    fatal(err instanceof Error ? err.message : String(err));
  }
}
